import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NormalizedProduct } from '../entities/normalized-product.entity';
import { Product } from '../entities/product.entity';
import {
  ProductLinkingService,
  ProductMatchCandidate,
} from './product-linking.service';
import {
  ProductSelectionRequestDto,
  ProductSelectionResponseDto,
  ProductMatchOptionDto,
  UserProductSelectionDto,
  UserProductSelectionResponseDto,
  BulkProductSelectionDto,
  BulkProductSelectionResponseDto,
} from './dto/product-selection.dto';

/**
 * Service for handling user product selection when multiple catalog products
 * match a normalized product. This addresses cases where automated linking
 * finds 2+ potential matches and requires user intervention.
 */
@Injectable()
export class ProductSelectionService {
  private readonly logger = new Logger(ProductSelectionService.name);
  private readonly MULTIPLE_MATCH_THRESHOLD = 2; // Require user selection when 2+ matches found
  private readonly DEFAULT_MIN_SIMILARITY = 0.5;
  private readonly DEFAULT_MAX_OPTIONS = 10;

  constructor(
    @InjectRepository(NormalizedProduct)
    private readonly normalizedProductRepository: Repository<NormalizedProduct>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly productLinkingService: ProductLinkingService,
  ) {}

  /**
   * Find matching product options for a normalized product and determine
   * if user selection is required (when 2+ matches found)
   */
  async getProductSelectionOptions(
    request: ProductSelectionRequestDto,
  ): Promise<ProductSelectionResponseDto> {
    const {
      normalizedProductSk,
      query,
      brand,
      minSimilarityThreshold = this.DEFAULT_MIN_SIMILARITY,
      maxOptions = this.DEFAULT_MAX_OPTIONS,
    } = request;

    // Get the normalized product details
    const normalizedProduct = await this.normalizedProductRepository.findOne({
      where: { normalizedProductSk },
    });

    if (!normalizedProduct) {
      throw new NotFoundException(
        `Normalized product ${normalizedProductSk} not found`,
      );
    }

    // Check if already linked
    if (normalizedProduct.linkedProductSk) {
      throw new BadRequestException(
        `Normalized product ${normalizedProductSk} is already linked to product ${normalizedProduct.linkedProductSk}`,
      );
    }

    // Find all potential matches using the existing product linking logic
    const candidates = await this.findProductCandidatesForSelection(
      normalizedProduct,
      query,
      brand,
      minSimilarityThreshold,
    );

    // Filter and sort candidates
    const filteredCandidates = candidates
      .filter((candidate) => candidate.score >= minSimilarityThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxOptions);

    // Convert to DTOs with additional product details
    const matchingOptions =
      await this.enhanceMatchingOptions(filteredCandidates);

    // Determine if user selection is required
    const requiresUserSelection =
      filteredCandidates.length >= this.MULTIPLE_MATCH_THRESHOLD;
    const recommendedOption =
      matchingOptions.length > 0 ? matchingOptions[0] : undefined;

    this.logger.log(
      `Found ${filteredCandidates.length} matches for normalized product ${normalizedProductSk}. ` +
        `User selection ${requiresUserSelection ? 'required' : 'not required'}.`,
    );

    return {
      normalizedProduct: {
        normalizedProductSk: normalizedProduct.normalizedProductSk,
        rawName: normalizedProduct.rawName,
        normalizedName: normalizedProduct.normalizedName,
        brand: normalizedProduct.brand,
        category: normalizedProduct.category,
        merchant: normalizedProduct.merchant,
        confidenceScore: normalizedProduct.confidenceScore,
      },
      matchingOptions,
      totalMatches: filteredCandidates.length,
      requiresUserSelection,
      recommendedOption,
    };
  }

