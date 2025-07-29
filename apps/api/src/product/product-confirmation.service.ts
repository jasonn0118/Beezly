import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual, Not, IsNull } from 'typeorm';
import { NormalizedProduct } from '../entities/normalized-product.entity';
import {
  UnprocessedProduct,
  UnprocessedProductStatus,
  UnprocessedProductReason,
} from '../entities/unprocessed-product.entity';
import {
  ProductLinkingService,
  ProductLinkingResult,
} from './product-linking.service';
import { ReceiptPriceIntegrationService } from './receipt-price-integration.service';

export interface ConfirmationItem {
  normalizedProductSk: string;
  // User can modify these fields before confirmation
  normalizedName?: string;
  brand?: string;
  isConfirmed: boolean;
}

export interface ConfirmationResult {
  success: boolean;
  processed: number;
  linked: number;
  unprocessed: number;
  errors: number;
  errorMessages: string[];
  linkedProducts: {
    normalizedProductSk: string;
    linkedProductSk: string;
    linkingMethod: string;
    linkingConfidence: number;
  }[];
  unprocessedProducts: {
    normalizedProductSk: string;
    unprocessedProductSk: string;
    reason: UnprocessedProductReason;
  }[];
}

@Injectable()
export class ProductConfirmationService {
  private readonly logger = new Logger(ProductConfirmationService.name);
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.8;

  constructor(
    @InjectRepository(NormalizedProduct)
    private readonly normalizedProductRepository: Repository<NormalizedProduct>,
    @InjectRepository(UnprocessedProduct)
    private readonly unprocessedProductRepository: Repository<UnprocessedProduct>,
    private readonly productLinkingService: ProductLinkingService,
    private readonly receiptPriceIntegrationService: ReceiptPriceIntegrationService,
  ) {}

  /**
   * Confirm user-reviewed normalized products and attempt to link them
   * This is called by the mobile frontend after user review/editing
   */
  async confirmNormalizedProducts(
    items: ConfirmationItem[],
    userId?: string,
  ): Promise<ConfirmationResult> {
    this.logger.log(`Processing confirmation for ${items.length} items`);

    const result: ConfirmationResult = {
      success: true,
      processed: 0,
      linked: 0,
      unprocessed: 0,
      errors: 0,
      errorMessages: [],
      linkedProducts: [],
      unprocessedProducts: [],
    };

    // Get all confirmed items only
    const confirmedItems = items.filter((item) => item.isConfirmed);

    if (confirmedItems.length === 0) {
      this.logger.warn('No confirmed items provided');
      return result;
    }

    // Get normalized products from database
    const normalizedProductSks = confirmedItems.map(
      (item) => item.normalizedProductSk,
    );
    const normalizedProducts = await this.normalizedProductRepository.find({
      where: { normalizedProductSk: In(normalizedProductSks) },
    });

    if (normalizedProducts.length !== confirmedItems.length) {
      throw new NotFoundException(
        `Some normalized products not found. Expected ${confirmedItems.length}, found ${normalizedProducts.length}`,
      );
    }

    // Process each confirmed item
    for (const item of confirmedItems) {
      try {
        result.processed++;

        const normalizedProduct = normalizedProducts.find(
          (np) => np.normalizedProductSk === item.normalizedProductSk,
        );

        if (!normalizedProduct) {
          throw new NotFoundException(
            `Normalized product ${item.normalizedProductSk} not found`,
          );
        }

        // Check confidence threshold
        if (normalizedProduct.confidenceScore < this.MIN_CONFIDENCE_THRESHOLD) {
          const errorMsg = `Product ${item.normalizedProductSk} has confidence ${normalizedProduct.confidenceScore} below minimum threshold ${this.MIN_CONFIDENCE_THRESHOLD}`;
          result.errorMessages.push(errorMsg);
          result.errors++;
          continue;
        }

        // Update normalized product with user edits if provided
        const updatedProduct = await this.updateNormalizedProductWithUserEdits(
          normalizedProduct,
          item,
        );

        // Attempt to link the product
        const linkingResult =
          await this.productLinkingService.linkSingleProduct(updatedProduct, {
            confidenceThreshold: this.MIN_CONFIDENCE_THRESHOLD,
          });

        if (linkingResult.success) {
          // Successfully linked - save the link
          await this.productLinkingService.linkNormalizedProducts({
            confidenceThreshold: this.MIN_CONFIDENCE_THRESHOLD,
            dryRun: false,
          });

          result.linked++;
          result.linkedProducts.push({
            normalizedProductSk: updatedProduct.normalizedProductSk,
            linkedProductSk: linkingResult.linkedProductSk!,
            linkingMethod: linkingResult.linkingMethod,
            linkingConfidence: linkingResult.linkingConfidence,
          });

          this.logger.debug(
            `Successfully linked product ${updatedProduct.normalizedProductSk}`,
          );
        } else {
          // Could not link - add to unprocessed queue
          const unprocessedProduct = await this.createUnprocessedProduct(
            updatedProduct,
            this.determineLinkingFailureReason(linkingResult),
            userId,
          );

          result.unprocessed++;
          result.unprocessedProducts.push({
            normalizedProductSk: updatedProduct.normalizedProductSk,
            unprocessedProductSk: unprocessedProduct.unprocessedProductSk,
            reason: unprocessedProduct.reason,
          });

          this.logger.debug(
            `Product ${updatedProduct.normalizedProductSk} moved to unprocessed queue: ${linkingResult.reason}`,
          );
        }
      } catch (error) {
        result.errors++;
        const errorMsg = `Error processing item ${item.normalizedProductSk}: ${(error as Error).message}`;
        result.errorMessages.push(errorMsg);
        this.logger.error(errorMsg, error);
      }
    }

    // Trigger price synchronization for linked products (async)
    if (result.linked > 0) {
      void this.syncPricesAsync(
        result.linkedProducts.map((lp) => lp.linkedProductSk),
      );
    }

    this.logger.log(
      `Confirmation completed. Processed: ${result.processed}, Linked: ${result.linked}, Unprocessed: ${result.unprocessed}, Errors: ${result.errors}`,
    );

    return result;
  }

