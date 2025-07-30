import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not, IsNull, EntityManager } from 'typeorm';
import { Price, DiscountType } from '../entities/price.entity';
import { NormalizedProduct } from '../entities/normalized-product.entity';
import { Store } from '../entities/store.entity';
import { Product } from '../entities/product.entity';
import { Receipt } from '../entities/receipt.entity';
import { ReceiptItem } from '../entities/receipt-item.entity';
import { ReceiptItemNormalization } from '../entities/receipt-item-normalization.entity';
import { ReceiptPriceIntegrationService } from './receipt-price-integration.service';

interface ReceiptItemRawResult {
  rin_final_price?: string;
  ri_price: string;
  ri_is_discount_line: boolean;
  ri_is_adjustment_line: boolean;
  r_receipt_date?: string;
  r_receipt_time?: string;
  r_created_at?: string;
}

interface ReceiptContextRawResult {
  r_receiptSk: string;
  r_receiptDate?: string;
  r_storeSk?: string;
}

interface AvgConfidenceRawResult {
  avg: string | null;
}

export interface EnhancedLinkingResult {
  success: boolean;
  productLinked: boolean;
  pricesSynced: number;
  storeLinked: boolean;
  errors: string[];
  linkedProductSk?: string;
  storeSk?: string;
  pricesSyncResult?: {
    regularPrices: number;
    discounts: number;
  };
}

export interface ProductLinkingContext {
  receiptSk: string;
  normalizedProductSk: string;
  linkedProductSk: string;
  linkingConfidence: number;
  linkingMethod: string;
  receiptDate?: Date;
  merchant: string;
  storeSk?: string;
}

@Injectable()
export class EnhancedReceiptLinkingService {
  private readonly logger = new Logger(EnhancedReceiptLinkingService.name);

  constructor(
    @InjectRepository(NormalizedProduct)
    private readonly normalizedProductRepository: Repository<NormalizedProduct>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Price)
    private readonly priceRepository: Repository<Price>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,
    @InjectRepository(ReceiptItem)
    private readonly receiptItemRepository: Repository<ReceiptItem>,
    @InjectRepository(ReceiptItemNormalization)
    private readonly receiptItemNormalizationRepository: Repository<ReceiptItemNormalization>,
    private readonly receiptPriceIntegrationService: ReceiptPriceIntegrationService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Enhanced linking that automatically syncs price and store info when a product is successfully linked
   */
  async linkProductWithPriceAndStore(
    context: ProductLinkingContext,
  ): Promise<EnhancedLinkingResult> {
    this.logger.log(
      `Starting enhanced linking for normalized product ${context.normalizedProductSk} -> product ${context.linkedProductSk}`,
    );

    const result: EnhancedLinkingResult = {
      success: false,
      productLinked: false,
      pricesSynced: 0,
      storeLinked: false,
      errors: [],
    };

    // Use database transaction for atomicity
    return this.dataSource.transaction(async (manager) => {
      try {
        // Step 1: Update the normalized product with linking information
        const normalizedProduct = await manager.findOne(NormalizedProduct, {
          where: { normalizedProductSk: context.normalizedProductSk },
        });

        if (!normalizedProduct) {
          result.errors.push('Normalized product not found');
          return result;
        }

        // Update the normalized product with linking info
        normalizedProduct.linkedProductSk = context.linkedProductSk;
        normalizedProduct.linkingConfidence = context.linkingConfidence;
        normalizedProduct.linkingMethod = context.linkingMethod;
        normalizedProduct.linkedAt = new Date();

        await manager.save(normalizedProduct);
        result.productLinked = true;
        result.linkedProductSk = context.linkedProductSk;

        this.logger.debug(
          `Successfully linked normalized product ${context.normalizedProductSk} to product ${context.linkedProductSk}`,
        );

        // Step 2: Ensure store relationship exists
        if (context.storeSk) {
          const storeExists = await manager.findOne(Store, {
            where: { storeSk: context.storeSk },
          });

          if (storeExists) {
            result.storeLinked = true;
            result.storeSk = context.storeSk;
            this.logger.debug(
              `Store relationship confirmed: ${context.storeSk}`,
            );
          } else {
            result.errors.push(`Store not found: ${context.storeSk}`);
          }
        } else {
          // Try to find or create store from merchant name
          const store = await this.findOrCreateStoreFromMerchant(
            context.merchant,
            manager,
          );
          if (store) {
            result.storeLinked = true;
            result.storeSk = store.storeSk;
            this.logger.debug(
              `Store created/found for merchant ${context.merchant}: ${store.storeSk}`,
            );
          }
        }

        // Step 3: Sync prices for this specific product linking
        if (result.productLinked) {
          try {
            const priceData = await this.extractPriceDataForProduct(
              normalizedProduct,
              context,
              manager,
            );

            const priceSyncResult = await this.syncPricesForLinkedProduct(
              priceData,
              context.linkedProductSk,
              result.storeSk,
              manager,
            );

            result.pricesSynced = priceSyncResult.total;
            result.pricesSyncResult = {
              regularPrices: priceSyncResult.regular,
              discounts: priceSyncResult.discounts,
            };

            this.logger.debug(
              `Synced ${result.pricesSynced} prices for product ${context.linkedProductSk}`,
            );
          } catch (priceError) {
            result.errors.push(
              `Price sync failed: ${(priceError as Error).message}`,
            );
            this.logger.error('Price sync error:', priceError);
          }
        }

        // Step 4: Update receipt items to link to the actual product
        try {
          await this.updateReceiptItemsWithProductLink(
            context.normalizedProductSk,
            context.linkedProductSk,
            manager,
          );
          this.logger.debug(
            `Updated receipt items with product link: ${context.linkedProductSk}`,
          );
        } catch (updateError) {
          result.errors.push(
            `Receipt item update failed: ${(updateError as Error).message}`,
          );
          this.logger.error('Receipt item update error:', updateError);
        }

        result.success = result.errors.length === 0;

        this.logger.log(
          `Enhanced linking completed. Success: ${result.success}, Product linked: ${result.productLinked}, Prices synced: ${result.pricesSynced}, Store linked: ${result.storeLinked}`,
        );

        return result;
      } catch (error) {
        result.errors.push(`Transaction failed: ${(error as Error).message}`);
        this.logger.error('Enhanced linking transaction failed:', error);
        throw error; // This will cause the transaction to rollback
      }
    });
  }

