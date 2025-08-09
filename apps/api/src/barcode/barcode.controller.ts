import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { BarcodeService } from './barcode.service';
import { ProductResponseDto } from './dto/product-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { BarcodeType } from '@beezly/types';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Barcodes')
@Controller('barcode')
export class BarcodeController {
  constructor(private readonly barcodeService: BarcodeService) {}

  @Public()
  @Get(':barcode')
  @ApiOperation({ summary: 'Get product by barcode' })
  @ApiParam({
    name: 'barcode',
    description: 'The barcode string to lookup',
    example: '0123456789012',
  })
  @ApiQuery({
    name: 'type',
    description: 'The type of barcode',
    enum: BarcodeType,
    required: false,
    example: BarcodeType.EAN13,
  })
  @ApiResponse({
    status: 200,
    description: 'Product found',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductByBarcode(
    @Param('barcode') barcode: string,
    @Query('type') barcodeType?: BarcodeType,
  ): Promise<ProductResponseDto> {
    return this.barcodeService.getProductByBarcode(barcode, barcodeType);
  }

  @Public()
  @Post('lookup')
  @ApiOperation({
    summary: 'Lookup product by barcode (POST method for mobile compatibility)',
  })
  @ApiBody({
    description: 'Barcode lookup request',
    schema: {
      type: 'object',
      properties: {
        barcode: { type: 'string', example: '0123456789012' },
        type: {
          type: 'string',
          enum: Object.values(BarcodeType),
        },
      },
      required: ['barcode'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Product found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        product: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            barcode: { type: 'string' },
            barcodeType: { type: 'string', enum: Object.values(BarcodeType) },
            brand: { type: 'string' },
            category: { type: 'number' },
            image_url: { type: 'string' },
            isVerified: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Product not found' },
      },
    },
  })
  async lookupProductByBarcode(
    @Body() body: { barcode: string; type?: BarcodeType },
  ): Promise<{
    success: boolean;
    product?: ProductResponseDto;
    message?: string;
  }> {
    try {
      const product = await this.barcodeService.getProductByBarcode(
        body.barcode,
        body.type,
      );
      return { success: true, product };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Product not found',
      };
    }
  }
}