  /**
   * Update normalized product with user edits before linking
   */
  private async updateNormalizedProductWithUserEdits(
    normalizedProduct: NormalizedProduct,
    userEdits: ConfirmationItem,
  ): Promise<NormalizedProduct> {
    let needsUpdate = false;
    let userMadeEdits = false;

    // Apply user edits if provided
    if (
      userEdits.normalizedName &&
      userEdits.normalizedName !== normalizedProduct.normalizedName
    ) {
      normalizedProduct.normalizedName = userEdits.normalizedName;
      needsUpdate = true;
      userMadeEdits = true;
    }

    if (userEdits.brand && userEdits.brand !== normalizedProduct.brand) {
      normalizedProduct.brand = userEdits.brand;
      needsUpdate = true;
      userMadeEdits = true;
    }

    // Boost confidence score by 0.1 if user made edits (capped at 1.0)
    if (userMadeEdits) {
      const originalScore = normalizedProduct.confidenceScore;
      const boostedScore = Math.min(originalScore + 0.1, 1.0);
      normalizedProduct.confidenceScore = boostedScore;
      needsUpdate = true;

      this.logger.debug(
        `Boosted confidence score for ${normalizedProduct.normalizedProductSk} from ${originalScore} to ${boostedScore} due to user edits`,
      );
    }

    // Save updates if any
    if (needsUpdate) {
      await this.normalizedProductRepository.save(normalizedProduct);
      this.logger.debug(
        `Updated normalized product ${normalizedProduct.normalizedProductSk} with user edits`,
      );
    }

    return normalizedProduct;
  }

  /**
   * Create an unprocessed product entry for items that couldn't be linked
   */
  private async createUnprocessedProduct(
    normalizedProduct: NormalizedProduct,
    reason: UnprocessedProductReason,
    reviewerId?: string,
  ): Promise<UnprocessedProduct> {
    // Check if already exists to avoid duplicates
    const existing = await this.unprocessedProductRepository.findOne({
      where: { normalizedProductSk: normalizedProduct.normalizedProductSk },
    });

    if (existing) {
      // Update occurrence count and priority
      existing.occurrenceCount += 1;
      existing.priorityScore = this.calculatePriorityScore(
        existing.occurrenceCount,
        normalizedProduct.confidenceScore,
      );
      existing.updatedAt = new Date();
      return this.unprocessedProductRepository.save(existing);
    }

    // Create new unprocessed product entry
    const unprocessedProduct = this.unprocessedProductRepository.create({
      normalizedProductSk: normalizedProduct.normalizedProductSk,
      rawName: normalizedProduct.rawName,
      normalizedName: normalizedProduct.normalizedName,
      brand: normalizedProduct.brand,
      category: normalizedProduct.category,
      merchant: normalizedProduct.merchant,
      confidenceScore: normalizedProduct.confidenceScore,
      status: UnprocessedProductStatus.PENDING_REVIEW,
      reason,
      itemCode: normalizedProduct.itemCode,
      reviewerId,
      occurrenceCount: 1,
      priorityScore: this.calculatePriorityScore(
        1,
        normalizedProduct.confidenceScore,
      ),
    });

    return this.unprocessedProductRepository.save(unprocessedProduct);
  }

