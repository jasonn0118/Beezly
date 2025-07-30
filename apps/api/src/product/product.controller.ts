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
import {
  EmbeddingSearchRequestDto,
  EmbeddingSearchResponseDto,
  EmbeddingSearchResultDto,
  BatchEmbeddingSearchRequestDto,
  BatchEmbeddingSearchResponseDto,
  BatchEmbeddingSearchResultDto,
} from './dto/embedding-search.dto';
import { VectorEmbeddingService } from './vector-embedding.service';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly vectorEmbeddingService: VectorEmbeddingService,
  ) {}

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

  @Post('search/embedding')
  @ApiOperation({
    summary: 'Search for similar products using embedding-based similarity',
    description:
      'Uses vector embeddings to find products with similar names within a specific store. This is particularly useful for matching receipt items to normalized product names.',
  })
  @ApiResponse({
    status: 200,
    description: 'Similar products found',
    type: EmbeddingSearchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  async searchByEmbedding(
    @Body() searchRequest: EmbeddingSearchRequestDto,
  ): Promise<EmbeddingSearchResponseDto> {
    const startTime = Date.now();

    const results =
      await this.vectorEmbeddingService.findSimilarProductsEnhanced({
        queryText: searchRequest.query,
        merchant: searchRequest.merchant,
        similarityThreshold: searchRequest.similarityThreshold || 0.85,
        limit: searchRequest.limit || 5,
        includeDiscounts: searchRequest.includeDiscounts || false,
        includeAdjustments: searchRequest.includeAdjustments || false,
      });

    const searchResults = results.map((result) => ({
      productId: result.productId,
      similarity: result.similarity,
      rawName: result.normalizedProduct.rawName,
      normalizedName: result.normalizedProduct.normalizedName,
      brand: result.normalizedProduct.brand,
      category: result.normalizedProduct.category,
      confidenceScore: result.normalizedProduct.confidenceScore,
      matchCount: result.normalizedProduct.matchCount,
      lastMatchedAt: result.normalizedProduct.lastMatchedAt,
    }));

    const searchTimeMs = Date.now() - startTime;

    return {
      results: searchResults,
      totalCount: searchResults.length,
      query: searchRequest.query,
      merchant: searchRequest.merchant,
      searchTimeMs,
    };
  }

  @Post('search/embedding/batch')
  @ApiOperation({
    summary: 'Batch search for similar products using embeddings',
    description:
      'Search for multiple products at once using vector embeddings. Useful for processing entire receipts.',
  })
  @ApiResponse({
    status: 200,
    description: 'Batch search results',
    type: BatchEmbeddingSearchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  async batchSearchByEmbedding(
    @Body() batchRequest: BatchEmbeddingSearchRequestDto,
  ): Promise<BatchEmbeddingSearchResponseDto> {
    const startTime = Date.now();
    const results = [] as BatchEmbeddingSearchResultDto[];
    let queriesWithMatches = 0;

    // Process each query
    for (const query of batchRequest.queries) {
      const matches =
        await this.vectorEmbeddingService.findSimilarProductsEnhanced({
          queryText: query,
          merchant: batchRequest.merchant,
          similarityThreshold: batchRequest.similarityThreshold || 0.85,
          limit: batchRequest.limitPerQuery || 3,
          includeDiscounts: false,
          includeAdjustments: false,
        });

      const searchResults: EmbeddingSearchResultDto[] = matches.map(
        (result) => ({
          productId: result.productId,
          similarity: result.similarity,
          rawName: result.normalizedProduct.rawName,
          normalizedName: result.normalizedProduct.normalizedName,
          brand: result.normalizedProduct.brand,
          category: result.normalizedProduct.category,
          confidenceScore: result.normalizedProduct.confidenceScore,
          matchCount: result.normalizedProduct.matchCount,
          lastMatchedAt: result.normalizedProduct.lastMatchedAt,
        }),
      );

      const hasMatches = searchResults.length > 0;
      if (hasMatches) {
        queriesWithMatches++;
      }

      const batchResult: BatchEmbeddingSearchResultDto = {
        query,
        matches: searchResults,
        hasMatches,
      };
      results.push(batchResult);
    }

    const totalSearchTimeMs = Date.now() - startTime;

    return {
      results: results,
      totalQueries: batchRequest.queries.length,
      queriesWithMatches,
      merchant: batchRequest.merchant,
      totalSearchTimeMs,
    };
  }

  @Post('embeddings/update')
  @ApiOperation({
    summary: 'Update embeddings for products without them',
    description:
      "Batch process to generate and store embeddings for normalized products that don't have them yet.",
  })
  @ApiQuery({
    name: 'batchSize',
    description: 'Number of products to process in this batch',
    required: false,
    type: Number,
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'Embedding update results',
    schema: {
      properties: {
        updatedCount: { type: 'number', example: 45 },
        batchSize: { type: 'number', example: 50 },
        message: {
          type: 'string',
          example: 'Successfully updated 45 product embeddings',
        },
      },
    },
  })
  async updateProductEmbeddings(
    @Query('batchSize') batchSize?: number,
  ): Promise<{ updatedCount: number; batchSize: number; message: string }> {
    const size = batchSize && batchSize > 0 ? Math.min(batchSize, 100) : 50;
    const updatedCount =
      await this.vectorEmbeddingService.batchUpdateEmbeddings(size);

    return {
      updatedCount,
      batchSize: size,
      message: `Successfully updated ${updatedCount} product embeddings`,
    };
  }

  @Get('embeddings/stats')
  @ApiOperation({
    summary: 'Get embedding statistics',
    description:
      'Get statistics about product embeddings including coverage and dimensions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Embedding statistics',
    schema: {
      properties: {
        totalProducts: { type: 'number', example: 1000 },
        productsWithEmbeddings: { type: 'number', example: 850 },
        productsWithoutEmbeddings: { type: 'number', example: 150 },
        averageEmbeddingLength: { type: 'number', example: 1536 },
        coveragePercentage: { type: 'number', example: 85.0 },
      },
    },
  })
  async getEmbeddingStats(): Promise<{
    totalProducts: number;
    productsWithEmbeddings: number;
    productsWithoutEmbeddings: number;
    averageEmbeddingLength: number;
    coveragePercentage: number;
  }> {
    const stats = await this.vectorEmbeddingService.getEmbeddingStats();
    const coveragePercentage =
      stats.totalProducts > 0
        ? (stats.productsWithEmbeddings / stats.totalProducts) * 100
        : 0;

    return {
      ...stats,
      coveragePercentage: Math.round(coveragePercentage * 100) / 100,
    };
  }
}
