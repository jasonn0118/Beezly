import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReceiptDTO } from '../../../packages/types/dto/receipt';
import { NormalizedProductDTO } from '../../../packages/types/dto/product';
import { Receipt } from '../entities/receipt.entity';
import { ReceiptItem } from '../entities/receipt-item.entity';
import { Store } from '../entities/store.entity';
import { UserService } from '../user/user.service';
import { StoreService } from '../store/store.service';
import { ProductService } from '../product/product.service';
import { ProductNormalizationService } from '../product/product-normalization.service';
import { Category } from '../entities/category.entity';

export interface CreateReceiptRequest {
  userId?: string;
  storeName?: string;
  storeId?: string;
  imageUrl?: string;
  purchaseDate?: Date;
  items: {
    productName: string;
    barcode?: string;
    category?: string;
    price: number;
    quantity: number;
  }[];
  totalAmount?: number;
}

export type ReceiptStatus =
  | 'pending'
  | 'processing'
  | 'failed'
  | 'manual_review'
  | 'done';

export interface ReceiptSearchParams {
  userId?: string;
  storeId?: string;
  status?: ReceiptStatus;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
}

@Injectable()
export class ReceiptService {
  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    private readonly userService: UserService,
    private readonly storeService: StoreService,
    private readonly productService: ProductService,
    private readonly productNormalizationService: ProductNormalizationService,
  ) {}

  async getAllReceipts(limit: number = 50): Promise<ReceiptDTO[]> {
    const receipts = await this.receiptRepository.find({
      relations: ['user', 'store', 'items', 'items.product'],
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      receipts.map((receipt) => this.mapReceiptToDTO(receipt)),
    );
  }

  async getReceiptById(id: string): Promise<ReceiptDTO | null> {
    // Try to find by receiptSk (UUID) first, then by id (integer)
    let receipt = await this.receiptRepository.findOne({
      where: { receiptSk: id },
      relations: ['user', 'store', 'items', 'items.product'],
    });

    // If not found by receiptSk, try by integer id
    if (!receipt && !isNaN(Number(id))) {
      receipt = await this.receiptRepository.findOne({
        where: { id: Number(id) },
        relations: ['user', 'store', 'items', 'items.product'],
      });
    }

    return receipt ? this.mapReceiptToDTO(receipt) : null;
  }

  async getReceiptsByUserId(
    userId: string,
    limit: number = 50,
  ): Promise<ReceiptDTO[]> {
    const receipts = await this.receiptRepository.find({
      where: { userSk: userId },
      relations: ['user', 'store', 'items', 'items.product'],
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      receipts.map((receipt) => this.mapReceiptToDTO(receipt)),
    );
  }

  async getReceiptsByStoreId(
    storeId: string,
    limit: number = 50,
  ): Promise<ReceiptDTO[]> {
    const receipts = await this.receiptRepository.find({
      where: { storeSk: storeId },
      relations: ['user', 'store', 'items', 'items.product'],
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      receipts.map((receipt) => this.mapReceiptToDTO(receipt)),
    );
  }

  async createReceipt(receiptData: CreateReceiptRequest): Promise<ReceiptDTO> {
    // Start a transaction for creating receipt with items
    return this.receiptRepository.manager.transaction(async (manager) => {
      // Handle user lookup
      let userSk: string | undefined;
      if (receiptData.userId) {
        const user = await this.userService.getUserById(receiptData.userId);
        if (user) {
          userSk = user.id; // This is the UUID from the DTO
        }
      }

      // Handle store lookup or creation
      let storeSk: string | undefined;

      if (receiptData.storeId) {
        const store = await this.storeService.getStoreById(receiptData.storeId);
        if (store) {
          storeSk = store.id; // This is the UUID from the DTO
        }
      } else if (receiptData.storeName) {
        // Try to find existing store by name
        const existingStore = await this.storeRepository.findOne({
          where: { name: receiptData.storeName },
        });
        if (existingStore) {
          storeSk = existingStore.storeSk;
        }
      }

      // Calculate total amount if not provided (for future use)
      // const totalAmount = receiptData.totalAmount ||
      //   receiptData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Create receipt
      const receipt = manager.create(Receipt, {
        userSk,
        storeSk,
        imageUrl: receiptData.imageUrl,
        status: 'pending',
        parsedData: { items: receiptData.items }, // Store original parsed data
        purchaseDate: receiptData.purchaseDate || new Date(),
      });

      const savedReceipt = await manager.save(receipt);

      // Create receipt items with normalization
      await Promise.all(
        receiptData.items.map(async (itemData) => {
          // Step 1: Normalize the product name
          const storeName = receiptData.storeName || 'Unknown Store';
          const normalizationResult =
            await this.productNormalizationService.normalizeProduct({
              merchant: storeName,
              rawName: itemData.productName,
              itemCode: itemData.barcode,
              useAI: true,
            });

          // Step 2: Try to find or create product using normalized data
          let product = await this.productService.getProductByBarcode(
            itemData.barcode || '',
          );

          if (!product) {
            let categoryId: number | undefined;

            // Use normalized category if available, otherwise fall back to original
            const categoryName =
              normalizationResult.category || itemData.category;

            if (categoryName) {
              // Try to find category by name
              let category = await this.storeRepository.manager.findOne(
                Category,
                {
                  where: { name: categoryName },
                },
              );

              if (!category) {
                // Create category if not found
                category = this.storeRepository.manager.create(Category, {
                  name: categoryName,
                  slug: categoryName.toLowerCase().replace(/\s+/g, '-'),
                  level: 1,
                  useYn: true,
                });
                category = await this.storeRepository.manager.save(category);
              }

              categoryId = category.id;
            }

            // Create new product using normalized name
            const productName =
              normalizationResult.isDiscount || normalizationResult.isAdjustment
                ? itemData.productName // Keep original name for discounts/adjustments
                : normalizationResult.normalizedName; // Use normalized name for products

            product = await this.productService.createProduct({
              name: productName,
              barcode: itemData.barcode,
              category: categoryId,
            });
          }

          const receiptItem = manager.create(ReceiptItem, {
            receiptSk: savedReceipt.receiptSk,
            productSk: product.product_sk,
            price: itemData.price,
            quantity: itemData.quantity,
            lineTotal: itemData.price * itemData.quantity,
          });

          return manager.save(receiptItem);
        }),
      );

      // Update receipt status to done after successful processing
      savedReceipt.status = 'done';
      await manager.save(savedReceipt);

      // Return the complete receipt with items
      const completeReceipt = await manager.findOne(Receipt, {
        where: { id: savedReceipt.id },
        relations: ['user', 'store', 'items', 'items.product'],
      });

      return this.mapReceiptToDTO(completeReceipt!);
    });
  }

  async updateReceipt(
    id: string,
    receiptData: Partial<ReceiptDTO>,
  ): Promise<ReceiptDTO> {
    const receipt = await this.getReceiptEntityById(id);
    if (!receipt) {
      throw new NotFoundException(`Receipt with ID ${id} not found`);
    }

    // Update fields
    if (receiptData.status) {
      receipt.status = receiptData.status;
    }
    if (receiptData.purchaseDate) {
      receipt.purchaseDate = new Date(receiptData.purchaseDate);
    }

    const updatedReceipt = await this.receiptRepository.save(receipt);

    // Reload with relations
    const completeReceipt = await this.receiptRepository.findOne({
      where: { id: updatedReceipt.id },
      relations: ['user', 'store', 'items', 'items.product'],
    });

    return this.mapReceiptToDTO(completeReceipt!);
  }

  async deleteReceipt(id: string): Promise<void> {
    const receipt = await this.getReceiptEntityById(id);
    if (!receipt) {
      throw new NotFoundException(`Receipt with ID ${id} not found`);
    }

    await this.receiptRepository.remove(receipt);
  }

  // 📊 ANALYTICS AND SEARCH METHODS

  /**
   * Search receipts with multiple criteria
   */
  async searchReceipts(params: ReceiptSearchParams): Promise<ReceiptDTO[]> {
    const {
      userId,
      storeId,
      status,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      limit = 50,
    } = params;

    let query = this.receiptRepository
      .createQueryBuilder('receipt')
      .leftJoinAndSelect('receipt.user', 'user')
      .leftJoinAndSelect('receipt.store', 'store')
      .leftJoinAndSelect('receipt.items', 'items')
      .leftJoinAndSelect('items.product', 'product');

    // Add filters
    if (userId) {
      query = query.andWhere('receipt.userSk = :userId', { userId });
    }

    if (storeId) {
      query = query.andWhere('receipt.storeSk = :storeId', { storeId });
    }

    if (status) {
      query = query.andWhere('receipt.status = :status', { status });
    }

    if (startDate) {
      query = query.andWhere('receipt.purchaseDate >= :startDate', {
        startDate,
      });
    }

    if (endDate) {
      query = query.andWhere('receipt.purchaseDate <= :endDate', { endDate });
    }

    // Calculate total amount from items and apply filters
    if (minAmount !== undefined || maxAmount !== undefined) {
      query = query.having('SUM(items.lineTotal) IS NOT NULL');

      if (minAmount !== undefined) {
        query = query.andHaving('SUM(items.lineTotal) >= :minAmount', {
          minAmount,
        });
      }

      if (maxAmount !== undefined) {
        query = query.andHaving('SUM(items.lineTotal) <= :maxAmount', {
          maxAmount,
        });
      }
    }

    const receipts = await query
      .groupBy('receipt.id')
      .addGroupBy('user.id')
      .addGroupBy('store.id')
      .orderBy('receipt.createdAt', 'DESC')
      .limit(limit)
      .getMany();

    return Promise.all(
      receipts.map((receipt) => this.mapReceiptToDTO(receipt)),
    );
  }

  /**
   * Get receipt statistics for a user
   */
  async getUserReceiptStats(userId: string): Promise<{
    totalReceipts: number;
    totalSpent: number;
    averageSpent: number;
    topStores: { storeName: string; count: number; totalSpent: number }[];
  }> {
    const receipts = await this.receiptRepository
      .createQueryBuilder('receipt')
      .leftJoinAndSelect('receipt.store', 'store')
      .leftJoinAndSelect('receipt.items', 'items')
      .where('receipt.userSk = :userId', { userId })
      .andWhere('receipt.status = :status', { status: 'done' })
      .getMany();

    const totalReceipts = receipts.length;
    const totalSpent = receipts.reduce(
      (sum, receipt) =>
        sum +
        receipt.items.reduce(
          (itemSum, item) => itemSum + Number(item.lineTotal),
          0,
        ),
      0,
    );
    const averageSpent = totalReceipts > 0 ? totalSpent / totalReceipts : 0;

    // Calculate top stores
    const storeStats = new Map<string, { count: number; totalSpent: number }>();
    receipts.forEach((receipt) => {
      const storeName = receipt.store?.name || 'Unknown Store';
      const receiptTotal = receipt.items.reduce(
        (sum, item) => sum + Number(item.lineTotal),
        0,
      );

      if (storeStats.has(storeName)) {
        const stats = storeStats.get(storeName)!;
        stats.count += 1;
        stats.totalSpent += receiptTotal;
      } else {
        storeStats.set(storeName, { count: 1, totalSpent: receiptTotal });
      }
    });

    const topStores = Array.from(storeStats.entries())
      .map(([storeName, stats]) => ({ storeName, ...stats }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    return {
      totalReceipts,
      totalSpent,
      averageSpent,
      topStores,
    };
  }

  /**
   * Get receipts by status
   */
  async getReceiptsByStatus(
    status: ReceiptStatus,
    limit: number = 50,
  ): Promise<ReceiptDTO[]> {
    const receipts = await this.receiptRepository.find({
      where: { status },
      relations: ['user', 'store', 'items', 'items.product'],
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      receipts.map((receipt) => this.mapReceiptToDTO(receipt)),
    );
  }

  /**
   * Update receipt status (for processing pipeline)
   */
  async updateReceiptStatus(
    id: string,
    status: ReceiptStatus,
  ): Promise<ReceiptDTO> {
    const receipt = await this.getReceiptEntityById(id);
    if (!receipt) {
      throw new NotFoundException(`Receipt with ID ${id} not found`);
    }

    receipt.status = status;
    await this.receiptRepository.save(receipt);

    const completeReceipt = await this.receiptRepository.findOne({
      where: { id: receipt.id },
      relations: ['user', 'store', 'items', 'items.product'],
    });

    return this.mapReceiptToDTO(completeReceipt!);
  }

  // PRIVATE HELPER METHODS

  private async getReceiptEntityById(id: string): Promise<Receipt | null> {
    // Try to find by receiptSk (UUID) first, then by id (integer)
    let receipt = await this.receiptRepository.findOne({
      where: { receiptSk: id },
      relations: ['user', 'store', 'items', 'items.product'],
    });

    // If not found by receiptSk, try by integer id
    if (!receipt && !isNaN(Number(id))) {
      receipt = await this.receiptRepository.findOne({
        where: { id: Number(id) },
        relations: ['user', 'store', 'items', 'items.product'],
      });
    }

    return receipt;
  }

  private async mapReceiptToDTO(receipt: Receipt): Promise<ReceiptDTO> {
    // Convert receipt items to product DTOs
    const items: NormalizedProductDTO[] = await Promise.all(
      receipt.items.map(async (item) => {
        const product = item.product
          ? await this.productService.getProductById(item.product.productSk)
          : null;
        return {
          product_sk: item.productSk || 'unknown',
          name: product?.name || 'Unknown Product',
          barcode: product?.barcode,
          category:
            typeof product?.category === 'number'
              ? product.category
              : undefined,
          price: Number(item.price),
          image_url: product?.image_url,
          quantity: item.quantity,
          created_at: item.createdAt.toISOString(),
          updated_at: item.updatedAt.toISOString(),
          credit_score: product?.credit_score ?? 0,
          verified_count: product?.verified_count ?? 0,
          flagged_count: product?.flagged_count ?? 0,
        };
      }),
    );

    return {
      id: receipt.receiptSk, // Use UUID as the public ID
      userId: receipt.userSk,
      storeName: receipt.store?.name || 'Unknown Store',
      purchaseDate:
        receipt.purchaseDate?.toISOString() || new Date().toISOString(),
      status: receipt.status,
      totalAmount: receipt.items.reduce(
        (sum, item) => sum + Number(item.lineTotal),
        0,
      ),
      items,
      createdAt: receipt.createdAt.toISOString(),
      updatedAt: receipt.updatedAt.toISOString(),
    };
  }
}
