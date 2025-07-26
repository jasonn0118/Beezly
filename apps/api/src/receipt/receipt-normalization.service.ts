import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReceiptItem } from '../entities/receipt-item.entity';
import { NormalizedProduct } from '../entities/normalized-product.entity';
import { ReceiptItemNormalization } from '../entities/receipt-item-normalization.entity';
import { ProductNormalizationService } from '../product/product-normalization.service';
import { Receipt } from '../entities/receipt.entity';

export interface NormalizationCandidate {
  normalizedProduct: NormalizedProduct;
  confidenceScore: number;
  normalizationMethod: string;
  similarityScore?: number;
}

@Injectable()
export class ReceiptNormalizationService {
  constructor(
    @InjectRepository(ReceiptItem)
    private readonly receiptItemRepository: Repository<ReceiptItem>,
    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,
    @InjectRepository(NormalizedProduct)
    private readonly normalizedProductRepository: Repository<NormalizedProduct>,
    @InjectRepository(ReceiptItemNormalization)
    private readonly normalizationRepository: Repository<ReceiptItemNormalization>,
    private readonly productNormalizationService: ProductNormalizationService,
  ) {}

  /**
   * Normalize all items in a receipt
   * This runs as a separate process after receipt creation
   */
  async normalizeReceiptItems(receiptId: string): Promise<void> {
    // Get receipt with items and store
    const receipt = await this.receiptRepository.findOne({
      where: { receiptSk: receiptId },
      relations: ['items', 'store'],
    });

    if (!receipt || !receipt.items) {
      throw new Error(`Receipt ${receiptId} not found`);
    }

    const merchant = receipt.store?.name || 'Unknown Store';

    // Process each item
    for (const item of receipt.items) {
      if (item.isAdjustmentLine || item.isDiscountLine) {
        // Skip normalization for adjustments and discounts
        continue;
      }

      // Skip items without a raw name
      if (!item.rawName) {
        console.warn(
          `Skipping normalization for item ${item.receiptitemSk} - no raw name`,
        );
        continue;
      }

      await this.normalizeReceiptItem(
        item as ReceiptItem & { rawName: string },
        merchant,
      );
    }
  }

  /**
   * Normalize a single receipt item
   * Finds multiple potential matches and stores them all
   */
  async normalizeReceiptItem(
    item: ReceiptItem & { rawName: string },
    merchant: string,
  ): Promise<void> {
    // Check if already normalized
    const existingNormalizations = await this.normalizationRepository.find({
      where: { receiptItemSk: item.receiptitemSk },
    });

    if (existingNormalizations.length > 0) {
      // Already processed
      return;
    }

    // Get normalization candidates from the service
    const normalizationResult =
      await this.productNormalizationService.normalizeProduct({
        merchant,
        rawName: item.rawName,
        itemCode: item.itemCode,
        useAI: true,
      });

    const candidates: NormalizationCandidate[] = [];

    // Primary normalization result
    const primaryCandidate = await this.findOrCreateNormalizedProduct({
      merchant,
      rawName: item.rawName,
      itemCode: item.itemCode,
      normalizedName: normalizationResult.normalizedName,
      brand: normalizationResult.brand,
      category: normalizationResult.category,
      confidenceScore: normalizationResult.confidenceScore,
      isDiscount: normalizationResult.isDiscount,
      isAdjustment: normalizationResult.isAdjustment,
    });

    candidates.push({
      normalizedProduct: primaryCandidate,
      confidenceScore: normalizationResult.confidenceScore,
      normalizationMethod: normalizationResult.method || 'unknown',
    });

    // Add similar products as additional candidates
    if (normalizationResult.similarProducts) {
      for (const similar of normalizationResult.similarProducts) {
        const similarProduct = await this.normalizedProductRepository.findOne({
          where: {
            normalizedProductSk: similar.productId,
          },
        });

        if (similarProduct) {
          candidates.push({
            normalizedProduct: similarProduct,
            confidenceScore: similar.similarity,
            normalizationMethod: 'similarity_match',
            similarityScore: similar.similarity,
          });
        }
      }
    }

    // Save all normalization candidates
    await this.saveNormalizationCandidates(item, candidates);
  }

