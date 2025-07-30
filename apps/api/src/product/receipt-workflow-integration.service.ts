import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receipt } from '../entities/receipt.entity';
import { ReceiptItem } from '../entities/receipt-item.entity';
import { ReceiptItemNormalization } from '../entities/receipt-item-normalization.entity';
import { NormalizedProduct } from '../entities/normalized-product.entity';
import {
  EnhancedReceiptLinkingService,
  ProductLinkingContext,
} from './enhanced-receipt-linking.service';
import { ProductConfirmationService } from './product-confirmation.service';

export interface WorkflowIntegrationResult {
  receiptProcessed: boolean;
  productsLinked: number;
  pricesSynced: number;
  storesLinked: number;
  errors: string[];
  statistics: {
    totalItems: number;
    normalizedItems: number;
    linkedItems: number;
    pendingConfirmation: number;
    requiresSelection: number;
  };
}

@Injectable()
export class ReceiptWorkflowIntegrationService {
  private readonly logger = new Logger(ReceiptWorkflowIntegrationService.name);

  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,
    @InjectRepository(ReceiptItem)
    private readonly receiptItemRepository: Repository<ReceiptItem>,
    @InjectRepository(ReceiptItemNormalization)
    private readonly receiptItemNormalizationRepository: Repository<ReceiptItemNormalization>,
    @InjectRepository(NormalizedProduct)
    private readonly normalizedProductRepository: Repository<NormalizedProduct>,
    private readonly enhancedReceiptLinkingService: EnhancedReceiptLinkingService,
    private readonly productConfirmationService: ProductConfirmationService,
  ) {}

  /**
   * Process a receipt through the complete workflow:
   * 1. Receipt uploaded and OCR processed
   * 2. Items normalized to products
   * 3. User confirmation of normalized products
   * 4. Automatic product linking with price and store sync
   */
  async processReceiptWorkflow(
    receiptId: string,
  ): Promise<WorkflowIntegrationResult> {
    this.logger.log(
      `Starting complete receipt workflow for receipt ${receiptId}`,
    );

    const result: WorkflowIntegrationResult = {
      receiptProcessed: false,
      productsLinked: 0,
      pricesSynced: 0,
      storesLinked: 0,
      errors: [],
      statistics: {
        totalItems: 0,
        normalizedItems: 0,
        linkedItems: 0,
        pendingConfirmation: 0,
        requiresSelection: 0,
      },
    };

    try {
      // Step 1: Get receipt and validate it exists
      const receipt = await this.receiptRepository.findOne({
        where: { receiptSk: receiptId },
        relations: ['items', 'store'],
      });

      if (!receipt) {
        result.errors.push(`Receipt ${receiptId} not found`);
        return result;
      }

      result.statistics.totalItems = receipt.items.length;

      // Step 2: Get all normalized items for this receipt
      const normalizedItems = await this.getReceiptNormalizedItems(receiptId);
      result.statistics.normalizedItems = normalizedItems.length;

      // Step 3: Process confirmed normalizations and auto-link high-confidence matches
      const linkingContexts = this.buildLinkingContexts(
        receipt,
        normalizedItems,
      );

      if (linkingContexts.length > 0) {
        this.logger.log(
          `Processing ${linkingContexts.length} product links for receipt ${receiptId}`,
        );

        const linkingResults =
          await this.enhancedReceiptLinkingService.batchLinkProductsWithPriceAndStore(
            linkingContexts,
          );

        // Aggregate results
        for (const linkingResult of linkingResults) {
          if (linkingResult.success && linkingResult.productLinked) {
            result.productsLinked++;
            result.pricesSynced += linkingResult.pricesSynced;
            if (linkingResult.storeLinked) {
              result.storesLinked++;
            }
          }
          result.errors.push(...linkingResult.errors);
        }
      }

      // Step 4: Update statistics
      result.statistics.linkedItems = result.productsLinked;
      result.statistics.pendingConfirmation =
        await this.getPendingConfirmationCount(receiptId);
      result.statistics.requiresSelection =
        await this.getRequiresSelectionCount(receiptId);

      result.receiptProcessed = true;

      this.logger.log(
        `Completed receipt workflow for ${receiptId}. Linked: ${result.productsLinked}, Prices synced: ${result.pricesSynced}, Errors: ${result.errors.length}`,
      );

      return result;
    } catch (error) {
      result.errors.push(
        `Workflow processing failed: ${(error as Error).message}`,
      );
      this.logger.error(`Receipt workflow failed for ${receiptId}:`, error);
      return result;
    }
  }

  /**
   * Auto-process receipt after user confirmations are completed
   */
  async autoProcessAfterConfirmation(
    receiptId: string,
    confirmedNormalizations: string[],
  ): Promise<WorkflowIntegrationResult> {
    this.logger.log(
      `Auto-processing receipt ${receiptId} after ${confirmedNormalizations.length} confirmations`,
    );

    try {
      // Update final prices for confirmed normalizations
      await this.updateFinalPrices(receiptId, confirmedNormalizations);

      // Process the workflow with enhanced linking
      return this.processReceiptWorkflow(receiptId);
    } catch (error) {
      this.logger.error(
        `Auto-processing failed for receipt ${receiptId}:`,
        error,
      );
      return {
        receiptProcessed: false,
        productsLinked: 0,
        pricesSynced: 0,
        storesLinked: 0,
        errors: [`Auto-processing failed: ${(error as Error).message}`],
        statistics: {
          totalItems: 0,
          normalizedItems: 0,
          linkedItems: 0,
          pendingConfirmation: 0,
          requiresSelection: 0,
        },
      };
    }
  }

  /**
   * Get receipt processing status and statistics
   */
  async getReceiptProcessingStatus(receiptId: string): Promise<{
    status:
      | 'pending'
      | 'processing'
      | 'confirmation_needed'
      | 'selection_needed'
      | 'completed'
      | 'failed';
    progress: {
      totalItems: number;
      normalizedItems: number;
      confirmedItems: number;
      linkedItems: number;
      pricesSynced: number;
    };
    nextActions: string[];
  }> {
    const receipt = await this.receiptRepository.findOne({
      where: { receiptSk: receiptId },
      relations: ['items'],
    });

    if (!receipt) {
      return {
        status: 'failed',
        progress: {
          totalItems: 0,
          normalizedItems: 0,
          confirmedItems: 0,
          linkedItems: 0,
          pricesSynced: 0,
        },
        nextActions: ['Receipt not found'],
      };
    }

    const totalItems = receipt.items.length;
    const normalizedItems = await this.getReceiptNormalizedItems(receiptId);
    const confirmedItems = normalizedItems.filter(
      (item) => item.isSelected,
    ).length;
    const linkedItems = await this.getLinkedItemsCount(receiptId);
    const pricesSynced = await this.getPricesSyncedCount(receiptId);
    const pendingConfirmation =
      await this.getPendingConfirmationCount(receiptId);
    const requiresSelection = await this.getRequiresSelectionCount(receiptId);

    let status:
      | 'pending'
      | 'processing'
      | 'confirmation_needed'
      | 'selection_needed'
      | 'completed'
      | 'failed';
    const nextActions: string[] = [];

    if (receipt.status === 'failed') {
      status = 'failed';
      nextActions.push('Review receipt processing errors');
    } else if (receipt.status === 'processing') {
      status = 'processing';
      nextActions.push('Wait for OCR and normalization to complete');
    } else if (pendingConfirmation > 0) {
      status = 'confirmation_needed';
      nextActions.push(
        `Review and confirm ${pendingConfirmation} normalized products`,
      );
    } else if (requiresSelection > 0) {
      status = 'selection_needed';
      nextActions.push(
        `Select products for ${requiresSelection} items with multiple matches`,
      );
    } else if (linkedItems === totalItems && pricesSynced > 0) {
      status = 'completed';
      nextActions.push('Receipt fully processed');
    } else {
      status = 'pending';
      if (linkedItems < totalItems) {
        nextActions.push(
          `${totalItems - linkedItems} items still need product linking`,
        );
      }
      if (pricesSynced === 0) {
        nextActions.push('Prices need to be synced');
      }
    }

    return {
      status,
      progress: {
        totalItems,
        normalizedItems: normalizedItems.length,
        confirmedItems,
        linkedItems,
        pricesSynced,
      },
      nextActions,
    };
  }

  // Private helper methods

  private async getReceiptNormalizedItems(
    receiptId: string,
  ): Promise<ReceiptItemNormalization[]> {
    return this.receiptItemNormalizationRepository
      .createQueryBuilder('rin')
      .leftJoinAndSelect('rin.receiptItem', 'ri')
      .leftJoinAndSelect('rin.normalizedProduct', 'np')
      .where('ri.receiptSk = :receiptId', { receiptId })
      .getMany();
  }

  private buildLinkingContexts(
    receipt: Receipt,
    normalizedItems: ReceiptItemNormalization[],
  ): ProductLinkingContext[] {
    const contexts: ProductLinkingContext[] = [];

    // Filter for selected normalizations that are linked to catalog products
    const linkedNormalizations = normalizedItems.filter(
      (item) => item.isSelected && item.normalizedProduct?.linkedProductSk,
    );

    for (const normalization of linkedNormalizations) {
      const context: ProductLinkingContext = {
        receiptSk: receipt.receiptSk,
        normalizedProductSk: normalization.normalizedProductSk,
        linkedProductSk: normalization.normalizedProduct.linkedProductSk!,
        linkingConfidence:
          normalization.normalizedProduct.linkingConfidence || 0.8,
        linkingMethod:
          normalization.normalizedProduct.linkingMethod || 'user_confirmed',
        merchant: normalization.normalizedProduct.merchant,
        storeSk: receipt.storeSk || undefined,
        receiptDate: receipt.receiptDate || receipt.createdAt,
      };

      contexts.push(context);
    }

    return contexts;
  }

  private async updateFinalPrices(
    receiptId: string,
    confirmedNormalizations: string[],
  ): Promise<void> {
    // Update final prices for confirmed normalizations
    // This would include any discounts or fees applied during confirmation
    for (const normalizationId of confirmedNormalizations) {
      const normalization =
        await this.receiptItemNormalizationRepository.findOne({
          where: { id: normalizationId },
          relations: ['receiptItem'],
        });

      if (normalization && normalization.receiptItem) {
        // For now, use the original price as final price
        // In a real implementation, this would calculate the final price including discounts
        normalization.finalPrice = Number(normalization.receiptItem.price);
        await this.receiptItemNormalizationRepository.save(normalization);
      }
    }
  }

  private async getPendingConfirmationCount(
    receiptId: string,
  ): Promise<number> {
    return this.receiptItemNormalizationRepository
      .createQueryBuilder('rin')
      .leftJoin('rin.receiptItem', 'ri')
      .leftJoin('rin.normalizedProduct', 'np')
      .where('ri.receiptSk = :receiptId', { receiptId })
      .andWhere('rin.isSelected = false')
      .andWhere('np.confidenceScore >= :threshold', { threshold: 0.8 })
      .getCount();
  }

  private async getRequiresSelectionCount(receiptId: string): Promise<number> {
    // Count items that have multiple high-confidence matches but no selection
    const result = await this.receiptItemNormalizationRepository
      .createQueryBuilder('rin')
      .leftJoin('rin.receiptItem', 'ri')
      .leftJoin('rin.normalizedProduct', 'np')
      .select('ri.receiptitemSk', 'receiptItemSk')
      .addSelect('COUNT(*)', 'matchCount')
      .where('ri.receiptSk = :receiptId', { receiptId })
      .andWhere('np.confidenceScore >= :threshold', { threshold: 0.8 })
      .andWhere('rin.isSelected = false')
      .groupBy('ri.receiptitemSk')
      .having('COUNT(*) > 1')
      .getRawMany();

    return result.length;
  }

  private async getLinkedItemsCount(receiptId: string): Promise<number> {
    return this.receiptItemNormalizationRepository
      .createQueryBuilder('rin')
      .leftJoin('rin.receiptItem', 'ri')
      .leftJoin('rin.normalizedProduct', 'np')
      .where('ri.receiptSk = :receiptId', { receiptId })
      .andWhere('rin.isSelected = true')
      .andWhere('np.linkedProductSk IS NOT NULL')
      .getCount();
  }

  private async getPricesSyncedCount(receiptId: string): Promise<number> {
    // This would query the Price table to count how many prices have been synced for this receipt
    // For now, return a placeholder implementation
    return this.receiptItemNormalizationRepository
      .createQueryBuilder('rin')
      .leftJoin('rin.receiptItem', 'ri')
      .leftJoin('rin.normalizedProduct', 'np')
      .where('ri.receiptSk = :receiptId', { receiptId })
      .andWhere('rin.isSelected = true')
      .andWhere('np.linkedProductSk IS NOT NULL')
      .andWhere('rin.finalPrice IS NOT NULL')
      .getCount();
  }
}
