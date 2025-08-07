import { Controller, Get, Param, Query } from '@nestjs/common';
import { BarcodeService } from './barcode.service';
import { ProductResponseDto } from './dto/product-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
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
}
