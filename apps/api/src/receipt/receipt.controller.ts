import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReceiptService, CreateReceiptRequest } from './receipt.service';
import { ReceiptNormalizationService } from './receipt-normalization.service';
import { ReceiptDTO } from '../../../packages/types/dto/receipt';
import { CreateReceiptRequestDto } from './dto/create-receipt-request.dto';
import {
  TestNormalizationRequestDto,
  TestNormalizationResponseDto,
} from './dto/test-normalization-response.dto';

@ApiTags('Receipts')
@Controller('receipts')
export class ReceiptController {
  constructor(
    private readonly receiptService: ReceiptService,
    private readonly normalizationService: ReceiptNormalizationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all receipts' })
  @ApiResponse({
    status: 200,
    description: 'List of all receipts',
    type: [ReceiptDTO],
  })
  async getAllReceipts(): Promise<ReceiptDTO[]> {
    return this.receiptService.getAllReceipts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a receipt by ID' })
  @ApiResponse({
    status: 200,
    description: 'Receipt found by ID',
    type: ReceiptDTO,
  })
  @ApiResponse({
    status: 404,
    description: 'Receipt not found',
  })
  async getReceiptById(@Param('id') id: string): Promise<ReceiptDTO | null> {
    return this.receiptService.getReceiptById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new receipt' })
  @ApiResponse({
    status: 201,
    description: 'Receipt successfully created',
    type: ReceiptDTO,
  })
  async createReceipt(
    @Body() receiptData: CreateReceiptRequestDto,
  ): Promise<ReceiptDTO> {
    // Convert DTO to service interface
    const createRequest: CreateReceiptRequest = {
      userId: receiptData.userId,
      storeName: receiptData.storeName,
      storeId: receiptData.storeId,
      imageUrl: receiptData.imageUrl,
      purchaseDate: receiptData.purchaseDate
        ? new Date(receiptData.purchaseDate)
        : undefined,
      items: receiptData.items,
      totalAmount: receiptData.totalAmount,
    };

    return this.receiptService.createReceipt(createRequest);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a receipt by ID' })
  @ApiResponse({
    status: 200,
    description: 'Receipt successfully updated',
    type: ReceiptDTO,
  })
  @ApiResponse({
    status: 404,
    description: 'Receipt not found',
  })
  async updateReceipt(
    @Param('id') id: string,
    @Body() receiptData: Partial<ReceiptDTO>,
  ): Promise<ReceiptDTO> {
    return this.receiptService.updateReceipt(id, receiptData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a receipt by ID' })
  @ApiResponse({
    status: 200,
    description: 'Receipt successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Receipt not found',
  })
  async deleteReceipt(@Param('id') id: string): Promise<{ message: string }> {
    await this.receiptService.deleteReceipt(id);
    return { message: 'Receipt deleted successfully' };
  }

  @Post('test-normalization')
  @ApiOperation({
    summary: 'Test product normalization on receipt items',
    description:
      'Test endpoint to demonstrate product normalization capabilities. Shows how raw receipt items are normalized, categorized, and matched against existing products.',
  })
  @ApiResponse({
    status: 200,
    description: 'Normalization test results with detailed breakdown',
    type: TestNormalizationResponseDto,
  })
  async testNormalization(
    @Body() request: TestNormalizationRequestDto,
  ): Promise<TestNormalizationResponseDto> {
    return this.receiptService.testNormalization(request);
  }

  @Post(':id/normalize')
  @ApiOperation({
    summary: 'Normalize items in a receipt',
    description:
      'Process all items in a receipt to find normalized product matches. This creates relationships between receipt items and normalized products.',
  })
  @ApiResponse({
    status: 200,
    description: 'Receipt items successfully normalized',
  })
  @ApiResponse({
    status: 404,
    description: 'Receipt not found',
  })
  async normalizeReceipt(
    @Param('id') id: string,
  ): Promise<{ message: string; itemsNormalized: number }> {
    await this.normalizationService.normalizeReceiptItems(id);
    const receipt = await this.receiptService.getReceiptById(id);
    return {
      message: 'Receipt items normalized successfully',
      itemsNormalized: receipt?.items.length || 0,
    };
  }

  @Get(':id/normalized')
  @ApiOperation({
    summary: 'Get receipt with normalized items',
    description:
      'Retrieve a receipt with all normalization data for each item, including multiple candidates and selected normalization.',
  })
  @ApiResponse({
    status: 200,
    description: 'Receipt with normalized items',
  })
  @ApiResponse({
    status: 404,
    description: 'Receipt not found',
  })
  async getReceiptWithNormalizedItems(@Param('id') id: string): Promise<any> {
    return this.normalizationService.getReceiptWithNormalizedItems(id);
  }

  @Put('items/:itemId/normalization/:productId')
  @ApiOperation({
    summary: 'Update selected normalization for a receipt item',
    description:
      'Change which normalized product is selected for a specific receipt item. This allows manual correction of normalization results.',
  })
  @ApiResponse({
    status: 200,
    description: 'Normalization selection updated',
  })
  async updateSelectedNormalization(
    @Param('itemId') itemId: string,
    @Param('productId') productId: string,
  ): Promise<{ message: string }> {
    await this.normalizationService.updateSelectedNormalization(
      itemId,
      productId,
    );
    return { message: 'Normalization selection updated successfully' };
  }
}
