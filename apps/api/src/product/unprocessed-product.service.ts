import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import {
  UnprocessedProduct,
  UnprocessedProductStatus,
  UnprocessedProductReason,
} from '../entities/unprocessed-product.entity';
import { Product } from '../entities/product.entity';
import { ProductService } from './product.service';

export interface UnprocessedProductReviewItem {
  unprocessedProductSk: string;
  normalizedProductSk: string;
  rawName: string;
  normalizedName: string;
  brand?: string;
  category?: string;
  merchant: string;
  confidenceScore: number;
  status: UnprocessedProductStatus;
  reason: UnprocessedProductReason;
  occurrenceCount: number;
  priorityScore: number;
  createdAt: Date;
  reviewNotes?: string;
}

export interface UnprocessedProductStats {
  totalUnprocessed: number;
  pendingReview: number;
  underReview: number;
  approvedForCreation: number;
  rejected: number;
  processed: number;
  averagePriorityScore: number;
  topReasons: Array<{ reason: string; count: number }>;
  topMerchants: Array<{ merchant: string; count: number }>;
}

export interface BulkReviewAction {
  unprocessedProductSks: string[];
  action: 'approve' | 'reject' | 'create_product';
  reviewNotes?: string;
  reviewerId?: string;
}

export interface BulkReviewResult {
  success: boolean;
  processed: number;
  approved: number;
  rejected: number;
  created: number;
  errors: number;
  errorMessages: string[];
}

@Injectable()
export class UnprocessedProductService {
  private readonly logger = new Logger(UnprocessedProductService.name);

  constructor(
    @InjectRepository(UnprocessedProduct)
    private readonly unprocessedProductRepository: Repository<UnprocessedProduct>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly productService: ProductService,
  ) {}

  /**
   * Get unprocessed products for review with filtering and sorting
   */
  async getUnprocessedProductsForReview(
    status?: UnprocessedProductStatus,
    reason?: UnprocessedProductReason,
    merchant?: string,
    minPriorityScore?: number,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ items: UnprocessedProductReviewItem[]; totalCount: number }> {
    const queryBuilder = this.unprocessedProductRepository
      .createQueryBuilder('up')
      .leftJoinAndSelect('up.normalizedProduct', 'np');

    // Apply filters
    if (status) {
      queryBuilder.andWhere('up.status = :status', { status });
    }

    if (reason) {
      queryBuilder.andWhere('up.reason = :reason', { reason });
    }

    if (merchant) {
      queryBuilder.andWhere('up.merchant ILIKE :merchant', {
        merchant: `%${merchant}%`,
      });
    }

    if (minPriorityScore !== undefined) {
      queryBuilder.andWhere('up.priorityScore >= :minPriorityScore', {
        minPriorityScore,
      });
    }

    // Sort by priority score (desc) and creation date (asc)
    queryBuilder
      .orderBy('up.priorityScore', 'DESC')
      .addOrderBy('up.createdAt', 'ASC')
      .skip(offset)
      .take(limit);

    const [items, totalCount] = await queryBuilder.getManyAndCount();

    const reviewItems: UnprocessedProductReviewItem[] = items.map((item) => ({
      unprocessedProductSk: item.unprocessedProductSk,
      normalizedProductSk: item.normalizedProductSk,
      rawName: item.rawName,
      normalizedName: item.normalizedName,
      brand: item.brand,
      category: item.category,
      merchant: item.merchant,
      confidenceScore: item.confidenceScore,
      status: item.status,
      reason: item.reason,
      occurrenceCount: item.occurrenceCount,
      priorityScore: item.priorityScore,
      createdAt: item.createdAt,
      reviewNotes: item.reviewNotes,
    }));

    return { items: reviewItems, totalCount };
  }

