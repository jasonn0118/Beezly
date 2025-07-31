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
import { ProductSelectionService } from './product-selection.service';

import {
  ReceiptItemConfirmationDto,
  UserProductChoiceDto,
  ReceiptSelectionsResponseDto,
} from './dto/receipt-confirmation.dto';

export type ConfirmationItem = ReceiptItemConfirmationDto;

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
  pendingSelectionProducts: {
    normalizedProduct: {
      normalizedProductSk: string;
      rawName: string;
      normalizedName: string;
      brand?: string;
      category?: string;
      merchant: string;
      confidenceScore: number;
      createdAt: Date;
    };
    matchCount: number;
    topMatches: {
      productSk: string;
      name: string;
      brandName?: string;
      barcode?: string;
      score: number;
      method: string;
      imageUrl?: string;
      description?: string;
    }[];
  }[];
  receiptSummary: {
    totalReceiptItems: number;
    confirmedItems: number;
    unconfirmedItems: number;
    successfullyLinked: number;
    requiresUserSelection: number;
    movedToUnprocessed: number;
  };
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
    private readonly productSelectionService: ProductSelectionService,
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
      pendingSelectionProducts: [],
      receiptSummary: {
        totalReceiptItems: items.length,
        confirmedItems: items.filter((item) => item.isConfirmed).length,
        unconfirmedItems: items.filter((item) => !item.isConfirmed).length,
        successfullyLinked: 0,
        requiresUserSelection: 0,
        movedToUnprocessed: 0,
      },
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

        // Skip products below confidence threshold without treating as errors
        if (normalizedProduct.confidenceScore < this.MIN_CONFIDENCE_THRESHOLD) {
          this.logger.debug(
            `Skipping product ${item.normalizedProductSk} with confidence ${normalizedProduct.confidenceScore} below threshold ${this.MIN_CONFIDENCE_THRESHOLD}`,
          );
          result.processed--; // Don't count as processed since we're skipping
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

    // Fetch pending selection products for current receipt items
    await this.fetchPendingSelectionProductsForSession(result, items);

    // Update receipt summary with final counts
    result.receiptSummary.successfullyLinked = result.linked;
    result.receiptSummary.requiresUserSelection =
      result.pendingSelectionProducts.length;
    result.receiptSummary.movedToUnprocessed = result.unprocessed;

    // Trigger price synchronization for linked products (async)
    if (result.linked > 0) {
      void this.syncPricesAsync(
        result.linkedProducts.map((lp) => lp.linkedProductSk),
      );
    }

    this.logger.log(
      `Confirmation completed. Processed: ${result.processed}, Linked: ${result.linked}, Unprocessed: ${result.unprocessed}, Errors: ${result.errors}. Pending selection: ${result.pendingSelectionProducts.length}`,
    );

    return result;
  }

  /**
   * Validate and fix confidence score if invalid
   */
  private validateConfidenceScore(score: number, productSk: string): number {
    if (
      isNaN(score) ||
      score === null ||
      score === undefined ||
      score < 0 ||
      score > 1
    ) {
      this.logger.warn(
        `Invalid confidence score ${score} for product ${productSk}, setting to default 0.5`,
      );
      return 0.5;
    }
    return score;
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

    // CRITICAL: Validate confidence score before any operations
    // This handles cases where the database already contains NaN values
    this.logger.debug(
      `Initial confidence score for ${normalizedProduct.normalizedProductSk}: ${normalizedProduct.confidenceScore} (type: ${typeof normalizedProduct.confidenceScore})`,
    );

    const validatedScore = this.validateConfidenceScore(
      normalizedProduct.confidenceScore,
      normalizedProduct.normalizedProductSk,
    );
    if (validatedScore !== normalizedProduct.confidenceScore) {
      this.logger.warn(
        `Fixing invalid confidence score in database: ${normalizedProduct.confidenceScore} -> ${validatedScore} for product ${normalizedProduct.normalizedProductSk}`,
      );
      normalizedProduct.confidenceScore = validatedScore;
      needsUpdate = true;
    }

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

      this.logger.debug(
        `Boosting confidence score for ${normalizedProduct.normalizedProductSk}: original=${originalScore} (type: ${typeof originalScore})`,
      );

      // Validate that originalScore is a valid number
      if (
        isNaN(originalScore) ||
        originalScore === null ||
        originalScore === undefined
      ) {
        this.logger.warn(
          `Invalid confidence score ${originalScore} for product ${normalizedProduct.normalizedProductSk}, setting to default 0.5`,
        );
        normalizedProduct.confidenceScore = 0.5;
      } else {
        const boostedScore = Math.min(originalScore + 0.1, 1.0);
        normalizedProduct.confidenceScore = boostedScore;
        this.logger.debug(
          `Calculated boosted score: ${boostedScore} (type: ${typeof boostedScore})`,
        );
      }
      needsUpdate = true;

      this.logger.debug(
        `Updated confidence score for ${normalizedProduct.normalizedProductSk} from ${originalScore} to ${normalizedProduct.confidenceScore} due to user edits`,
      );
    }

    // Save updates if any
    if (needsUpdate) {
      // FINAL VALIDATION: Ensure confidence score is valid before save
      const finalValidatedScore = this.validateConfidenceScore(
        normalizedProduct.confidenceScore,
        normalizedProduct.normalizedProductSk,
      );
      normalizedProduct.confidenceScore = finalValidatedScore;

      this.logger.debug(
        `Saving normalized product ${normalizedProduct.normalizedProductSk} with confidence score: ${normalizedProduct.confidenceScore}`,
      );

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
      // Validate confidence score before using it
      const validatedConfidenceScore = this.validateConfidenceScore(
        normalizedProduct.confidenceScore,
        normalizedProduct.normalizedProductSk,
      );
      existing.priorityScore = this.calculatePriorityScore(
        existing.occurrenceCount,
        validatedConfidenceScore,
      );
      existing.updatedAt = new Date();
      return this.unprocessedProductRepository.save(existing);
    }

    // Validate confidence score before creating unprocessed product
    const validatedConfidenceScore = this.validateConfidenceScore(
      normalizedProduct.confidenceScore,
      normalizedProduct.normalizedProductSk,
    );

    // Create new unprocessed product entry
    const unprocessedProduct = this.unprocessedProductRepository.create({
      normalizedProductSk: normalizedProduct.normalizedProductSk,
      rawName: normalizedProduct.rawName,
      normalizedName: normalizedProduct.normalizedName,
      brand: normalizedProduct.brand,
      category: normalizedProduct.category,
      merchant: normalizedProduct.merchant,
      confidenceScore: validatedConfidenceScore,
      status: UnprocessedProductStatus.PENDING_REVIEW,
      reason,
      itemCode: normalizedProduct.itemCode,
      reviewerId,
      occurrenceCount: 1,
      priorityScore: this.calculatePriorityScore(1, validatedConfidenceScore),
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

  /**
   * Get pending selections for a specific receipt by receipt ID
   * Automatically finds all normalized products from the receipt that need user selection
   */
  async getReceiptPendingSelectionsByReceiptId(receiptId: string): Promise<{
    pendingSelections: any[];
    receiptId: string;
    totalCount: number;
  }> {
    try {
      this.logger.debug(
        `Getting pending selections for receipt ID: ${receiptId}`,
      );

      // Find all normalized products from this specific receipt that are unlinked and high confidence
      // Using the relationship: NormalizedProduct -> ReceiptItemNormalization -> ReceiptItem -> Receipt
      const normalizedProducts = await this.normalizedProductRepository
        .createQueryBuilder('np')
        .innerJoin('np.receiptItemNormalizations', 'rin')
        .innerJoin('rin.receiptItem', 'ri')
        .where('np.linkedProductSk IS NULL') // Not yet linked
        .andWhere('np.confidenceScore >= :threshold', {
          threshold: this.MIN_CONFIDENCE_THRESHOLD,
        })
        .andWhere('ri.receiptSk = :receiptId', { receiptId }) // Filter by receipt ID
        .andWhere('rin.isSelected = true') // Only selected normalizations
        .orderBy('np.createdAt', 'DESC')
        .getMany();

      this.logger.debug(
        `Found ${normalizedProducts.length} unlinked products from receipt ${receiptId}`,
      );

      const pendingSelections: any[] = [];

      // Check each product for multiple matches using the enhanced brand filtering
      for (const normalizedProduct of normalizedProducts) {
        try {
          const selectionResponse =
            await this.productSelectionService.getProductSelectionOptions({
              normalizedProductSk: normalizedProduct.normalizedProductSk,
              query: normalizedProduct.normalizedName,
              brand: normalizedProduct.brand,
              minSimilarityThreshold: 0.5,
              maxOptions: 5,
            });

          // If user selection is required, add to pending selections
          if (selectionResponse.requiresUserSelection) {
            pendingSelections.push({
              normalizedProduct: {
                normalizedProductSk: normalizedProduct.normalizedProductSk,
                rawName: normalizedProduct.rawName,
                normalizedName: normalizedProduct.normalizedName,
                brand: normalizedProduct.brand,
                category: normalizedProduct.category,
                merchant: normalizedProduct.merchant,
                confidenceScore: normalizedProduct.confidenceScore,
                createdAt: normalizedProduct.createdAt,
              },
              matchCount: selectionResponse.totalMatches,
              topMatches: selectionResponse.matchingOptions.map((option) => ({
                productSk: option.productSk,
                name: option.name,
                brandName: option.brandName,
                barcode: option.barcode,
                score: option.score,
                method: option.method,
                imageUrl: option.imageUrl,
                description: option.description,
              })),
            });
          }
        } catch (error) {
          this.logger.warn(
            `Error checking selection options for ${normalizedProduct.normalizedProductSk}:`,
            error,
          );
          // Continue processing other products
        }
      }

      this.logger.log(
        `Found ${pendingSelections.length} products requiring user selection for receipt ${receiptId}`,
      );

      return {
        pendingSelections,
        receiptId,
        totalCount: pendingSelections.length,
      };
    } catch (error) {
      this.logger.error(
        `Error getting pending selections for receipt ${receiptId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get pending selections for a specific receipt (legacy method)
   * @deprecated Use getReceiptPendingSelectionsByReceiptId instead
   */
  async getReceiptPendingSelections(
    normalizedProductSks: string[],
    receiptId?: string,
  ): Promise<{
    pendingSelections: any[];
    receiptId?: string;
    totalCount: number;
  }> {
    try {
      const pendingSelections: any[] = [];

      // Get normalized products for the provided SKs
      const normalizedProducts = await this.normalizedProductRepository.find({
        where: {
          normalizedProductSk: In(normalizedProductSks),
          confidenceScore: MoreThanOrEqual(this.MIN_CONFIDENCE_THRESHOLD),
          linkedProductSk: IsNull(), // Not yet linked
        },
      });

      this.logger.debug(
        `Found ${normalizedProducts.length} receipt products eligible for selection checking`,
      );

      // Check each product for multiple matches
      for (const normalizedProduct of normalizedProducts) {
        try {
          const selectionResponse =
            await this.productSelectionService.getProductSelectionOptions({
              normalizedProductSk: normalizedProduct.normalizedProductSk,
              query: normalizedProduct.normalizedName,
              brand: normalizedProduct.brand,
              minSimilarityThreshold: 0.5,
              maxOptions: 5,
            });

          // If user selection is required, add to pending selections
          if (selectionResponse.requiresUserSelection) {
            pendingSelections.push({
              normalizedProduct: {
                normalizedProductSk: normalizedProduct.normalizedProductSk,
                rawName: normalizedProduct.rawName,
                normalizedName: normalizedProduct.normalizedName,
                brand: normalizedProduct.brand,
                category: normalizedProduct.category,
                merchant: normalizedProduct.merchant,
                confidenceScore: normalizedProduct.confidenceScore,
                createdAt: normalizedProduct.createdAt,
              },
              matchCount: selectionResponse.totalMatches,
              topMatches: selectionResponse.matchingOptions.map((option) => ({
                productSk: option.productSk,
                name: option.name,
                brandName: option.brandName,
                barcode: option.barcode,
                score: option.score,
                method: option.method,
                imageUrl: option.imageUrl,
                description: option.description,
              })),
            });
          }
        } catch (error) {
          this.logger.warn(
            `Error checking selection options for ${normalizedProduct.normalizedProductSk}:`,
            error,
          );
          // Continue processing other products
        }
      }

      return {
        pendingSelections,
        receiptId,
        totalCount: pendingSelections.length,
      };
    } catch (error) {
      this.logger.error('Error getting receipt pending selections:', error);
      throw error;
    }
  }

  /**
   * Process user product selections - either link to chosen product or move to unprocessed
   */
  async processReceiptSelections(
    selections: UserProductChoiceDto[],
    userId?: string,
    receiptId?: string,
  ): Promise<ReceiptSelectionsResponseDto> {
    this.logger.log(`Processing ${selections.length} user product selections`);

    const result: ReceiptSelectionsResponseDto = {
      success: true,
      processedCount: 0,
      linkedCount: 0,
      unprocessedCount: 0,
      errorCount: 0,
      errorMessages: [],
      processedSelections: [],
      receiptId,
    };

    if (selections.length === 0) {
      this.logger.warn('No selections provided');
      return result;
    }

    // Get all normalized products for the selections
    const normalizedProductSks = selections.map((s) => s.normalizedProductSk);
    const normalizedProducts = await this.normalizedProductRepository.find({
      where: {
        normalizedProductSk: In(normalizedProductSks),
        linkedProductSk: IsNull(), // Only process unlinked products
      },
    });

    if (normalizedProducts.length !== selections.length) {
      const foundSks = normalizedProducts.map((p) => p.normalizedProductSk);
      const missingSks = normalizedProductSks.filter(
        (sk) => !foundSks.includes(sk),
      );
      result.errorMessages.push(
        `Some normalized products not found or already linked: ${missingSks.join(', ')}`,
      );
    }

    // Process each selection
    for (const selection of selections) {
      try {
        result.processedCount++;

        const normalizedProduct = normalizedProducts.find(
          (p) => p.normalizedProductSk === selection.normalizedProductSk,
        );

        if (!normalizedProduct) {
          result.errorCount++;
          result.processedSelections.push({
            normalizedProductSk: selection.normalizedProductSk,
            status: 'error',
            message: 'Normalized product not found or already linked',
          });
          continue;
        }

        if (selection.selectedProductSk) {
          // User selected a product - create the link
          await this.linkNormalizedProductToSelected(
            normalizedProduct,
            selection.selectedProductSk,
          );

          result.linkedCount++;
          result.processedSelections.push({
            normalizedProductSk: selection.normalizedProductSk,
            linkedProductSk: selection.selectedProductSk,
            status: 'linked',
            message:
              selection.selectionReason ||
              'Successfully linked to selected product',
          });

          this.logger.debug(
            `Linked ${selection.normalizedProductSk} to ${selection.selectedProductSk}`,
          );
        } else {
          // User provided empty selection - move to unprocessed
          const unprocessedProduct = await this.createUnprocessedProduct(
            normalizedProduct,
            UnprocessedProductReason.NO_SUITABLE_MATCH_FOUND,
            userId,
          );

          result.unprocessedCount++;
          result.processedSelections.push({
            normalizedProductSk: selection.normalizedProductSk,
            status: 'moved_to_unprocessed',
            message:
              selection.selectionReason ||
              'No suitable product found - moved to manual review',
          });

          this.logger.debug(
            `Moved ${selection.normalizedProductSk} to unprocessed: ${unprocessedProduct.unprocessedProductSk}`,
          );
        }
      } catch (error) {
        result.errorCount++;
        const errorMsg = `Error processing selection ${selection.normalizedProductSk}: ${(error as Error).message}`;
        result.errorMessages.push(errorMsg);
        result.processedSelections.push({
          normalizedProductSk: selection.normalizedProductSk,
          status: 'error',
          message: errorMsg,
        });
        this.logger.error(errorMsg, error);
      }
    }

    // Trigger price synchronization for linked products (async)
    const linkedProductSks = result.processedSelections
      .filter((p) => p.linkedProductSk)
      .map((p) => p.linkedProductSk!);

    if (linkedProductSks.length > 0) {
      void this.syncPricesAsync(linkedProductSks);
    }

    this.logger.log(
      `Selection processing completed. Processed: ${result.processedCount}, Linked: ${result.linkedCount}, Unprocessed: ${result.unprocessedCount}, Errors: ${result.errorCount}`,
    );

    return result;
  }

  /**
   * Link normalized product to user-selected catalog product
   */
  private async linkNormalizedProductToSelected(
    normalizedProduct: NormalizedProduct,
    selectedProductSk: string,
  ): Promise<void> {
    // Update the normalized product with the selected link
    normalizedProduct.linkedProductSk = selectedProductSk;
    normalizedProduct.updatedAt = new Date();

    await this.normalizedProductRepository.save(normalizedProduct);

    this.logger.debug(
      `Successfully linked normalized product ${normalizedProduct.normalizedProductSk} to catalog product ${selectedProductSk}`,
    );
  }

  /**
   * Fetch pending selection products for the current receipt session
   * Includes ALL items from the current receipt that require user selection
   * (both confirmed and unconfirmed items that couldn't be linked automatically)
   */
  private async fetchPendingSelectionProductsForSession(
    result: ConfirmationResult,
    allItems: ConfirmationItem[],
  ): Promise<void> {
    try {
      // Get ALL normalized product SKs from the current receipt
      const allReceiptProductSks = allItems.map(
        (item) => item.normalizedProductSk,
      );

      if (allReceiptProductSks.length === 0) {
        this.logger.debug(
          'No items in receipt to check for pending selections',
        );
        return;
      }

      // Get all normalized products from this receipt that are eligible for selection
      // This includes both confirmed and unconfirmed items that haven't been linked yet
      const receiptProducts = await this.normalizedProductRepository.find({
        where: {
          normalizedProductSk: In(allReceiptProductSks),
          confidenceScore: MoreThanOrEqual(this.MIN_CONFIDENCE_THRESHOLD),
          linkedProductSk: IsNull(), // Not yet linked
        },
      });

      this.logger.debug(
        `Found ${receiptProducts.length} receipt products eligible for selection checking`,
      );

      // Check each receipt product for multiple matches
      for (const normalizedProduct of receiptProducts) {
        try {
          // Use the product selection service to check if this product has multiple matches
          const selectionResponse =
            await this.productSelectionService.getProductSelectionOptions({
              normalizedProductSk: normalizedProduct.normalizedProductSk,
              query: normalizedProduct.normalizedName,
              brand: normalizedProduct.brand,
              minSimilarityThreshold: 0.5,
              maxOptions: 5,
            });

          // If user selection is required, add to pending selection products
          if (selectionResponse.requiresUserSelection) {
            result.pendingSelectionProducts.push({
              normalizedProduct: {
                normalizedProductSk: normalizedProduct.normalizedProductSk,
                rawName: normalizedProduct.rawName,
                normalizedName: normalizedProduct.normalizedName,
                brand: normalizedProduct.brand,
                category: normalizedProduct.category,
                merchant: normalizedProduct.merchant,
                confidenceScore: normalizedProduct.confidenceScore,
                createdAt: normalizedProduct.createdAt,
              },
              matchCount: selectionResponse.totalMatches,
              topMatches: selectionResponse.matchingOptions.map((option) => ({
                productSk: option.productSk,
                name: option.name,
                brandName: option.brandName,
                barcode: option.barcode,
                score: option.score,
                method: option.method,
                imageUrl: option.imageUrl,
                description: option.description,
              })),
            });

            this.logger.debug(
              `Added pending selection product: ${normalizedProduct.normalizedProductSk} with ${selectionResponse.totalMatches} matches`,
            );
          }
        } catch (error) {
          this.logger.warn(
            `Error checking selection options for ${normalizedProduct.normalizedProductSk}:`,
            error,
          );
          // Continue processing other products even if one fails
        }
      }

      this.logger.log(
        `Found ${result.pendingSelectionProducts.length} products requiring user selection from current receipt`,
      );
    } catch (error) {
      this.logger.error(
        'Error fetching pending selection products for session:',
        error,
      );
      // Don't throw - this is supplementary information
    }
  }
}