  /**
   * Find or create a normalized product
   */
  private async findOrCreateNormalizedProduct(data: {
    merchant: string;
    rawName: string;
    itemCode?: string;
    normalizedName: string;
    brand?: string;
    category?: string;
    confidenceScore: number;
    isDiscount: boolean;
    isAdjustment: boolean;
  }): Promise<NormalizedProduct> {
    // Check if normalized product already exists
    const existing = await this.normalizedProductRepository.findOne({
      where: {
        rawName: data.rawName,
        merchant: data.merchant,
      },
    });

    if (existing) {
      // Update match count and last matched time
      existing.matchCount = (existing.matchCount || 0) + 1;
      existing.lastMatchedAt = new Date();
      return await this.normalizedProductRepository.save(existing);
    }

    // Create new normalized product
    const normalizedProduct = this.normalizedProductRepository.create({
      rawName: data.rawName,
      merchant: data.merchant,
      itemCode: data.itemCode,
      normalizedName: data.normalizedName,
      brand: data.brand,
      category: data.category,
      confidenceScore: data.confidenceScore,
      isDiscount: data.isDiscount,
      isAdjustment: data.isAdjustment,
      matchCount: 1,
      lastMatchedAt: new Date(),
    });

    return await this.normalizedProductRepository.save(normalizedProduct);
  }

  /**
   * Save normalization candidates for a receipt item
   * The highest confidence match is marked as selected
   */
  private async saveNormalizationCandidates(
    item: ReceiptItem,
    candidates: NormalizationCandidate[],
  ): Promise<void> {
    if (candidates.length === 0) return;

    // Sort by confidence score descending
    candidates.sort((a, b) => b.confidenceScore - a.confidenceScore);

    // Save each candidate
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      const normalization = this.normalizationRepository.create({
        receiptItemSk: item.receiptitemSk,
        normalizedProductSk: candidate.normalizedProduct.normalizedProductSk,
        confidenceScore: candidate.confidenceScore,
        normalizationMethod: candidate.normalizationMethod,
        similarityScore: candidate.similarityScore,
        isSelected: i === 0, // First (highest confidence) is selected by default
      });

      await this.normalizationRepository.save(normalization);
    }
  }

  /**
   * Get normalized products for a receipt item
   */
  async getNormalizedProductsForItem(
    receiptItemId: string,
  ): Promise<ReceiptItemNormalization[]> {
    return await this.normalizationRepository.find({
      where: { receiptItemSk: receiptItemId },
      relations: ['normalizedProduct'],
      order: { confidenceScore: 'DESC' },
    });
  }

  /**
   * Update the selected normalization for a receipt item
   * This allows manual correction of normalization results
   */
  async updateSelectedNormalization(
    receiptItemId: string,
    normalizedProductId: string,
  ): Promise<void> {
    // First, unselect all normalizations for this item
    await this.normalizationRepository.update(
      { receiptItemSk: receiptItemId },
      { isSelected: false },
    );

    // Then select the specified normalization
    await this.normalizationRepository.update(
      {
        receiptItemSk: receiptItemId,
        normalizedProductSk: normalizedProductId,
      },
      { isSelected: true },
    );
  }

  /**
   * Get receipt with normalized items
   */
  async getReceiptWithNormalizedItems(receiptId: string): Promise<any> {
    const receipt = await this.receiptRepository.findOne({
      where: { receiptSk: receiptId },
      relations: ['items', 'store', 'user'],
    });

    if (!receipt) {
      throw new Error(`Receipt ${receiptId} not found`);
    }

    // Get normalizations for each item
    const itemsWithNormalizations = await Promise.all(
      receipt.items.map(async (item) => {
        const normalizations = await this.getNormalizedProductsForItem(
          item.receiptitemSk,
        );

        const selectedNormalization = normalizations.find((n) => n.isSelected);

        return {
          ...item,
          normalizations: normalizations.map((n) => ({
            normalizedProductSk: n.normalizedProduct.normalizedProductSk,
            normalizedName: n.normalizedProduct.normalizedName,
            brand: n.normalizedProduct.brand,
            category: n.normalizedProduct.category,
            confidenceScore: n.confidenceScore,
            normalizationMethod: n.normalizationMethod,
            isSelected: n.isSelected,
          })),
          selectedNormalization: selectedNormalization
            ? {
                normalizedName:
                  selectedNormalization.normalizedProduct.normalizedName,
                brand: selectedNormalization.normalizedProduct.brand,
                category: selectedNormalization.normalizedProduct.category,
                confidenceScore: selectedNormalization.confidenceScore,
              }
            : null,
        };
      }),
    );

    return {
      ...receipt,
      items: itemsWithNormalizations,
    };
  }
}