  /**
   * Calculate priority score based on occurrence count and confidence
   */
  private calculatePriorityScore(
    occurrenceCount: number,
    confidenceScore: number,
  ): number {
    // Higher priority for items that appear frequently and have high confidence
    const baseScore = occurrenceCount * confidenceScore;
    return Math.round(baseScore * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Determine the reason why linking failed
   */
  private determineLinkingFailureReason(
    linkingResult: ProductLinkingResult,
  ): UnprocessedProductReason {
    if (linkingResult.reason?.includes('barcode')) {
      return UnprocessedProductReason.NO_BARCODE_MATCH;
    }

    if (
      linkingResult.reason?.includes('embedding') ||
      linkingResult.reason?.includes('similarity')
    ) {
      return UnprocessedProductReason.NO_EMBEDDING_MATCH;
    }

    if (
      linkingResult.reason?.includes('threshold') ||
      linkingResult.reason?.includes('low')
    ) {
      return UnprocessedProductReason.LOW_SIMILARITY_SCORE;
    }

    if (linkingResult.reason?.includes('multiple')) {
      return UnprocessedProductReason.MULTIPLE_MATCHES_FOUND;
    }

    // Default to no embedding match for unknown reasons
    return UnprocessedProductReason.NO_EMBEDDING_MATCH;
  }

  /**
   * Trigger price synchronization in the background
   */
  private async syncPricesAsync(linkedProductSks: string[]): Promise<void> {
    try {
      this.logger.debug(
        `Starting async price sync for ${linkedProductSks.length} linked products`,
      );

      const priceSyncResult =
        await this.receiptPriceIntegrationService.syncReceiptPrices();

      this.logger.log(
        `Async price sync completed: ${priceSyncResult.pricesSynced} prices synced, ${priceSyncResult.discountsProcessed} discounts processed`,
      );
    } catch (error) {
      this.logger.error('Error in async price synchronization:', error);
      // Don't throw - this is a background process
    }
  }

  /**
   * Get confirmation candidates for a user (normalized products ready for confirmation)
   */
  async getConfirmationCandidates(
    userId?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{
    items: NormalizedProduct[];
    totalCount: number;
  }> {
    const [items, totalCount] =
      await this.normalizedProductRepository.findAndCount({
        where: {
          confidenceScore: MoreThanOrEqual(this.MIN_CONFIDENCE_THRESHOLD), // Only high confidence items
          linkedProductSk: IsNull(), // Not yet linked
        },
        order: {
          confidenceScore: 'DESC',
          createdAt: 'ASC',
        },
        skip: offset,
        take: limit,
      });

    return { items, totalCount };
  }

  /**
   * Get confirmation statistics
   */
  async getConfirmationStats(): Promise<{
    pendingConfirmation: number;
    totalLinked: number;
    totalUnprocessed: number;
    averageConfidenceScore: number;
  }> {
    const results = await Promise.all([
      this.normalizedProductRepository.count({
        where: {
          confidenceScore: MoreThanOrEqual(this.MIN_CONFIDENCE_THRESHOLD),
          linkedProductSk: IsNull(),
        },
      }),
      this.normalizedProductRepository.count({
        where: { linkedProductSk: Not(IsNull()) }, // Has linked product
      }),
      this.unprocessedProductRepository.count(),
      this.normalizedProductRepository
        .createQueryBuilder('np')
        .select('AVG(np.confidenceScore)', 'avg')
        .where('np.confidenceScore >= :threshold', {
          threshold: this.MIN_CONFIDENCE_THRESHOLD,
        })
        .andWhere('np.linkedProductSk IS NULL')
        .getRawOne(),
    ]);

    const [pendingConfirmation, totalLinked, totalUnprocessed, avgResult] =
      results as [number, number, number, { avg: string } | null];

    return {
      pendingConfirmation,
      totalLinked,
      totalUnprocessed,
      averageConfidenceScore: parseFloat(avgResult?.avg || '0'),
    };
  }
}
