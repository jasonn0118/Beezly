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
import { ReceiptItemService } from './receiptItem.service';
import { ReceiptItemDTO } from '../../../packages/types/dto/receiptItem';

@ApiTags('ReceiptItems')
@Controller('receipt-items')
export class ReceiptItemController {
  constructor(private readonly receiptItemService: ReceiptItemService) {}

  @Get()
  @ApiOperation({ summary: 'Get all receipt items' })
  @ApiResponse({
    status: 200,
    description: 'List of all receipt items',
    type: [ReceiptItemDTO],
  })
  async getAllReceiptItems(): Promise<ReceiptItemDTO[]> {
    return this.receiptItemService.getAllReceiptItems();
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
}
