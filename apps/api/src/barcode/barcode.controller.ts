import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpCode,
  Query,
} from '@nestjs/common';
import { BarcodeService } from './barcode.service';
import { BarcodeLookupDto } from './dto/barcode-lookup.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { BarcodeType } from '@beezly/types';

@ApiTags('Barcodes')
@Controller('barcode')
export class BarcodeController {
  constructor(private readonly barcodeService: BarcodeService) {}

  @Get(':barcode')
  // TODO: Add @UseGuards(JwtAuthGuard) when JWT authentication is implemented
  @ApiBearerAuth()
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

  @Post('lookup')
  @HttpCode(200)
  // TODO: Add @UseGuards(JwtAuthGuard) when JWT authentication is implemented
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Look up a product by barcode' })
  @ApiResponse({
    status: 200,
    description: 'Product found or placeholder created',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid barcode format' })
  async lookupBarcode(
    @Body() barcodeLookupDto: BarcodeLookupDto,
  ): Promise<ProductResponseDto> {
    return this.barcodeService.lookupBarcode(barcodeLookupDto);
  }
}
