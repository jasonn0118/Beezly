import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReceiptItemDTO } from '../../../packages/types/dto/receiptItem';
import { ReceiptItem } from '../entities/receipt-item.entity';

export interface ReceiptItemSearchParams {
  receiptId?: string;
  productId?: string;
  minPrice?: number;
  maxPrice?: number;
  minQuantity?: number;
  maxQuantity?: number;
  limit?: number;
}

@Injectable()
export class ReceiptItemService {
  constructor(
    @InjectRepository(ReceiptItem)
    private readonly receiptItemRepository: Repository<ReceiptItem>,
  ) {}

  async getAllReceiptItems(limit: number = 100): Promise<ReceiptItemDTO[]> {
    const items = await this.receiptItemRepository.find({
      relations: ['receipt', 'product'],
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return items.map(item => this.mapReceiptItemToDTO(item));
  }

  async getReceiptItemById(id: string): Promise<ReceiptItemDTO | null> {
    // Try to find by receiptitemSk (UUID) first, then by id (integer)
    let item = await this.receiptItemRepository.findOne({
      where: { receiptitemSk: id },
      relations: ['receipt', 'product'],
    });

    // If not found by receiptitemSk, try by integer id
    if (!item && !isNaN(Number(id))) {
      item = await this.receiptItemRepository.findOne({
        where: { id: Number(id) },
        relations: ['receipt', 'product'],
      });
    }

    return item ? this.mapReceiptItemToDTO(item) : null;
  }

  async getReceiptItemsByReceiptId(receiptId: string, limit: number = 50): Promise<ReceiptItemDTO[]> {
    const items = await this.receiptItemRepository.find({
      where: { receiptSk: receiptId },
      relations: ['receipt', 'product'],
      take: limit,
      order: { createdAt: 'ASC' },
    });

    return items.map(item => this.mapReceiptItemToDTO(item));
  }

  async getReceiptItemsByProductId(productId: string, limit: number = 50): Promise<ReceiptItemDTO[]> {
    const items = await this.receiptItemRepository.find({
      where: { productSk: productId },
      relations: ['receipt', 'product'],
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return items.map(item => this.mapReceiptItemToDTO(item));
  }

  async createReceiptItem(receiptItemData: Partial<ReceiptItemDTO>): Promise<ReceiptItemDTO> {
    const item = this.receiptItemRepository.create({
      receiptSk: receiptItemData.receiptId,
      productSk: receiptItemData.productId,
      price: receiptItemData.price,
      quantity: receiptItemData.quantity || 1,
      lineTotal: receiptItemData.lineTotal || (receiptItemData.price! * (receiptItemData.quantity || 1)),
    });

    const savedItem = await this.receiptItemRepository.save(item);
    
    // Load with relations
    const completeItem = await this.receiptItemRepository.findOne({
      where: { id: savedItem.id },
      relations: ['receipt', 'product'],
    });

    return this.mapReceiptItemToDTO(completeItem!);
  }

  async updateReceiptItem(id: string, receiptItemData: Partial<ReceiptItemDTO>): Promise<ReceiptItemDTO> {
    const item = await this.getReceiptItemEntityById(id);
    if (!item) {
      throw new NotFoundException(`ReceiptItem with ID ${id} not found`);
    }

    // Update fields
    if (receiptItemData.price !== undefined) item.price = receiptItemData.price;
    if (receiptItemData.quantity !== undefined) item.quantity = receiptItemData.quantity;
    if (receiptItemData.productId !== undefined) item.productSk = receiptItemData.productId;

    // Recalculate line total
    item.lineTotal = item.price * item.quantity;

    const updatedItem = await this.receiptItemRepository.save(item);
    
    // Reload with relations
    const completeItem = await this.receiptItemRepository.findOne({
      where: { id: updatedItem.id },
      relations: ['receipt', 'product'],
    });

    return this.mapReceiptItemToDTO(completeItem!);
  }

  async deleteReceiptItem(id: string): Promise<void> {
    const item = await this.getReceiptItemEntityById(id);
    if (!item) {
      throw new NotFoundException(`ReceiptItem with ID ${id} not found`);
    }

    await this.receiptItemRepository.remove(item);
  }

  // 🔍 SEARCH AND ANALYTICS METHODS

  /**
   * Search receipt items with multiple criteria
   */
  async searchReceiptItems(params: ReceiptItemSearchParams): Promise<ReceiptItemDTO[]> {
    const { receiptId, productId, minPrice, maxPrice, minQuantity, maxQuantity, limit = 50 } = params;

    let query = this.receiptItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.receipt', 'receipt')
      .leftJoinAndSelect('item.product', 'product');

    // Add filters
    if (receiptId) {
      query = query.andWhere('item.receiptSk = :receiptId', { receiptId });
    }

    if (productId) {
      query = query.andWhere('item.productSk = :productId', { productId });
    }

    if (minPrice !== undefined) {
      query = query.andWhere('item.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      query = query.andWhere('item.price <= :maxPrice', { maxPrice });
    }

    if (minQuantity !== undefined) {
      query = query.andWhere('item.quantity >= :minQuantity', { minQuantity });
    }

    if (maxQuantity !== undefined) {
      query = query.andWhere('item.quantity <= :maxQuantity', { maxQuantity });
    }

    const items = await query
      .orderBy('item.createdAt', 'DESC')
      .limit(limit)
      .getMany();

    return items.map(item => this.mapReceiptItemToDTO(item));
  }

  /**
   * Get receipt items total for a receipt
   */
  async getReceiptItemsTotal(receiptId: string): Promise<number> {
    const result = await this.receiptItemRepository
      .createQueryBuilder('item')
      .select('SUM(item.lineTotal)', 'total')
      .where('item.receiptSk = :receiptId', { receiptId })
      .getRawOne();

    return Number(result.total) || 0;
  }

  /**
   * Get most purchased products (by quantity)
   */
  async getMostPurchasedProducts(limit: number = 20): Promise<{
    productId: string;
    productName: string;
    totalQuantity: number;
    totalSpent: number;
    receiptCount: number;
  }[]> {
    const results = await this.receiptItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.product', 'product')
      .select([
        'item.productSk as productId',
        'product.name as productName',
        'SUM(item.quantity) as totalQuantity',
        'SUM(item.lineTotal) as totalSpent',
        'COUNT(DISTINCT item.receiptSk) as receiptCount',
      ])
      .groupBy('item.productSk')
      .addGroupBy('product.name')
      .orderBy('totalQuantity', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map(result => ({
      productId: result.productId,
      productName: result.productName || 'Unknown Product',
      totalQuantity: Number(result.totalQuantity),
      totalSpent: Number(result.totalSpent),
      receiptCount: Number(result.receiptCount),
    }));
  }

  /**
   * Get price statistics for a product
   */
  async getProductPriceStats(productId: string): Promise<{
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    totalSold: number;
    receiptCount: number;
  }> {
    const result = await this.receiptItemRepository
      .createQueryBuilder('item')
      .select([
        'AVG(item.price) as averagePrice',
        'MIN(item.price) as minPrice',
        'MAX(item.price) as maxPrice',
        'SUM(item.quantity) as totalSold',
        'COUNT(DISTINCT item.receiptSk) as receiptCount',
      ])
      .where('item.productSk = :productId', { productId })
      .getRawOne();

    return {
      averagePrice: Number(result.averagePrice) || 0,
      minPrice: Number(result.minPrice) || 0,
      maxPrice: Number(result.maxPrice) || 0,
      totalSold: Number(result.totalSold) || 0,
      receiptCount: Number(result.receiptCount) || 0,
    };
  }

  // PRIVATE HELPER METHODS

  private async getReceiptItemEntityById(id: string): Promise<ReceiptItem | null> {
    // Try to find by receiptitemSk (UUID) first, then by id (integer)
    let item = await this.receiptItemRepository.findOne({
      where: { receiptitemSk: id },
      relations: ['receipt', 'product'],
    });

    // If not found by receiptitemSk, try by integer id
    if (!item && !isNaN(Number(id))) {
      item = await this.receiptItemRepository.findOne({
        where: { id: Number(id) },
        relations: ['receipt', 'product'],
      });
    }

    return item;
  }

  private mapReceiptItemToDTO(item: ReceiptItem): ReceiptItemDTO {
    return {
      id: item.receiptitemSk, // Use UUID as the public ID
      receiptId: item.receiptSk || '',
      productId: item.productSk,
      price: Number(item.price),
      quantity: item.quantity,
      lineTotal: Number(item.lineTotal),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}