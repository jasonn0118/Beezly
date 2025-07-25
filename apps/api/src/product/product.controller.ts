import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductService } from './product.service';
import { NormalizedProductDTO } from '../../../packages/types/dto/product';
import {
  MobileProductCreateDto,
  MobileProductResponseDto,
} from './dto/mobile-product-create.dto';
import { ProductSearchResponseDto } from './dto/product-search-response.dto';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({
    status: 200,
    description: 'List of all products',
    type: [NormalizedProductDTO],
  })
  async getAllProducts(): Promise<NormalizedProductDTO[]> {
    return this.productService.getAllProducts();
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search products by name and/or brand name (fuzzy matching)',
  })
  @ApiQuery({
    name: 'q',
    description: 'Search query for product name or brand name',
    required: true,
    example: 'apple',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of results to return (max: 100)',
    required: false,
    type: Number,
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'List of products matching the search query',
    type: [ProductSearchResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - missing or empty query parameter',
  })
  async searchProducts(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ): Promise<ProductSearchResponseDto[]> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query parameter "q" is required');
    }

    const searchLimit = limit && limit > 0 ? Math.min(limit, 100) : 50;
    return this.productService.searchProductsByNameAndBrand(
      query.trim(),
      searchLimit,
    );
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Get a product by barcode' })
  @ApiResponse({
    status: 200,
    description: 'Product found by barcode',
    type: NormalizedProductDTO,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async getProductByBarcode(
    @Param('barcode') barcode: string,
  ): Promise<NormalizedProductDTO> {
    const product = await this.productService.getProductByBarcode(barcode);

    if (!product) {
      throw new NotFoundException(`Product with barcode ${barcode} not found`);
    }

    return product;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiResponse({
    status: 200,
    description: 'Product found by ID',
    type: NormalizedProductDTO,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async getProductById(
    @Param('id') id: string,
  ): Promise<NormalizedProductDTO | null> {
    return this.productService.getProductById(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new product with image, store, and price',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Product data with image file',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Organic Apple' },
        barcode: { type: 'string', example: '1234567890123' },
        barcodeType: {
          type: 'string',
          example: 'ean13',
          description: 'Type of barcode (optional)',
          enum: [
            'code39',
            'ean8',
            'ean13',
            'codabar',
            'itf14',
            'code128',
            'upc_a',
            'upc_e',
          ],
        },
        category: { type: 'number', example: 101001 },
        storeName: { type: 'string', example: 'Homeplus' },
        storeAddress: { type: 'string', example: '123 Main St, Seoul' },
        price: { type: 'number', example: 5000 },
        brandName: { type: 'string', example: 'Cheil Jedang' },
        storeCity: { type: 'string', example: 'Seoul' },
        storeProvince: {
          type: 'string',
          example: 'Seoul',
        },
        storePostalCode: {
          type: 'string',
          example: '12345',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Product image file',
        },
      },
      required: [
        'name',
        'barcode',
        'category',
        'storeName',
        'storeAddress',
        'price',
        'image',
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Product successfully created with store and price info',
    type: MobileProductResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or missing image file',
  })
  @UseInterceptors(FileInterceptor('image'))
  async createProduct(
    @Body() productData: MobileProductCreateDto,
    @UploadedFile() imageFile: Express.Multer.File,
  ): Promise<MobileProductResponseDto> {
    if (!imageFile) {
      throw new BadRequestException('Image file is required');
    }

    // Convert Express.Multer.File to Buffer
    const imageBuffer = imageFile.buffer;

    return this.productService.createProductWithPriceAndStore(
      productData,
      imageBuffer,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a product by ID' })
  @ApiResponse({
    status: 200,
    description: 'Product successfully updated',
    type: NormalizedProductDTO,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async updateProduct(
    @Param('id') id: string,
    @Body() productData: Partial<NormalizedProductDTO>,
  ): Promise<NormalizedProductDTO> {
    return this.productService.updateProduct(id, productData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product by ID' })
  @ApiResponse({
    status: 200,
    description: 'Product successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async deleteProduct(@Param('id') id: string): Promise<{ message: string }> {
    await this.productService.deleteProduct(id);
    return { message: 'Product deleted successfully' };
  }
}
