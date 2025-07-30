import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { Price, DiscountType } from '../entities/price.entity';
import { NormalizedProduct } from '../entities/normalized-product.entity';
import { Store } from '../entities/store.entity';
import { ReceiptItem } from '../entities/receipt-item.entity';
import { ReceiptItemNormalization } from '../entities/receipt-item-normalization.entity';
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
        receiptDate: receiptItem.receipt?.createdAt,
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
      // Find or create store
      const store = await this.findOrCreateStore(priceData.merchant);

      // Check if this exact price already exists to avoid duplicates
      const existingPrice = await this.priceRepository.findOne({
        where: {
          productSk: priceData.linkedProductSk,
          storeSk: store.storeSk,
          price: priceData.parsedPrice.amount,
          recordedAt: priceData.receiptDate || new Date(),
        },
      });

      if (existingPrice) {
        this.logger.debug(
          `Price already exists for product ${priceData.linkedProductSk} at store ${store.name}`,
        );
        return false;
      }

      // Create new price entry
      const price = this.priceRepository.create({
        productSk: priceData.linkedProductSk,
        storeSk: store.storeSk,
        price: priceData.parsedPrice.amount,
        recordedAt: priceData.receiptDate || new Date(),
        currency: 'USD', // Default currency
        creditScore: 1.0, // Receipt-based prices are trustworthy
        verifiedCount: 1,
        flaggedCount: 0,
        isDiscount: false, // Regular prices are not discounts
      });

      await this.priceRepository.save(price);

      this.logger.debug(
        `Synced price $${priceData.parsedPrice.amount} for product ${priceData.linkedProductSk}`,
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

      // Find or create store
      const store = await this.findOrCreateStore(discount.merchant);

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
        currency: 'USD',
        creditScore: 1.0,
        verifiedCount: 1,
        flaggedCount: 0,
        isDiscount: true,
        discountType,
        originalPrice: relatedPrice.parsedPrice.amount,
        discountReason: `Receipt discount: ${discount.rawPrice}`,
      });

      await this.priceRepository.save(discountPrice);

      this.logger.debug(
        `Processed discount $${discount.parsedPrice.amount} for product ${discount.linkedProductSk}`,
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
          where: { creditScore: 1.0 }, // Receipt-based prices have creditScore 1.0
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
}
