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
import { ReceiptDTO } from '../../../packages/types/dto/receipt';
import { CreateReceiptRequestDto } from './dto/create-receipt-request.dto';

@ApiTags('Receipts')
@Controller('receipts')
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

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
}
