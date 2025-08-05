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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserProfileDTO } from '../../../packages/types/dto/user';

@ApiTags('Receipts')
@Controller('receipts')
export class ReceiptController {
  constructor(
    private readonly receiptService: ReceiptService,
    private readonly normalizationService: ReceiptNormalizationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all receipts for authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'List of user receipts',
    type: [ReceiptDTO],
  })
  async getAllReceipts(
    @CurrentUser() user: UserProfileDTO,
  ): Promise<ReceiptDTO[]> {
    return this.receiptService.getReceiptsByUserId(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a receipt by ID (user ownership verified)' })
  @ApiResponse({
    status: 200,
    description: 'Receipt found by ID',
    type: ReceiptDTO,
  })
  @ApiResponse({
    status: 404,
    description: 'Receipt not found or access denied',
  })
  async getReceiptById(
    @Param('id') id: string,
    @CurrentUser() user: UserProfileDTO,
  ): Promise<ReceiptDTO | null> {
    return this.receiptService.getReceiptByIdForUser(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new receipt for authenticated user' })
  @ApiResponse({
    status: 201,
    description: 'Receipt successfully created',
    type: ReceiptDTO,
  })
  async createReceipt(
    @Body() receiptData: CreateReceiptRequestDto,
    @CurrentUser() user: UserProfileDTO,
  ): Promise<ReceiptDTO> {
    // Convert DTO to service interface - use authenticated user's ID
    const createRequest: CreateReceiptRequest = {
      userId: user.id, // Always use authenticated user's ID
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
  @ApiOperation({ summary: 'Update a receipt by ID (user ownership verified)' })
  @ApiResponse({
    status: 200,
    description: 'Receipt successfully updated',
    type: ReceiptDTO,
  })
  @ApiResponse({
    status: 404,
    description: 'Receipt not found or access denied',
  })
  async updateReceipt(
    @Param('id') id: string,
    @Body() receiptData: Partial<ReceiptDTO>,
    @CurrentUser() user: UserProfileDTO,
  ): Promise<ReceiptDTO> {
    return this.receiptService.updateReceiptForUser(id, receiptData, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a receipt by ID (user ownership verified)' })
  @ApiResponse({
    status: 200,
    description: 'Receipt successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Receipt not found or access denied',
  })
  async deleteReceipt(
    @Param('id') id: string,
    @CurrentUser() user: UserProfileDTO,
  ): Promise<{ message: string }> {
    await this.receiptService.deleteReceiptForUser(id, user.id);
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
    summary: 'Normalize items in a receipt (user ownership verified)',
    description:
      'Process all items in a receipt to find normalized product matches. This creates relationships between receipt items and normalized products.',
  })
  @ApiResponse({
    status: 200,
    description: 'Receipt items successfully normalized',
  })
  @ApiResponse({
    status: 404,
    description: 'Receipt not found or access denied',
  })
  async normalizeReceipt(
    @Param('id') id: string,
    @CurrentUser() user: UserProfileDTO,
  ): Promise<{ message: string; itemsNormalized: number }> {
    // Verify user ownership first
    const receipt = await this.receiptService.getReceiptByIdForUser(
      id,
      user.id,
    );
    if (!receipt) {
      throw new Error('Receipt not found or access denied');
    }

    await this.normalizationService.normalizeReceiptItems(id);
    return {
      message: 'Receipt items normalized successfully',
      itemsNormalized: receipt.items.length || 0,
    };
  }

  @Get(':id/normalized')
  @ApiOperation({
    summary: 'Get receipt with normalized items (user ownership verified)',
    description:
      'Retrieve a receipt with all normalization data for each item, including multiple candidates and selected normalization.',
  })
  @ApiResponse({
    status: 200,
    description: 'Receipt with normalized items',
  })
  @ApiResponse({
    status: 404,
    description: 'Receipt not found or access denied',
  })
  async getReceiptWithNormalizedItems(
    @Param('id') id: string,
    @CurrentUser() user: UserProfileDTO,
  ): Promise<any> {
    // Verify user ownership first
    const receipt = await this.receiptService.getReceiptByIdForUser(
      id,
      user.id,
    );
    if (!receipt) {
      throw new Error('Receipt not found or access denied');
    }

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