  /**
   * Get statistics about unprocessed products
   */
  async getUnprocessedProductStats(): Promise<UnprocessedProductStats> {
    const results = await Promise.all([
      this.unprocessedProductRepository.count(),
      this.unprocessedProductRepository.count({
        where: { status: UnprocessedProductStatus.PENDING_REVIEW },
      }),
      this.unprocessedProductRepository.count({
        where: { status: UnprocessedProductStatus.UNDER_REVIEW },
      }),
      this.unprocessedProductRepository.count({
        where: { status: UnprocessedProductStatus.APPROVED_FOR_CREATION },
      }),
      this.unprocessedProductRepository.count({
        where: { status: UnprocessedProductStatus.REJECTED },
      }),
      this.unprocessedProductRepository.count({
        where: { status: UnprocessedProductStatus.PROCESSED },
      }),
      this.unprocessedProductRepository
        .createQueryBuilder('up')
        .select('AVG(up.priorityScore)', 'avg')
        .getRawOne(),
      this.unprocessedProductRepository
        .createQueryBuilder('up')
        .select('up.reason', 'reason')
        .addSelect('COUNT(*)', 'count')
        .groupBy('up.reason')
        .orderBy('count', 'DESC')
        .limit(5)
        .getRawMany(),
      this.unprocessedProductRepository
        .createQueryBuilder('up')
        .select('up.merchant', 'merchant')
        .addSelect('COUNT(*)', 'count')
        .groupBy('up.merchant')
        .orderBy('count', 'DESC')
        .limit(5)
        .getRawMany(),
    ]);

    const [
      totalUnprocessed,
      pendingReview,
      underReview,
      approvedForCreation,
      rejected,
      processed,
      avgPriorityResult,
      reasonStats,
      merchantStats,
    ] = results as [
      number,
      number,
      number,
      number,
      number,
      number,
      { avg: string } | null,
      Array<{ reason: string; count: string }>,
      Array<{ merchant: string; count: string }>,
    ];

    return {
      totalUnprocessed,
      pendingReview,
      underReview,
      approvedForCreation,
      rejected,
      processed,
      averagePriorityScore: parseFloat(avgPriorityResult?.avg || '0'),
      topReasons: reasonStats.map((stat) => ({
        reason: stat.reason,
        count: parseInt(stat.count),
      })),
      topMerchants: merchantStats.map((stat) => ({
        merchant: stat.merchant,
        count: parseInt(stat.count),
      })),
    };
  }

  /**
   * Update status of an unprocessed product
   */
  async updateUnprocessedProductStatus(
    unprocessedProductSk: string,
    status: UnprocessedProductStatus,
    reviewNotes?: string,
    reviewerId?: string,
  ): Promise<UnprocessedProduct> {
    const unprocessedProduct = await this.unprocessedProductRepository.findOne({
      where: { unprocessedProductSk },
    });

    if (!unprocessedProduct) {
      throw new NotFoundException(
        `Unprocessed product ${unprocessedProductSk} not found`,
      );
    }

    unprocessedProduct.status = status;
    unprocessedProduct.reviewNotes = reviewNotes;
    unprocessedProduct.reviewerId = reviewerId;
    unprocessedProduct.reviewedAt = new Date();

    return this.unprocessedProductRepository.save(unprocessedProduct);
  }