  /**
   * Process user's product selection and create the link
   */
  async processUserSelection(
    selection: UserProductSelectionDto,
  ): Promise<UserProductSelectionResponseDto> {
    const {
      normalizedProductSk,
      selectedProductSk,
      userId,
      userConfidence = 1.0,
      userNotes,
    } = selection;

    // Validate normalized product exists and is not already linked
    const normalizedProduct = await this.normalizedProductRepository.findOne({
      where: { normalizedProductSk },
    });

    if (!normalizedProduct) {
      return {
        success: false,
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        updatedNormalizedProduct: {} as any,
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
        message: 'Normalized product not found',
        error: `Normalized product ${normalizedProductSk} not found`,
      };
    }

    if (normalizedProduct.linkedProductSk) {
      return {
        success: false,
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        updatedNormalizedProduct: {} as any,
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
        message: 'Product already linked',
        error: `Normalized product ${normalizedProductSk} is already linked to ${normalizedProduct.linkedProductSk}`,
      };
    }

    // Validate selected product exists
    const selectedProduct = await this.productRepository.findOne({
      where: { productSk: selectedProductSk },
    });

    if (!selectedProduct) {
      return {
        success: false,
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        updatedNormalizedProduct: {} as any,
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
        message: 'Selected product not found',
        error: `Selected product ${selectedProductSk} not found`,
      };
    }

    // Create the link with user selection metadata
    try {
      await this.normalizedProductRepository.update(normalizedProductSk, {
        linkedProductSk: selectedProductSk,
        linkingConfidence: userConfidence,
        linkingMethod: 'user_selection',
        linkedAt: new Date(),
      });

      // Log the user selection for analytics
      this.logger.log(
        `User selection completed: normalized=${normalizedProductSk}, selected=${selectedProductSk}, ` +
          `user=${userId || 'anonymous'}, confidence=${userConfidence}${userNotes ? `, notes="${userNotes}"` : ''}`,
      );

      // Get updated normalized product
      const updatedProduct = await this.normalizedProductRepository.findOne({
        where: { normalizedProductSk },
      });

      return {
        success: true,
        updatedNormalizedProduct: {
          normalizedProductSk: updatedProduct!.normalizedProductSk,
          linkedProductSk: updatedProduct!.linkedProductSk!,
          linkingConfidence: updatedProduct!.linkingConfidence!,
          linkingMethod: updatedProduct!.linkingMethod!,
          linkedAt: updatedProduct!.linkedAt!,
        },
        message: 'Product successfully linked based on user selection',
      };
    } catch (error) {
      this.logger.error(
        `Failed to process user selection for ${normalizedProductSk}:`,
        error,
      );

      return {
        success: false,
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        updatedNormalizedProduct: {} as any,
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
        message: 'Failed to create product link',
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Process multiple user selections in batch
   */
  async processBulkUserSelections(
    bulkRequest: BulkProductSelectionDto,
  ): Promise<BulkProductSelectionResponseDto> {
    const { selections, userId } = bulkRequest;

    let processed = 0;
    let linked = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    for (const selection of selections) {
      try {
        processed++;

        // Use userId from bulk request if not provided in individual selection
        const selectionWithUser = {
          ...selection,
          userId: selection.userId || userId,
        };

        const result = await this.processUserSelection(selectionWithUser);

        if (result.success) {
          linked++;
          this.logger.debug(
            `Bulk selection ${processed}/${selections.length}: Successfully linked ${selection.normalizedProductSk} to ${selection.selectedProductSk}`,
          );
        } else {
          errors++;
          const errorMsg = `Selection ${processed}: ${result.error || result.message}`;
          errorMessages.push(errorMsg);
          this.logger.warn(errorMsg);
        }
      } catch (error) {
        errors++;
        const errorMsg = `Selection ${processed}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errorMessages.push(errorMsg);
        this.logger.error(
          `Bulk selection error for ${selection.normalizedProductSk}:`,
          error,
        );
      }
    }

    this.logger.log(
      `Bulk user selection completed: ${processed} processed, ${linked} linked, ${errors} errors`,
    );

    return {
      processed,
      linked,
      errors,
      errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
      success: errors === 0,
    };
  }

  /**
   * Get products that require user selection (2+ matches found)
   */
  async getProductsRequiringSelection(
    limit: number = 50,
    offset: number = 0,
    minConfidenceScore: number = 0.8,
  ): Promise<{
    items: Array<{
      normalizedProduct: any;
      matchCount: number;
      topMatches: ProductMatchOptionDto[];
    }>;
    totalCount: number;
  }> {
    // Get unlinked normalized products with high confidence
    const unlinkedProducts = await this.normalizedProductRepository
      .createQueryBuilder('np')
      .where('np.linkedProductSk IS NULL')
      .andWhere('np.confidenceScore >= :minConfidenceScore', {
        minConfidenceScore,
      })
      .orderBy('np.confidenceScore', 'DESC')
      .addOrderBy('np.createdAt', 'ASC')
      .skip(offset)
      .take(limit + 100) // Get extra to filter for multi-matches
      .getMany();

    const itemsRequiringSelection: Array<{
      normalizedProduct: any;
      matchCount: number;
      topMatches: ProductMatchOptionDto[];
    }> = [];

    for (const normalizedProduct of unlinkedProducts) {
      if (itemsRequiringSelection.length >= limit) break;

      // Check if this product has multiple matches
      const candidates = await this.findProductCandidatesForSelection(
        normalizedProduct,
        normalizedProduct.normalizedName,
        normalizedProduct.brand,
        0.5,
      );

      const qualifiedMatches = candidates.filter((c) => c.score >= 0.5);

      if (qualifiedMatches.length >= this.MULTIPLE_MATCH_THRESHOLD) {
        const topMatches = await this.enhanceMatchingOptions(
          qualifiedMatches.slice(0, 5), // Top 5 matches
        );

        itemsRequiringSelection.push({
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
          matchCount: qualifiedMatches.length,
          topMatches,
        });
      }
    }

    return {
      items: itemsRequiringSelection,
      totalCount: itemsRequiringSelection.length, // This is approximate
    };
  }

  /**
   * Find product candidates for selection with enhanced brand matching criteria
   */
  private async findProductCandidatesForSelection(
    normalizedProduct: NormalizedProduct,
    query: string,
    brand?: string,
    minSimilarity: number = 0.5,
  ): Promise<ProductMatchCandidate[]> {
    // Create a temporary normalized product for candidate search
    const searchProduct = { ...normalizedProduct };
    if (brand) searchProduct.brand = brand;

    // Use the existing product linking service to find candidates
    // This reuses all the sophisticated matching logic (barcode, embedding, brand, name)
    /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
    const allCandidates = (await (
      this.productLinkingService as any
    ).findProductCandidates(searchProduct)) as ProductMatchCandidate[];
    /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

    // Filter by minimum similarity first
    const qualifiedCandidates = allCandidates.filter(
      (candidate: ProductMatchCandidate) => candidate.score >= minSimilarity,
    );

    // Apply enhanced brand matching criteria
    const filteredCandidates = this.applyBrandMatchingCriteria(
      qualifiedCandidates,
      normalizedProduct,
    );

    this.logger.debug(
      `Brand filtering for ${normalizedProduct.normalizedProductSk} (brand: "${normalizedProduct.brand}"): ` +
        `${qualifiedCandidates.length} candidates -> ${filteredCandidates.length} after brand filtering`,
    );

    return filteredCandidates;
  }

  /**
   * Apply enhanced brand matching criteria:
   * 1. If normalized product has a brand, filter out mismatched brands
   * 2. Prioritize exact brand matches at the top
   * 3. Show brand matches first, then other matches
   */
  private applyBrandMatchingCriteria(
    candidates: ProductMatchCandidate[],
    normalizedProduct: NormalizedProduct,
  ): ProductMatchCandidate[] {
    const normalizedBrand = normalizedProduct.brand?.toLowerCase().trim();

    // If no brand specified in normalized product, return all candidates sorted by score
    if (!normalizedBrand) {
      return candidates.sort((a, b) => b.score - a.score);
    }

    // Separate candidates into brand matches and non-matches
    const brandMatches: ProductMatchCandidate[] = [];
    const nonBrandMatches: ProductMatchCandidate[] = [];

    candidates.forEach((candidate) => {
      const candidateBrand = candidate.brand?.toLowerCase().trim();

      if (
        candidateBrand &&
        this.isBrandMatch(normalizedBrand, candidateBrand)
      ) {
        // This is a brand match - boost the score slightly for priority sorting
        brandMatches.push({
          ...candidate,
          score: Math.min(candidate.score + 0.1, 1.0), // Boost by 0.1, max 1.0
          method: `${candidate.method}_brand_match`,
        });
        this.logger.debug(
          `Brand match: "${normalizedBrand}" matches "${candidateBrand}" for product ${candidate.name}`,
        );
      } else if (!candidateBrand) {
        // Product has no brand - include it but with lower priority
        nonBrandMatches.push(candidate);
        this.logger.debug(
          `No brand product included: ${candidate.name} (no brand specified)`,
        );
      } else {
        // Products with mismatched brands are filtered out entirely
        this.logger.debug(
          `Brand mismatch filtered out: "${normalizedBrand}" != "${candidateBrand}" for product ${candidate.name}`,
        );
      }
    });

    // Sort brand matches by score (descending), then non-brand matches
    brandMatches.sort((a, b) => b.score - a.score);
    nonBrandMatches.sort((a, b) => b.score - a.score);

    // Return brand matches first, then non-brand matches
    // This ensures brand-matched products appear at the top of the list
    return [...brandMatches, ...nonBrandMatches];
  }

  /**
   * Check if two brand names match using fuzzy logic
   * Handles variations like "Kirkland" vs "Kirkland Signature"
   */
  private isBrandMatch(
    normalizedBrand: string,
    candidateBrand: string,
  ): boolean {
    // Exact match
    if (normalizedBrand === candidateBrand) {
      return true;
    }

    // Check if one brand contains the other (handles "Kirkland" vs "Kirkland Signature")
    const shorter =
      normalizedBrand.length < candidateBrand.length
        ? normalizedBrand
        : candidateBrand;
    const longer =
      normalizedBrand.length >= candidateBrand.length
        ? normalizedBrand
        : candidateBrand;

    // If shorter brand is contained in longer brand, it's a match
    if (longer.includes(shorter) && shorter.length >= 3) {
      return true;
    }

    // Check for common brand variations and abbreviations
    const brandVariations: Record<string, string[]> = {
      kirkland: ['kirkland signature', 'ks'],
      'great value': ['gv', 'great val'],
      "president's choice": ['pc', 'presidents choice'],
      'no name': ['noname', 'nn'],
      'store brand': ['store', 'generic'],
    };

    for (const [canonical, variations] of Object.entries(brandVariations)) {
      const allForms = [canonical, ...variations];
      if (
        allForms.includes(normalizedBrand) &&
        allForms.includes(candidateBrand)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Enhance matching options with additional product details
   */
  private async enhanceMatchingOptions(
    candidates: ProductMatchCandidate[],
  ): Promise<ProductMatchOptionDto[]> {
    const enhanced: ProductMatchOptionDto[] = [];

    for (const candidate of candidates) {
      // Get full product details
      const product = await this.productRepository.findOne({
        where: { productSk: candidate.productSk },
        relations: ['categoryEntity'],
      });

      if (product) {
        enhanced.push({
          productSk: candidate.productSk,
          name: candidate.name,
          brandName: candidate.brand,
          barcode: candidate.barcode,
          score: candidate.score,
          method: candidate.method,
          imageUrl: product.imageUrl,
          description: product.categoryEntity?.category1
            ? `Category: ${product.categoryEntity.category1}`
            : undefined,
        });
      }
    }

    return enhanced;
  }
}