  /**
   * Process multiple product linkings in batch
   */
  async batchLinkProductsWithPriceAndStore(
    contexts: ProductLinkingContext[],
  ): Promise<EnhancedLinkingResult[]> {
    this.logger.log(
      `Starting batch enhanced linking for ${contexts.length} products`,
    );

    const results: EnhancedLinkingResult[] = [];

    // Process in batches of 10 to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < contexts.length; i += batchSize) {
      const batch = contexts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((context) => this.linkProductWithPriceAndStore(context)),
      );
      results.push(...batchResults);

      this.logger.debug(
        `Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(contexts.length / batchSize)}`,
      );
    }

    const successful = results.filter((r) => r.success).length;
    const totalPricesSynced = results.reduce(
      (sum, r) => sum + r.pricesSynced,
      0,
    );

    this.logger.log(
      `Batch linking completed. ${successful}/${contexts.length} successful, ${totalPricesSynced} total prices synced`,
    );

    return results;
  }

  /**
   * Trigger enhanced linking for all pending normalized products
   */
  async processAllPendingLinks(): Promise<{
    processed: number;
    successful: number;
    totalPricesSynced: number;
    errors: string[];
  }> {
    this.logger.log('Processing all pending product links...');

    // Find normalized products that are linked but haven't been processed yet
    const pendingProducts = await this.normalizedProductRepository
      .createQueryBuilder('np')
      .leftJoin('np.receiptItemNormalizations', 'rin')
      .leftJoin('rin.receiptItem', 'ri')
      .leftJoin('ri.receipt', 'r')
      .where('np.linkedProductSk IS NOT NULL')
      .andWhere('np.confidenceScore >= :minConfidence', { minConfidence: 0.8 })
      .andWhere('rin.isSelected = :isSelected', { isSelected: true })
      .select([
        'np.normalizedProductSk',
        'np.linkedProductSk',
        'np.linkingConfidence',
        'np.linkingMethod',
        'np.merchant',
        'r.receiptSk',
        'r.storeSk',
        'r.receiptDate',
      ])
      .getMany();

    this.logger.log(
      `Found ${pendingProducts.length} pending products to process`,
    );

    const contexts: ProductLinkingContext[] = pendingProducts.map((np) => ({
      receiptSk: '', // Will be populated from receipt items
      normalizedProductSk: np.normalizedProductSk,
      linkedProductSk: np.linkedProductSk!,
      linkingConfidence: np.linkingConfidence || 0.8,
      linkingMethod: np.linkingMethod || 'embedding_similarity',
      receiptDate: undefined, // Will be populated from receipt
      merchant: np.merchant,
      storeSk: undefined, // Will be populated from receipt
    }));

    // Fill in receipt context for each product
    for (const context of contexts) {
      const receiptInfo = await this.getReceiptContextForNormalizedProduct(
        context.normalizedProductSk,
      );
      if (receiptInfo) {
        context.receiptSk = receiptInfo.receiptSk;
        context.receiptDate = receiptInfo.receiptDate;
        context.storeSk = receiptInfo.storeSk;
      }
    }

    const results = await this.batchLinkProductsWithPriceAndStore(contexts);
    const successful = results.filter((r) => r.success).length;
    const totalPricesSynced = results.reduce(
      (sum, r) => sum + r.pricesSynced,
      0,
    );
    const allErrors = results.flatMap((r) => r.errors);

    return {
      processed: results.length,
      successful,
      totalPricesSynced,
      errors: allErrors,
    };
  }

  // Private helper methods

  private async findOrCreateStoreFromMerchant(
    merchantName: string,
    manager: EntityManager,
  ): Promise<Store | null> {
    try {
      // Try to find existing store by name (case-insensitive)
      let store = await manager.findOne(Store, {
        where: { name: merchantName },
      });

      if (!store) {
        // Create new store if it doesn't exist
        store = manager.create(Store, {
          name: merchantName,
          // Add other default store properties as needed
        });

        store = await manager.save(store);
        this.logger.debug(`Created new store: ${merchantName}`);
      }

      return store;
    } catch (error) {
      this.logger.error(
        `Failed to find/create store for merchant ${merchantName}:`,
        error,
      );
      return null;
    }
  }

  private async extractPriceDataForProduct(
    normalizedProduct: NormalizedProduct,
    context: ProductLinkingContext,
    manager: EntityManager,
  ): Promise<{
    regular: Array<{
      price: number;
      originalPrice?: number;
      receiptDate?: Date;
      currency?: string;
    }>;
    discounts: Array<{
      price: number;
      originalPrice?: number;
      discountType?: DiscountType;
      receiptDate?: Date;
    }>;
  }> {
    // Get all receipt items that are normalized to this product
    const receiptItemNormalizations: ReceiptItemRawResult[] = await manager
      .createQueryBuilder()
      .select([
        'rin.final_price as rin_final_price',
        'ri.price as ri_price',
        'ri.is_discount_line as ri_is_discount_line',
        'ri.is_adjustment_line as ri_is_adjustment_line',
        'r.receipt_date as r_receipt_date',
        'r.receipt_time as r_receipt_time',
        'r.created_at as r_created_at',
      ])
      .from('receipt_item_normalizations', 'rin')
      .leftJoin(
        'receipt_items',
        'ri',
        'ri.receiptitem_sk = rin.receipt_item_sk',
      )
      .leftJoin('receipts', 'r', 'r.receipt_sk = ri.receipt_sk')
      .where('rin.normalized_product_sk = :productSk', {
        productSk: normalizedProduct.normalizedProductSk,
      })
      .andWhere('rin.is_selected = :isSelected', { isSelected: true })
      .getRawMany();

    const regular: Array<{
      price: number;
      receiptDate?: Date;
      currency?: string;
    }> = [];
    const discounts: Array<{
      price: number;
      originalPrice?: number;
      discountType?: DiscountType;
      receiptDate?: Date;
    }> = [];

    for (const item of receiptItemNormalizations) {
      // Use final_price if available (includes discounts/fees), otherwise fallback to original price
      const originalPrice = parseFloat(item.ri_price) || 0;
      const finalPrice = item.rin_final_price
        ? parseFloat(item.rin_final_price)
        : originalPrice;
      const receiptDate = this.parseReceiptDateTime(
        item.r_receipt_date,
        item.r_receipt_time,
        item.r_created_at,
      );

      if (item.ri_is_discount_line || normalizedProduct.isDiscount) {
        // For discount lines, use the discount amount
        discounts.push({
          price: Math.abs(originalPrice), // Ensure positive for discount amount
          originalPrice: finalPrice > originalPrice ? finalPrice : undefined, // Original price if final price is higher
          receiptDate,
          discountType: this.determineDiscountType(originalPrice),
        });
      } else if (
        !item.ri_is_adjustment_line &&
        !normalizedProduct.isAdjustment
      ) {
        // For regular products, use final_price (which may include applied discounts/fees)
        regular.push({
          price: finalPrice, // Use final price that includes any discounts or fees
          receiptDate,
          currency: 'CAD', // Default currency
        });

        // If there's a difference between original and final price, record the discount/fee
        if (Math.abs(finalPrice - originalPrice) > 0.01) {
          // Use 0.01 to handle floating point precision
          const priceDifference = originalPrice - finalPrice;
          if (priceDifference > 0) {
            // Original price was higher, this is a discount
            discounts.push({
              price: priceDifference,
              originalPrice: originalPrice,
              receiptDate,
              discountType: this.determineDiscountType(priceDifference),
            });
          } else {
            // Final price was higher, this might be a fee or tax (record as negative discount)
            discounts.push({
              price: Math.abs(priceDifference),
              originalPrice: originalPrice,
              receiptDate,
              discountType: DiscountType.ADJUSTMENT,
            });
          }
        }
      }
    }

    return { regular, discounts };
  }

  private async syncPricesForLinkedProduct(
    priceData: {
      regular: Array<{
        price: number;
        originalPrice?: number;
        receiptDate?: Date;
        currency?: string;
      }>;
      discounts: Array<{
        price: number;
        originalPrice?: number;
        discountType?: DiscountType;
        receiptDate?: Date;
      }>;
    },
    linkedProductSk: string,
    storeSk: string | undefined,
    manager: EntityManager,
  ): Promise<{ total: number; regular: number; discounts: number }> {
    let regularCount = 0;
    let discountCount = 0;

    if (!storeSk) {
      this.logger.warn('No store SK provided for price sync');
      return { total: 0, regular: 0, discounts: 0 };
    }

    // Sync regular prices
    for (const priceItem of priceData.regular) {
      try {
        // Check if this exact price already exists to avoid duplicates
        const existingPrice = await manager.findOne(Price, {
          where: {
            productSk: linkedProductSk,
            storeSk,
            price: priceItem.price,
            recordedAt: priceItem.receiptDate || new Date(),
          },
        });

        if (!existingPrice) {
          const price = manager.create(Price, {
            productSk: linkedProductSk,
            storeSk,
            price: priceItem.price,
            recordedAt: priceItem.receiptDate || new Date(),
            currency: priceItem.currency || 'CAD',
            creditScore: 1.0, // OCR receipt-based prices have highest confidence
            verifiedCount: 1,
            flaggedCount: 0,
            isDiscount: false,
          });

          await manager.save(price);
          regularCount++;
        }
      } catch (error) {
        this.logger.error('Failed to sync regular price:', error);
      }
    }

    // Sync discount prices
    for (const discount of priceData.discounts) {
      try {
        const discountPrice = manager.create(Price, {
          productSk: linkedProductSk,
          storeSk,
          price: -discount.price, // Negative for discount
          recordedAt: discount.receiptDate || new Date(),
          currency: 'CAD',
          creditScore: 1.0, // OCR receipt-based prices have highest confidence
          verifiedCount: 1,
          flaggedCount: 0,
          isDiscount: true,
          discountType: discount.discountType || DiscountType.COUPON,
          originalPrice: discount.originalPrice,
          discountReason: 'Receipt discount',
        });

        await manager.save(discountPrice);
        discountCount++;
      } catch (error) {
        this.logger.error('Failed to sync discount:', error);
      }
    }

    return {
      total: regularCount + discountCount,
      regular: regularCount,
      discounts: discountCount,
    };
  }

  private async updateReceiptItemsWithProductLink(
    normalizedProductSk: string,
    linkedProductSk: string,
    manager: EntityManager,
  ): Promise<void> {
    // Update receipt items that are linked to this normalized product
    await manager
      .createQueryBuilder()
      .update('receipt_items')
      .set({ product_sk: linkedProductSk })
      .where(
        `receiptitem_sk IN (
          SELECT rin.receipt_item_sk 
          FROM receipt_item_normalizations rin 
          WHERE rin.normalized_product_sk = :normalizedProductSk 
            AND rin.is_selected = true
        )`,
      )
      .setParameter('normalizedProductSk', normalizedProductSk)
      .execute();
  }

  private async getReceiptContextForNormalizedProduct(
    normalizedProductSk: string,
  ): Promise<{
    receiptSk: string;
    receiptDate?: Date;
    storeSk?: string;
  } | null> {
    const result = (await this.receiptItemNormalizationRepository
      .createQueryBuilder('rin')
      .leftJoin('rin.receiptItem', 'ri')
      .leftJoin('ri.receipt', 'r')
      .select(['r.receiptSk', 'r.receiptDate', 'r.storeSk'])
      .where('rin.normalizedProductSk = :productSk', {
        productSk: normalizedProductSk,
      })
      .andWhere('rin.isSelected = :isSelected', { isSelected: true })
      .limit(1)
      .getRawOne()) as ReceiptContextRawResult | null;

    if (!result) return null;

    return {
      receiptSk: result.r_receiptSk,
      receiptDate: result.r_receiptDate
        ? new Date(result.r_receiptDate)
        : undefined,
      storeSk: result.r_storeSk,
    };
  }

  private determineDiscountType(discountAmount: number): DiscountType {
    const absAmount = Math.abs(discountAmount);

    // Check if it's a round dollar amount
    if (absAmount % 1 === 0 && absAmount <= 10) {
      return DiscountType.FIXED_AMOUNT;
    }

    // Check for common percentage patterns (would need original price for accurate detection)
    // For now, default to coupon
    return DiscountType.COUPON;
  }

  /**
   * Parse receipt date and time into a proper Date object
   * Fixed to properly handle timezone and fallback to receipt creation date
   */
  private parseReceiptDateTime(
    receiptDate?: string,
    receiptTime?: string,
    createdAt?: string,
  ): Date {
    // If we have a receipt_date field, parse it and combine with time if available
    let receiptDateTime: Date | undefined;
    if (receiptDate) {
      try {
        // Parse the date to avoid timezone issues
        const dateParts = receiptDate.match(/(\d{4})-(\d{2})-(\d{2})/);

        if (dateParts) {
          const year = parseInt(dateParts[1]);
          const month = parseInt(dateParts[2]) - 1; // JavaScript months are 0-indexed
          const day = parseInt(dateParts[3]);

          let hours = 0;
          let minutes = 0;
          let seconds = 0;

          // Add time if available
          if (receiptTime) {
            const timeParts = receiptTime.match(
              /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i,
            );
            if (timeParts) {
              hours = parseInt(timeParts[1]);
              minutes = parseInt(timeParts[2]);
              seconds = timeParts[3] ? parseInt(timeParts[3]) : 0;
              const ampm = timeParts[4]?.toUpperCase();

              // Handle AM/PM conversion
              if (ampm === 'PM' && hours !== 12) hours += 12;
              if (ampm === 'AM' && hours === 12) hours = 0;
            }
          }

          // Create date in local timezone (not UTC) to match receipt's actual time
          receiptDateTime = new Date(year, month, day, hours, minutes, seconds);

          this.logger.debug(
            `Parsed receipt date/time: ${receiptDateTime.toISOString()} from date: ${receiptDate}, time: ${receiptTime}`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to parse receipt date/time: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Improved fallback logic: use receipt creation date before current timestamp
    const fallbackDate =
      receiptDateTime || (createdAt ? new Date(createdAt) : null);

    if (!receiptDateTime && createdAt) {
      this.logger.debug(
        `Using receipt creation date as fallback: ${createdAt}`,
      );
    }

    return fallbackDate || new Date();
  }

  /**
   * Get statistics about the enhanced linking process
   */
  async getLinkingStatistics(): Promise<{
    totalLinkedProducts: number;
    productsWithPrices: number;
    productsWithStores: number;
    totalPricesSynced: number;
    averageLinkingConfidence: number;
  }> {
    const [
      totalLinked,
      productsWithPrices,
      productsWithStores,
      totalPrices,
      avgConfidence,
    ] = (await Promise.all([
      this.normalizedProductRepository.count({
        where: { linkedProductSk: Not(IsNull()) },
      }),
      this.normalizedProductRepository
        .createQueryBuilder('np')
        .where('np.linkedProductSk IS NOT NULL')
        .andWhere(
          `EXISTS (
            SELECT 1 FROM "Price" p 
            WHERE p.product_sk = np.linked_product_sk
          )`,
        )
        .getCount(),
      this.normalizedProductRepository
        .createQueryBuilder('np')
        .leftJoin('np.receiptItemNormalizations', 'rin')
        .leftJoin('rin.receiptItem', 'ri')
        .leftJoin('ri.receipt', 'r')
        .where('np.linkedProductSk IS NOT NULL')
        .andWhere('r.storeSk IS NOT NULL')
        .getCount(),
      this.priceRepository.count({ where: { creditScore: 1.0 } }), // Count OCR-based prices
      this.normalizedProductRepository
        .createQueryBuilder('np')
        .select('AVG(np.linkingConfidence)', 'avg')
        .where('np.linkedProductSk IS NOT NULL')
        .andWhere('np.linkingConfidence IS NOT NULL')
        .getRawOne(),
    ])) as [number, number, number, number, AvgConfidenceRawResult | undefined];

    return {
      totalLinkedProducts: totalLinked,
      productsWithPrices,
      productsWithStores,
      totalPricesSynced: totalPrices,
      averageLinkingConfidence: parseFloat(avgConfidence?.avg || '0'),
    };
  }
}