  /**
   * Create a new product from an approved unprocessed product
   */
  async createProductFromUnprocessedProduct(
    unprocessedProductSk: string,
    reviewerId?: string,
    productOverrides?: Partial<Product>,
  ): Promise<{ product: Product; unprocessedProduct: UnprocessedProduct }> {
    const unprocessedProduct = await this.unprocessedProductRepository.findOne({
      where: { unprocessedProductSk },
      relations: ['normalizedProduct'],
    });

    if (!unprocessedProduct) {
      throw new NotFoundException(
        `Unprocessed product ${unprocessedProductSk} not found`,
      );
    }

    if (unprocessedProduct.status === UnprocessedProductStatus.PROCESSED) {
      throw new BadRequestException(
        'This unprocessed product has already been processed',
      );
    }

    try {
      // Create the new product
      const productData = {
        name: unprocessedProduct.normalizedName,
        brandName: unprocessedProduct.brand || 'Unknown',
        barcode:
          unprocessedProduct.suggestedBarcode || unprocessedProduct.itemCode,
        ...productOverrides,
      };

      // Use the product service to create the product
      // Note: This would need to be adapted based on your ProductService.createProduct method signature
      const newProduct = this.productRepository.create(productData);
      const savedProduct = await this.productRepository.save(newProduct);

      // Update unprocessed product status
      unprocessedProduct.status = UnprocessedProductStatus.PROCESSED;
      unprocessedProduct.createdProductSk = savedProduct.productSk;
      unprocessedProduct.reviewerId = reviewerId;
      unprocessedProduct.reviewedAt = new Date();
      unprocessedProduct.reviewNotes = `Product created: ${savedProduct.name}`;

      const updatedUnprocessedProduct =
        await this.unprocessedProductRepository.save(unprocessedProduct);

      this.logger.log(
        `Created product ${savedProduct.productSk} from unprocessed product ${unprocessedProductSk}`,
      );

      return {
        product: savedProduct,
        unprocessedProduct: updatedUnprocessedProduct,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create product from unprocessed product ${unprocessedProductSk}:`,
        error,
      );
      throw new BadRequestException(
        `Failed to create product: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Bulk review actions on multiple unprocessed products
   */
  async performBulkReviewAction(
    bulkAction: BulkReviewAction,
  ): Promise<BulkReviewResult> {
    const result: BulkReviewResult = {
      success: true,
      processed: 0,
      approved: 0,
      rejected: 0,
      created: 0,
      errors: 0,
      errorMessages: [],
    };

    for (const unprocessedProductSk of bulkAction.unprocessedProductSks) {
      try {
        result.processed++;

        switch (bulkAction.action) {
          case 'approve':
            await this.updateUnprocessedProductStatus(
              unprocessedProductSk,
              UnprocessedProductStatus.APPROVED_FOR_CREATION,
              bulkAction.reviewNotes,
              bulkAction.reviewerId,
            );
            result.approved++;
            break;

          case 'reject':
            await this.updateUnprocessedProductStatus(
              unprocessedProductSk,
              UnprocessedProductStatus.REJECTED,
              bulkAction.reviewNotes,
              bulkAction.reviewerId,
            );
            result.rejected++;
            break;

          case 'create_product':
            await this.createProductFromUnprocessedProduct(
              unprocessedProductSk,
              bulkAction.reviewerId,
            );
            result.created++;
            break;

          default:
            throw new BadRequestException(
              `Unknown action: ${bulkAction.action as string}`,
            );
        }
      } catch (error) {
        result.errors++;
        const errorMsg = `Error processing ${unprocessedProductSk}: ${(error as Error).message}`;
        result.errorMessages.push(errorMsg);
        this.logger.error(errorMsg, error);
      }
    }

    if (result.errors > 0) {
      result.success = false;
    }

    this.logger.log(
      `Bulk review action completed. Processed: ${result.processed}, Approved: ${result.approved}, Rejected: ${result.rejected}, Created: ${result.created}, Errors: ${result.errors}`,
    );

    return result;
  }

  /**
   * Get high-priority unprocessed products that need immediate review
   */
  async getHighPriorityUnprocessedProducts(
    minPriorityScore: number = 5.0,
    limit: number = 20,
  ): Promise<UnprocessedProductReviewItem[]> {
    const items = await this.unprocessedProductRepository.find({
      where: {
        status: UnprocessedProductStatus.PENDING_REVIEW,
        priorityScore: MoreThanOrEqual(minPriorityScore),
      },
      order: {
        priorityScore: 'DESC',
        occurrenceCount: 'DESC',
      },
      take: limit,
      relations: ['normalizedProduct'],
    });

    return items.map((item) => ({
      unprocessedProductSk: item.unprocessedProductSk,
      normalizedProductSk: item.normalizedProductSk,
      rawName: item.rawName,
      normalizedName: item.normalizedName,
      brand: item.brand,
      category: item.category,
      merchant: item.merchant,
      confidenceScore: item.confidenceScore,
      status: item.status,
      reason: item.reason,
      occurrenceCount: item.occurrenceCount,
      priorityScore: item.priorityScore,
      createdAt: item.createdAt,
      reviewNotes: item.reviewNotes,
    }));
  }

  /**
   * Delete processed or rejected unprocessed products (cleanup)
   */
  async cleanupProcessedUnprocessedProducts(
    olderThanDays: number = 30,
  ): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.unprocessedProductRepository
      .createQueryBuilder()
      .delete()
      .where('status IN (:...statuses)', {
        statuses: [
          UnprocessedProductStatus.PROCESSED,
          UnprocessedProductStatus.REJECTED,
        ],
      })
      .andWhere('updated_at < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(
      `Cleaned up ${result.affected || 0} processed unprocessed products`,
    );

    return { deletedCount: result.affected || 0 };
  }
}
