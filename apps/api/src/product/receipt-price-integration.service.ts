import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { Price, DiscountType } from '../entities/price.entity';
import { NormalizedProduct } from '../entities/normalized-product.entity';
import { Store } from '../entities/store.entity';
import { ReceiptItem } from '../entities/receipt-item.entity';
import { ReceiptItemNormalization } from '../entities/receipt-item-normalization.entity';
import { Receipt } from '../entities/receipt.entity';
import {
  ProductNormalizationService,
  ParsedPrice,
} from './product-normalization.service';

export interface PriceIntegrationResult {
  success: boolean;
  pricesSynced: number;
  discountsProcessed: number;
  errors: number;
  errorMessages: string[];
}

export interface ReceiptPriceData {
  receiptItemSk: string;
  normalizedProductSk: string;
  linkedProductSk: string;
  rawPrice: string;
  parsedPrice: ParsedPrice;
  merchant: string;
  storeSk?: string;
  receiptDate?: Date;
  isDiscount: boolean;
  isAdjustment: boolean;
}

@Injectable()
export class ReceiptPriceIntegrationService {
  private readonly logger = new Logger(ReceiptPriceIntegrationService.name);

  constructor(
    @InjectRepository(Price)
    private readonly priceRepository: Repository<Price>,
    @InjectRepository(NormalizedProduct)
    private readonly normalizedProductRepository: Repository<NormalizedProduct>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(ReceiptItem)
    private readonly receiptItemRepository: Repository<ReceiptItem>,
    @InjectRepository(ReceiptItemNormalization)
    private readonly receiptItemNormalizationRepository: Repository<ReceiptItemNormalization>,
    private readonly productNormalizationService: ProductNormalizationService,
  ) {}

  /**
   * Sync prices from linked normalized products to Price entities
   */
  async syncReceiptPrices(): Promise<PriceIntegrationResult> {
    this.logger.log('Starting receipt price synchronization...');

    const result: PriceIntegrationResult = {
      success: true,
      pricesSynced: 0,
      discountsProcessed: 0,
      errors: 0,
      errorMessages: [],
    };

    try {
      // Get all linked normalized products that haven't been price-synced yet
      const linkedProducts = await this.getLinkedProductsForPriceSync();

      this.logger.log(
        `Found ${linkedProducts.length} linked products to sync prices for`,
      );

      for (const normalizedProduct of linkedProducts) {
        try {
          const receiptPriceData =
            await this.extractReceiptPriceData(normalizedProduct);

          if (receiptPriceData.length === 0) {
            continue;
          }

          // Process regular prices
          const regularPrices = receiptPriceData.filter(
            (item) => !item.isDiscount && !item.isAdjustment,
          );
          for (const priceData of regularPrices) {
            const synced = await this.syncSinglePrice(priceData);
            if (synced) result.pricesSynced++;
          }

          // Process discounts
          const discounts = receiptPriceData.filter((item) => item.isDiscount);
          for (const discount of discounts) {
            const processed = await this.processDiscount(
              discount,
              regularPrices,
            );
            if (processed) result.discountsProcessed++;
          }
        } catch (error) {
          result.errors++;
          const errorMsg = `Error processing normalized product ${normalizedProduct.normalizedProductSk}: ${(error as Error).message}`;
          result.errorMessages.push(errorMsg);
          this.logger.error(errorMsg, error);
        }
      }

      this.logger.log(
        `Price sync completed. Synced: ${result.pricesSynced}, Discounts: ${result.discountsProcessed}, Errors: ${result.errors}`,
      );
    } catch (error) {
      result.success = false;
      result.errorMessages.push(
        `Fatal error during price sync: ${(error as Error).message}`,
      );
      this.logger.error('Fatal error during price synchronization:', error);
    }

    return result;
  }

