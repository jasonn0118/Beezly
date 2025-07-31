import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { BarcodeService } from './barcode.service';
import { ProductResponseDto } from './dto/product-response.dto';
import { EnhancedProductResponseDto } from './dto/enhanced-product-response.dto';
import {
  AddProductPriceDto,
  AddProductPriceResponseDto,
} from './dto/add-product-price.dto';
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

  @Get(':productSk/enhanced')
  // TODO: Add @UseGuards(JwtAuthGuard) when JWT authentication is implemented
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get product by product ID with store and price information',
    description:
      'Returns detailed product information including prices across different stores, location-based filtering, and price comparison data.',
  })
  @ApiParam({
    name: 'productSk',
    description: 'The product UUID to lookup',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiQuery({
    name: 'storeSk',
    description: 'Filter prices from specific store (store UUID)',
    required: false,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiQuery({
    name: 'latitude',
    description: 'User latitude for location-based store filtering',
    required: false,
    type: Number,
    example: 49.2827,
  })
  @ApiQuery({
    name: 'longitude',
    description: 'User longitude for location-based store filtering',
    required: false,
    type: Number,
    example: -123.1207,
  })
  @ApiQuery({
    name: 'maxDistance',
    description:
      'Maximum distance in kilometers for nearby stores (default: 10km)',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Product found with store and price information',
    type: EnhancedProductResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - invalid parameters (product ID, location coordinates, store ID format)',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid product ID provided' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Product with barcode 0123456789012 not found',
        },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async getProductByBarcodeEnhanced(
    @Param('barcode') barcode: string,
    @Query('type') barcodeType?: BarcodeType,
    @Query('storeSk') storeSk?: string,
    @Query('latitude') latitude?: number,
    @Query('longitude') longitude?: number,
    @Query('maxDistance') maxDistance?: number,
  ): Promise<EnhancedProductResponseDto> {
    return this.barcodeService.getProductByBarcodeEnhanced(
      barcode,
      barcodeType,
      storeSk,
      latitude,
      longitude,
      maxDistance || 10, // Default to 10km radius
    );
  }

  @Post(':barcode/price')
  // TODO: Add @UseGuards(JwtAuthGuard) when JWT authentication is implemented
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add store and price information to existing product',
    description:
      "Allows users to contribute price and store information for a product they found by scanning its barcode. The store will be created if it doesn't exist, or matched to an existing store if found.",
  })
  @ApiParam({
    name: 'barcode',
    description: 'The barcode string of the product',
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
    status: 201,
    description: 'Successfully added price and store information',
    type: AddProductPriceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid barcode or price data',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Invalid barcode provided',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Product with barcode 0123456789012 not found',
        },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async addProductPrice(
    @Param('barcode') barcode: string,
    @Query('type') barcodeType?: BarcodeType,
    @Body() addPriceData?: AddProductPriceDto,
  ): Promise<AddProductPriceResponseDto> {
    return this.barcodeService.addProductPrice(
      barcode,
      barcodeType,
      addPriceData!,
    );
  }
}
