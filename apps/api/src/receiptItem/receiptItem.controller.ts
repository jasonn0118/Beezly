import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ReceiptItemService, ReceiptItemSearchParams } from './receiptItem.service';
import { ReceiptItemDTO } from '../../../packages/types/dto/receiptItem';

@ApiTags('ReceiptItems')
@Controller('receipt-items')
export class ReceiptItemController {
  constructor(private readonly receiptItemService: ReceiptItemService) {}

  @Get()
  @ApiOperation({ summary: 'Get all receipt items' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of all receipt items',
    type: [ReceiptItemDTO],
  })
  async getAllReceiptItems(
    @Query('limit') limit?: number,
  ): Promise<ReceiptItemDTO[]> {
    return this.receiptItemService.getAllReceiptItems(limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a receipt item by ID' })
  @ApiResponse({
    status: 200,
    description: 'Receipt item found by ID',
    type: ReceiptItemDTO,
  })
  @ApiResponse({
    status: 404,
    description: 'Receipt item not found',
  })
  async getReceiptItemById(
    @Param('id') id: string,
  ): Promise<ReceiptItemDTO | null> {
    return this.receiptItemService.getReceiptItemById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new receipt item' })
  @ApiResponse({
    status: 201,
    description: 'Receipt item successfully created',
    type: ReceiptItemDTO,
  })
  async createReceiptItem(
    @Body() receiptItemData: ReceiptItemDTO,
  ): Promise<ReceiptItemDTO> {
    return this.receiptItemService.createReceiptItem(receiptItemData);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a receipt item by ID' })
  @ApiResponse({
    status: 200,
    description: 'Receipt item successfully updated',
    type: ReceiptItemDTO,
  })
  @ApiResponse({
    status: 404,
    description: 'Receipt item not found',
  })
  async updateReceiptItem(
    @Param('id') id: string,
    @Body() receiptItemData: Partial<ReceiptItemDTO>,
  ): Promise<ReceiptItemDTO> {
    return this.receiptItemService.updateReceiptItem(id, receiptItemData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a receipt item by ID' })
  @ApiResponse({
    status: 200,
    description: 'Receipt item successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Receipt item not found',
  })
  async deleteReceiptItem(
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.receiptItemService.deleteReceiptItem(id);
    return { message: 'Receipt item deleted successfully' };
  }

  @Get('receipt/:receiptId')
  @ApiOperation({ summary: 'Get receipt items by receipt ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Receipt items for the specified receipt',
    type: [ReceiptItemDTO],
  })
  async getReceiptItemsByReceiptId(
    @Param('receiptId') receiptId: string,
    @Query('limit') limit?: number,
  ): Promise<ReceiptItemDTO[]> {
    return this.receiptItemService.getReceiptItemsByReceiptId(receiptId, limit);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get receipt items by product ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Receipt items for the specified product',
    type: [ReceiptItemDTO],
  })
  async getReceiptItemsByProductId(
    @Param('productId') productId: string,
    @Query('limit') limit?: number,
  ): Promise<ReceiptItemDTO[]> {
    return this.receiptItemService.getReceiptItemsByProductId(productId, limit);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search receipt items with filters' })
  @ApiQuery({ name: 'receiptId', required: false, type: String })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'minQuantity', required: false, type: Number })
  @ApiQuery({ name: 'maxQuantity', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Filtered receipt items',
    type: [ReceiptItemDTO],
  })
  async searchReceiptItems(
    @Query() params: ReceiptItemSearchParams,
  ): Promise<ReceiptItemDTO[]> {
    return this.receiptItemService.searchReceiptItems(params);
  }

  @Get('analytics/popular-products')
  @ApiOperation({ summary: 'Get most purchased products' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Most purchased products with statistics',
  })
  async getMostPurchasedProducts(
    @Query('limit') limit?: number,
  ): Promise<{
    productId: string;
    productName: string;
    totalQuantity: number;
    totalSpent: number;
    receiptCount: number;
  }[]> {
    return this.receiptItemService.getMostPurchasedProducts(limit);
  }

  @Get('analytics/product-price-stats/:productId')
  @ApiOperation({ summary: 'Get price statistics for a product' })
  @ApiResponse({
    status: 200,
    description: 'Price statistics for the specified product',
  })
  async getProductPriceStats(
    @Param('productId') productId: string,
  ): Promise<{
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    totalSold: number;
    receiptCount: number;
  }> {
    return this.receiptItemService.getProductPriceStats(productId);
  }

  @Get('analytics/receipt-total/:receiptId')
  @ApiOperation({ summary: 'Get total amount for a receipt' })
  @ApiResponse({
    status: 200,
    description: 'Total amount for the specified receipt',
  })
  async getReceiptItemsTotal(
    @Param('receiptId') receiptId: string,
  ): Promise<{ receiptId: string; total: number }> {
    const total = await this.receiptItemService.getReceiptItemsTotal(receiptId);
    return { receiptId, total };
  }
}