  /**
   * Get linked normalized products that need price synchronization
   */
  private async getLinkedProductsForPriceSync(): Promise<NormalizedProduct[]> {
    // Get products that are linked but don't have corresponding price entries yet
    // Only process products with confidence_score >= 0.8 (safety check)
    return this.normalizedProductRepository
      .createQueryBuilder('np')
      .where('np.linkedProductSk IS NOT NULL')
      .andWhere('np.confidenceScore >= :minConfidence', { minConfidence: 0.8 })
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM "Price" p 
          WHERE p.product_sk = np.linked_product_sk 
            AND p.created_at >= np.linked_at
        )`,
      )
      .orderBy('np.linkedAt', 'DESC')
      .getMany();
  }

  /**
   * Extract price data from receipt items linked to a normalized product
   */
  private async extractReceiptPriceData(
    normalizedProduct: NormalizedProduct,
  ): Promise<ReceiptPriceData[]> {
    // Get all receipt items that are normalized to this product
    const receiptItemNormalizations =
      await this.receiptItemNormalizationRepository
        .createQueryBuilder('normalization')
        .leftJoinAndSelect('normalization.receiptItem', 'receiptItem')
        .leftJoinAndSelect('receiptItem.receipt', 'receipt')
        .where('normalization.normalizedProductSk = :productSk', {
          productSk: normalizedProduct.normalizedProductSk,
        })
        .andWhere('normalization.isSelected = :isSelected', {
          isSelected: true,
        })
        .getMany();

    const priceData: ReceiptPriceData[] = [];

    for (const normalization of receiptItemNormalizations) {
      const receiptItem = normalization.receiptItem;
      if (!receiptItem) continue;

      // Parse the price from the receipt item
      const parsedPrice = this.productNormalizationService.parsePrice(
        receiptItem.price.toString(),
        normalizedProduct.merchant,
      );

      // Get merchant from the receipt item
      const merchant = normalizedProduct.merchant;

      priceData.push({
        receiptItemSk: receiptItem.receiptitemSk,
        normalizedProductSk: normalizedProduct.normalizedProductSk,
        linkedProductSk: normalizedProduct.linkedProductSk!,
        rawPrice: receiptItem.price.toString(),
        parsedPrice,
        merchant,
        storeSk: receiptItem.receipt?.storeSk,
        receiptDate: this.parseReceiptDateTime(receiptItem.receipt),
        isDiscount: receiptItem.isDiscountLine || normalizedProduct.isDiscount,
        isAdjustment:
          receiptItem.isAdjustmentLine || normalizedProduct.isAdjustment,
      });
    }

    return priceData;
  }

  /**
   * Sync a single price to the Price entity
   */
  private async syncSinglePrice(priceData: ReceiptPriceData): Promise<boolean> {
    try {
      // Use store from receipt or find/create by merchant name as fallback
      let store: Store;
      if (priceData.storeSk) {
        const existingStore = await this.storeRepository.findOne({
          where: { storeSk: priceData.storeSk },
        });
        if (existingStore) {
          store = existingStore;
        } else {
          this.logger.warn(
            `Store with SK ${priceData.storeSk} not found, falling back to merchant lookup`,
          );
          store = await this.findOrCreateStore(priceData.merchant);
        }
      } else {
        store = await this.findOrCreateStore(priceData.merchant);
      }

      // Check if this exact price already exists to avoid duplicates
      // Use a time range to account for minor timestamp differences
      const recordedAtTime = priceData.receiptDate || new Date();
      const timeBuffer = 60000; // 1 minute buffer for duplicate detection
      const startTime = new Date(recordedAtTime.getTime() - timeBuffer);
      const endTime = new Date(recordedAtTime.getTime() + timeBuffer);

      const existingPrice = await this.priceRepository
        .createQueryBuilder('price')
        .where('price.productSk = :productSk', {
          productSk: priceData.linkedProductSk,
        })
        .andWhere('price.storeSk = :storeSk', { storeSk: store.storeSk })
        .andWhere('price.price = :price', {
          price: priceData.parsedPrice.amount,
        })
        .andWhere('price.recordedAt BETWEEN :startTime AND :endTime', {
          startTime,
          endTime,
        })
        .getOne();

      if (existingPrice) {
        this.logger.debug(
          `Price already exists for product ${priceData.linkedProductSk} at store ${store.name} with recorded_at: ${existingPrice.recordedAt.toISOString()}`,
        );
        return false;
      }

      // Create new price entry
      const price = this.priceRepository.create({
        productSk: priceData.linkedProductSk,
        storeSk: store.storeSk,
        price: priceData.parsedPrice.amount,
        originalPrice: priceData.parsedPrice.amount, // For regular items, original equals current price
        recordedAt: priceData.receiptDate || new Date(),
        currency: 'CAD', // Default currency
        creditScore: 1.0, // OCR receipt-based prices have highest confidence
        verifiedCount: 1,
        flaggedCount: 0,
        isDiscount: false, // Regular prices are not discounts
      });

      await this.priceRepository.save(price);

      this.logger.debug(
        `Synced price $${priceData.parsedPrice.amount} for product ${priceData.linkedProductSk} with recorded_at: ${price.recordedAt.toISOString()}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to sync price for product ${priceData.linkedProductSk}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Process a discount and link it to the original product price
   */
  private async processDiscount(
    discount: ReceiptPriceData,
    regularPrices: ReceiptPriceData[],
  ): Promise<boolean> {
    try {
      // Find the original price this discount applies to
      // This is a simplified implementation - in practice, you might need more sophisticated matching
      const relatedPrice = regularPrices.find(
        (price) => price.linkedProductSk === discount.linkedProductSk,
      );

      if (!relatedPrice) {
        this.logger.warn(
          `No related price found for discount ${discount.receiptItemSk}`,
        );
        return false;
      }

      // Use store from receipt or find/create by merchant name as fallback
      let store: Store;
      if (discount.storeSk) {
        const existingStore = await this.storeRepository.findOne({
          where: { storeSk: discount.storeSk },
        });
        if (existingStore) {
          store = existingStore;
        } else {
          this.logger.warn(
            `Store with SK ${discount.storeSk} not found, falling back to merchant lookup`,
          );
          store = await this.findOrCreateStore(discount.merchant);
        }
      } else {
        store = await this.findOrCreateStore(discount.merchant);
      }

      // Determine discount type
      const discountType = this.determineDiscountType(
        discount.parsedPrice,
        relatedPrice.parsedPrice,
      );

      // Create discount price entry
      const discountPrice = this.priceRepository.create({
        productSk: discount.linkedProductSk,
        storeSk: store.storeSk,
        price: discount.parsedPrice.amount, // Negative discount amount
        recordedAt: discount.receiptDate || new Date(),
        currency: 'CAD',
        creditScore: 1.0, // OCR receipt-based prices have highest confidence
        verifiedCount: 1,
        flaggedCount: 0,
        isDiscount: true,
        discountType,
        originalPrice: relatedPrice.parsedPrice.amount,
        discountReason: `Receipt discount: ${discount.rawPrice}`,
      });

      await this.priceRepository.save(discountPrice);

      this.logger.debug(
        `Processed discount $${discount.parsedPrice.amount} for product ${discount.linkedProductSk} with recorded_at: ${discountPrice.recordedAt.toISOString()}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to process discount ${discount.receiptItemSk}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Find or create a store based on merchant name
   */
  private async findOrCreateStore(merchantName: string): Promise<Store> {
    // Try to find existing store by name (case-insensitive)
    let store = await this.storeRepository.findOne({
      where: { name: merchantName },
    });

    if (!store) {
      // Create new store if it doesn't exist
      store = this.storeRepository.create({
        name: merchantName,
        // Add other default store properties as needed
      });

      store = await this.storeRepository.save(store);
      this.logger.debug(`Created new store: ${merchantName}`);
    }

    return store;
  }

  /**
   * Determine the discount type based on price comparison
   */
  private determineDiscountType(
    discountPrice: ParsedPrice,
    originalPrice: ParsedPrice,
  ): DiscountType {
    const discountAmount = Math.abs(discountPrice.amount);
    const originalAmount = originalPrice.amount;

    // If discount is a round percentage of original price
    const discountRatio = discountAmount / originalAmount;
    const roundPercentages = [0.1, 0.15, 0.2, 0.25, 0.3, 0.5]; // 10%, 15%, 20%, etc.

    const isRoundPercentage = roundPercentages.some(
      (pct) => Math.abs(discountRatio - pct) < 0.01,
    );

    if (isRoundPercentage) {
      return DiscountType.PERCENTAGE;
    }

    // Check if it's a round dollar amount
    if (discountAmount % 1 === 0 && discountAmount <= 10) {
      return DiscountType.FIXED_AMOUNT;
    }

    // Default to coupon for other discount types
    return DiscountType.COUPON;
  }

  /**
   * Get price synchronization statistics
   */
  async getPriceSyncStatistics(): Promise<{
    linkedProductsCount: number;
    syncedPricesCount: number;
    pendingSyncCount: number;
    totalReceiptItemsProcessed: number;
  }> {
    const [linkedProductsCount, syncedPricesCount, totalReceiptItemsProcessed] =
      await Promise.all([
        this.normalizedProductRepository.count({
          where: { linkedProductSk: Not(IsNull()) },
        }),
        this.priceRepository.count({
          where: { creditScore: 1.0 }, // OCR receipt-based prices have highest confidence
        }),
        this.receiptItemNormalizationRepository.count({
          where: { isSelected: true },
        }),
      ]);

    // Calculate pending sync (simplified estimation)
    const pendingSyncCount = Math.max(
      0,
      linkedProductsCount - syncedPricesCount,
    );

    return {
      linkedProductsCount,
      syncedPricesCount,
      pendingSyncCount,
      totalReceiptItemsProcessed,
    };
  }

  /**
   * Sync prices for a specific linked product
   */
  async syncPricesForProduct(
    linkedProductSk: string,
  ): Promise<PriceIntegrationResult> {
    const normalizedProducts = await this.normalizedProductRepository.find({
      where: { linkedProductSk },
    });

    const result: PriceIntegrationResult = {
      success: true,
      pricesSynced: 0,
      discountsProcessed: 0,
      errors: 0,
      errorMessages: [],
    };

    for (const normalizedProduct of normalizedProducts) {
      try {
        const receiptPriceData =
          await this.extractReceiptPriceData(normalizedProduct);

        // Process regular prices
        const regularPrices = receiptPriceData.filter(
          (item) => !item.isDiscount && !item.isAdjustment,
        );
        for (const priceData of regularPrices) {
          const synced = await this.syncSinglePrice(priceData);
          if (synced) result.pricesSynced++;
        }

        // Process discounts
        const discounts = receiptPriceData.filter((item) => item.isDiscount);
        for (const discount of discounts) {
          const processed = await this.processDiscount(discount, regularPrices);
          if (processed) result.discountsProcessed++;
        }
      } catch (error) {
        result.errors++;
        const errorMsg = `Error processing product ${linkedProductSk}: ${(error as Error).message}`;
        result.errorMessages.push(errorMsg);
        this.logger.error(errorMsg, error);
      }
    }

    return result;
  }

  /**
   * Parse receipt date and time into a proper Date object
   * Fixed to properly handle timezone and fallback to receipt creation date
   */
  private parseReceiptDateTime(receipt?: Receipt): Date {
    if (!receipt) {
      return new Date(); // Fallback to current timestamp
    }

    // Priority order: purchaseDate > receiptDate, combined with receiptTime
    let receiptDateTime: Date | undefined;
    const targetDate = receipt.purchaseDate || receipt.receiptDate;

    if (targetDate) {
      try {
        // Parse the date to avoid timezone issues - handle Date objects properly
        const dateStr = targetDate instanceof Date ? 
          targetDate.toISOString().substring(0, 10) : 
          String(targetDate);
        const dateParts = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);

        if (dateParts) {
          const year = parseInt(dateParts[1]);
          const month = parseInt(dateParts[2]) - 1; // JavaScript months are 0-indexed
          const day = parseInt(dateParts[3]);

          let hours = 0;
          let minutes = 0;
          let seconds = 0;

          // Add time if available
          if (receipt.receiptTime) {
            const timeParts = receipt.receiptTime.match(
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
            `Parsed receipt date/time: ${receiptDateTime.toISOString()} from date: ${dateStr}, time: ${receipt.receiptTime}`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to parse receipt date/time: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Improved fallback logic: use receipt creation date before current timestamp
    const fallbackDate = receiptDateTime || receipt.createdAt;

    if (!receiptDateTime && receipt.createdAt) {
      this.logger.debug(
        `Using receipt creation date as fallback: ${receipt.createdAt.toISOString()}`,
      );
    }

    return fallbackDate || new Date();
  }
}
