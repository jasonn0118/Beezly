import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { BarcodeService } from './barcode.service';
import { BarcodeLookupDto } from './dto/barcode-lookup.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('barcode')
@Controller('barcode')
export class BarcodeController {
  constructor(private readonly barcodeService: BarcodeService) {}

  @Post('lookup')
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

  @Get(':barcode')
  // TODO: Add @UseGuards(JwtAuthGuard) when JWT authentication is implemented
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get product by barcode' })
  @ApiResponse({
    status: 200,
    description: 'Product found',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductByBarcode(
    @Param('barcode') barcode: string,
  ): Promise<ProductResponseDto> {
    return this.barcodeService.getProductByBarcode(barcode);
  }
}
