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
import { ProductLinkingService } from './product-linking.service';
import { ReceiptPriceIntegrationService } from './receipt-price-integration.service';
import { UnmatchedProductService } from './unmatched-product.service';
import {
  ProductConfirmationService,
  ConfirmationItem,
} from './product-confirmation.service';
import {
  UnprocessedProductService,
  BulkReviewAction,
} from './unprocessed-product.service';
import {
  UnprocessedProductStatus,
  UnprocessedProductReason,
} from '../entities/unprocessed-product.entity';
import { Product } from '../entities/product.entity';
import { ProductSelectionService } from './product-selection.service';
import {
  ProductSelectionRequestDto,
  ProductSelectionResponseDto,
  UserProductSelectionDto,
  UserProductSelectionResponseDto,
  BulkProductSelectionDto,
  BulkProductSelectionResponseDto,
} from './dto/product-selection.dto';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.8;
  constructor(
    private readonly productService: ProductService,
    private readonly vectorEmbeddingService: VectorEmbeddingService,
    private readonly productLinkingService: ProductLinkingService,
    private readonly receiptPriceIntegrationService: ReceiptPriceIntegrationService,
    private readonly unmatchedProductService: UnmatchedProductService,
    private readonly productConfirmationService: ProductConfirmationService,
    private readonly unprocessedProductService: UnprocessedProductService,
    private readonly productSelectionService: ProductSelectionService,
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

  // Product Linking Endpoints

  @Post('link-receipt-products')
  @ApiOperation({
    summary: 'Link normalized receipt products to catalog products',
    description:
      'Batch process to link high-confidence normalized products (≥0.80) with existing catalog products using barcode, embedding, and name matching.',
  })
  @ApiQuery({
    name: 'confidenceThreshold',
    description: 'Minimum confidence score for linking (default: 0.80)',
    required: false,
    type: Number,
    example: 0.8,
  })
  @ApiQuery({
    name: 'dryRun',
    description: 'Preview results without saving changes',
    required: false,
    type: Boolean,
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Product linking results',
    schema: {
      properties: {
        processed: { type: 'number', example: 150 },
        linked: { type: 'number', example: 120 },
        skipped: { type: 'number', example: 25 },
        errors: { type: 'number', example: 5 },
      },
    },
  })
  async linkReceiptProducts(
    @Query('confidenceThreshold') confidenceThreshold?: number,
    @Query('dryRun') dryRun?: boolean,
  ) {
    // Ensure confidence threshold is never below the minimum threshold
    const validConfidenceThreshold = Math.max(
      confidenceThreshold || this.MIN_CONFIDENCE_THRESHOLD,
      this.MIN_CONFIDENCE_THRESHOLD,
    );

    return this.productLinkingService.linkNormalizedProducts({
      confidenceThreshold: validConfidenceThreshold,
      dryRun: dryRun || false,
    });
  }

  @Get('linking/stats')
  @ApiOperation({
    summary: 'Get product linking statistics',
    description:
      'Get statistics about normalized product linking coverage and performance.',
  })
  @ApiResponse({
    status: 200,
    description: 'Product linking statistics',
    schema: {
      properties: {
        totalNormalizedProducts: { type: 'number', example: 1000 },
        highConfidenceProducts: { type: 'number', example: 800 },
        linkedProducts: { type: 'number', example: 600 },
        unlinkeds: { type: 'number', example: 200 },
        linkingCoverage: { type: 'number', example: 75.0 },
      },
    },
  })
  async getLinkingStats() {
    return this.productLinkingService.getLinkingStatistics();
  }

  @Get('unlinked')
  @ApiOperation({
    summary: 'Get unlinked high-confidence products',
    description:
      'Get normalized products with confidence ≥0.80 that are not yet linked to catalog products.',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of products to return',
    required: false,
    type: Number,
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Number of products to skip',
    required: false,
    type: Number,
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'List of unlinked high-confidence products',
    type: [Object],
  })
  async getUnlinkedProducts(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.productLinkingService.getUnlinkedHighConfidenceProducts(
      limit || 50,
      offset || 0,
    );
  }

  @Post('sync-receipt-prices')
  @ApiOperation({
    summary: 'Sync receipt prices to Price entities',
    description:
      'Extract pricing data from linked normalized products and create Price entities for historical tracking.',
  })
  @ApiResponse({
    status: 200,
    description: 'Price synchronization results',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        pricesSynced: { type: 'number', example: 250 },
        discountsProcessed: { type: 'number', example: 45 },
        errors: { type: 'number', example: 3 },
        errorMessages: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async syncReceiptPrices() {
    return this.receiptPriceIntegrationService.syncReceiptPrices();
  }

  @Get('price-sync/stats')
  @ApiOperation({
    summary: 'Get price synchronization statistics',
    description: 'Get statistics about receipt price synchronization coverage.',
  })
  @ApiResponse({
    status: 200,
    description: 'Price sync statistics',
    schema: {
      properties: {
        linkedProductsCount: { type: 'number', example: 600 },
        syncedPricesCount: { type: 'number', example: 500 },
        pendingSyncCount: { type: 'number', example: 100 },
        totalReceiptItemsProcessed: { type: 'number', example: 1200 },
      },
    },
  })
  async getPriceSyncStats() {
    return this.receiptPriceIntegrationService.getPriceSyncStatistics();
  }

  // Unmatched Product Management Endpoints

  @Get('unmatched/candidates')
  @ApiOperation({
    summary: 'Get unmatched product candidates for review',
    description:
      'Get high-confidence normalized products that could be used to create new catalog products.',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of candidates to return',
    required: false,
    type: Number,
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Number of candidates to skip',
    required: false,
    type: Number,
    example: 0,
  })
  @ApiQuery({
    name: 'minConfidence',
    description: 'Minimum confidence score (default: 0.80)',
    required: false,
    type: Number,
    example: 0.8,
  })
  @ApiResponse({
    status: 200,
    description: 'List of unmatched product candidates',
    type: [Object],
  })
  async getUnmatchedCandidates(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('minConfidence') minConfidence?: number,
  ) {
    // Ensure minimum confidence is never below the minimum threshold
    const validMinConfidence = Math.max(
      minConfidence || this.MIN_CONFIDENCE_THRESHOLD,
      this.MIN_CONFIDENCE_THRESHOLD,
    );

    return this.unmatchedProductService.getUnmatchedProductCandidates(
      limit || 50,
      offset || 0,
      validMinConfidence,
    );
  }

  @Get('unmatched/suggestions')
  @ApiOperation({
    summary: 'Generate product creation suggestions',
    description:
      'Analyze unmatched products and generate intelligent suggestions for creating new catalog products.',
  })
  @ApiQuery({
    name: 'minOccurrences',
    description: 'Minimum number of occurrences to suggest a product',
    required: false,
    type: Number,
    example: 3,
  })
  @ApiResponse({
    status: 200,
    description: 'List of product creation suggestions',
    type: [Object],
  })
  async getProductCreationSuggestions(
    @Query('minOccurrences') minOccurrences?: number,
  ) {
    return this.unmatchedProductService.generateProductCreationSuggestions(
      minOccurrences || 3,
      0.8,
    );
  }

  @Post('create-from-unmatched/:normalizedProductSk')
  @ApiOperation({
    summary: 'Create product from unmatched normalized product',
    description:
      'Create a new catalog product from a high-confidence unmatched normalized product.',
  })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Normalized product not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Product already linked or invalid data',
  })
  async createProductFromUnmatched(
    @Param('normalizedProductSk') normalizedProductSk: string,
    @Body() overrides?: Partial<Product>,
  ) {
    return this.unmatchedProductService.createProductFromUnmatched(
      normalizedProductSk,
      overrides,
    );
  }

  @Get('unmatched/stats')
  @ApiOperation({
    summary: 'Get unmatched product review queue statistics',
    description:
      'Get comprehensive statistics about unmatched products requiring review.',
  })
  @ApiResponse({
    status: 200,
    description: 'Review queue statistics',
    schema: {
      properties: {
        totalUnmatched: { type: 'number', example: 400 },
        highConfidenceUnmatched: { type: 'number', example: 200 },
        pendingReview: { type: 'number', example: 150 },
        averageConfidenceScore: { type: 'number', example: 0.72 },
        topCategories: { type: 'array', items: { type: 'object' } },
        topBrands: { type: 'array', items: { type: 'object' } },
        topMerchants: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  async getUnmatchedStats() {
    return this.unmatchedProductService.getReviewQueueStats();
  }

  @Post('bulk-create-from-suggestions')
  @ApiOperation({
    summary: 'Bulk create products from suggestions',
    description:
      'Create multiple catalog products from a list of unmatched normalized product suggestions.',
  })
  @ApiBody({
    description: 'List of normalized product SKs to create products from',
    schema: {
      properties: {
        normalizedProductSks: {
          type: 'array',
          items: { type: 'string' },
          example: ['uuid1', 'uuid2', 'uuid3'],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk creation results',
    schema: {
      properties: {
        created: { type: 'number', example: 8 },
        errors: { type: 'number', example: 2 },
        errorMessages: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async bulkCreateFromSuggestions(
    @Body() body: { normalizedProductSks: string[] },
  ) {
    return this.unmatchedProductService.bulkCreateProductsFromSuggestions(
      body.normalizedProductSks,
    );
  }

  // Product Confirmation Endpoints (Mobile Frontend Integration)

  @Get('confirmation/candidates')
  @ApiOperation({
    summary: 'Get normalized products ready for user confirmation',
    description:
      'Get high-confidence normalized products that are ready for user review and confirmation before linking.',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of candidates to return',
    required: false,
    type: Number,
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Number of candidates to skip',
    required: false,
    type: Number,
    example: 0,
  })
  @ApiQuery({
    name: 'userId',
    description: 'User ID for personalized results',
    required: false,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'List of normalized products ready for confirmation',
    schema: {
      properties: {
        items: { type: 'array', items: { type: 'object' } },
        totalCount: { type: 'number', example: 150 },
      },
    },
  })
  async getConfirmationCandidates(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('userId') userId?: string,
  ) {
    return this.productConfirmationService.getConfirmationCandidates(
      userId,
      limit || 50,
      offset || 0,
    );
  }

  @Post('confirmation/confirm')
  @ApiOperation({
    summary: 'Confirm normalized products and link to catalog',
    description:
      'Called by mobile frontend when user confirms/edits normalized products. Attempts to link confirmed items to catalog products.',
  })
  @ApiBody({
    description:
      'List of confirmed normalized products with optional user edits',
    schema: {
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              normalizedProductSk: { type: 'string', format: 'uuid' },
              normalizedName: {
                type: 'string',
                description: 'User-edited name (optional)',
              },
              brand: {
                type: 'string',
                description: 'User-edited brand (optional)',
              },
              isConfirmed: {
                type: 'boolean',
                description: 'Whether user confirmed this item',
              },
            },
            required: ['normalizedProductSk', 'isConfirmed'],
          },
        },
        userId: {
          type: 'string',
          format: 'uuid',
          description: 'User ID (optional)',
        },
      },
      required: ['items'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Confirmation and linking results',
    schema: {
      properties: {
        success: { type: 'boolean' },
        processed: { type: 'number', example: 20 },
        linked: { type: 'number', example: 15 },
        unprocessed: { type: 'number', example: 5 },
        errors: { type: 'number', example: 0 },
        errorMessages: { type: 'array', items: { type: 'string' } },
        linkedProducts: { type: 'array', items: { type: 'object' } },
        unprocessedProducts: { type: 'array', items: { type: 'object' } },
        pendingSelectionProducts: {
          type: 'array',
          description:
            'Products from current receipt that require user selection',
          items: {
            type: 'object',
            properties: {
              normalizedProduct: {
                type: 'object',
                properties: {
                  normalizedProductSk: { type: 'string', format: 'uuid' },
                  rawName: { type: 'string', example: 'KS GRK YOG' },
                  normalizedName: { type: 'string', example: 'Greek Yogurt' },
                  brand: { type: 'string', example: 'Kirkland Signature' },
                  category: { type: 'string', example: 'Dairy' },
                  merchant: { type: 'string', example: 'Costco' },
                  confidenceScore: { type: 'number', example: 0.92 },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
              matchCount: { type: 'number', example: 3 },
              topMatches: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    productSk: { type: 'string', format: 'uuid' },
                    name: { type: 'string', example: 'Greek Yogurt' },
                    brandName: {
                      type: 'string',
                      example: 'Kirkland Signature',
                    },
                    barcode: { type: 'string', example: '1234567890123' },
                    score: { type: 'number', example: 0.85 },
                    method: { type: 'string', example: 'name_similarity' },
                    imageUrl: {
                      type: 'string',
                      example: 'https://example.com/image.jpg',
                    },
                    description: { type: 'string', example: 'Category: Dairy' },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  async confirmNormalizedProducts(
    @Body() body: { items: ConfirmationItem[]; userId?: string },
  ) {
    return this.productConfirmationService.confirmNormalizedProducts(
      body.items,
      body.userId,
    );
  }

  @Get('confirmation/stats')
  @ApiOperation({
    summary: 'Get product confirmation statistics',
    description:
      'Get statistics about products pending confirmation and processing status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Confirmation statistics',
    schema: {
      properties: {
        pendingConfirmation: { type: 'number', example: 150 },
        totalLinked: { type: 'number', example: 850 },
        totalUnprocessed: { type: 'number', example: 75 },
        averageConfidenceScore: { type: 'number', example: 0.85 },
      },
    },
  })
  async getConfirmationStats() {
    return this.productConfirmationService.getConfirmationStats();
  }

  // Unprocessed Product Management Endpoints

  @Get('unprocessed/review')
  @ApiOperation({
    summary: 'Get unprocessed products for review',
    description:
      'Get products that could not be matched and need manual review. These are candidates for creating new catalog products.',
  })
  @ApiQuery({
    name: 'status',
    description: 'Filter by status',
    required: false,
    enum: UnprocessedProductStatus,
  })
  @ApiQuery({
    name: 'reason',
    description: 'Filter by reason',
    required: false,
    enum: UnprocessedProductReason,
  })
  @ApiQuery({
    name: 'merchant',
    description: 'Filter by merchant',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'minPriorityScore',
    description: 'Minimum priority score',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of items to return',
    required: false,
    type: Number,
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Number of items to skip',
    required: false,
    type: Number,
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'List of unprocessed products for review',
    schema: {
      properties: {
        items: { type: 'array', items: { type: 'object' } },
        totalCount: { type: 'number', example: 150 },
      },
    },
  })
  async getUnprocessedProductsForReview(
    @Query('status') status?: UnprocessedProductStatus,
    @Query('reason') reason?: UnprocessedProductReason,
    @Query('merchant') merchant?: string,
    @Query('minPriorityScore') minPriorityScore?: number,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.unprocessedProductService.getUnprocessedProductsForReview(
      status,
      reason,
      merchant,
      minPriorityScore,
      limit || 50,
      offset || 0,
    );
  }

  @Get('unprocessed/stats')
  @ApiOperation({
    summary: 'Get unprocessed product statistics',
    description:
      'Get comprehensive statistics about unprocessed products and review queue.',
  })
  @ApiResponse({
    status: 200,
    description: 'Unprocessed product statistics',
    schema: {
      properties: {
        totalUnprocessed: { type: 'number', example: 400 },
        pendingReview: { type: 'number', example: 300 },
        underReview: { type: 'number', example: 50 },
        approvedForCreation: { type: 'number', example: 30 },
        rejected: { type: 'number', example: 15 },
        processed: { type: 'number', example: 5 },
        averagePriorityScore: { type: 'number', example: 3.2 },
        topReasons: { type: 'array', items: { type: 'object' } },
        topMerchants: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  async getUnprocessedProductStats() {
    return this.unprocessedProductService.getUnprocessedProductStats();
  }

  @Get('unprocessed/high-priority')
  @ApiOperation({
    summary: 'Get high-priority unprocessed products',
    description:
      'Get unprocessed products with high priority scores that need immediate attention.',
  })
  @ApiQuery({
    name: 'minPriorityScore',
    description: 'Minimum priority score threshold',
    required: false,
    type: Number,
    example: 5.0,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of items to return',
    required: false,
    type: Number,
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'List of high-priority unprocessed products',
    type: [Object],
  })
  async getHighPriorityUnprocessedProducts(
    @Query('minPriorityScore') minPriorityScore?: number,
    @Query('limit') limit?: number,
  ) {
    return this.unprocessedProductService.getHighPriorityUnprocessedProducts(
      minPriorityScore || 5.0,
      limit || 20,
    );
  }

  @Put('unprocessed/:unprocessedProductSk/status')
  @ApiOperation({
    summary: 'Update unprocessed product status',
    description: 'Update the review status of an unprocessed product.',
  })
  @ApiBody({
    description: 'Status update information',
    schema: {
      properties: {
        status: { enum: Object.values(UnprocessedProductStatus) },
        reviewNotes: { type: 'string', description: 'Optional review notes' },
        reviewerId: {
          type: 'string',
          format: 'uuid',
          description: 'ID of the reviewer',
        },
      },
      required: ['status'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Updated unprocessed product',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Unprocessed product not found',
  })
  async updateUnprocessedProductStatus(
    @Param('unprocessedProductSk') unprocessedProductSk: string,
    @Body()
    body: {
      status: UnprocessedProductStatus;
      reviewNotes?: string;
      reviewerId?: string;
    },
  ) {
    return this.unprocessedProductService.updateUnprocessedProductStatus(
      unprocessedProductSk,
      body.status,
      body.reviewNotes,
      body.reviewerId,
    );
  }

  @Post('unprocessed/:unprocessedProductSk/create-product')
  @ApiOperation({
    summary: 'Create product from unprocessed product',
    description:
      'Create a new catalog product from an unprocessed product entry.',
  })
  @ApiBody({
    description: 'Product creation options',
    schema: {
      properties: {
        reviewerId: {
          type: 'string',
          format: 'uuid',
          description: 'ID of the reviewer',
        },
        productOverrides: {
          type: 'object',
          description: 'Optional product field overrides',
          properties: {
            name: { type: 'string' },
            brandName: { type: 'string' },
            barcode: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    schema: {
      properties: {
        product: { type: 'object', description: 'Created product' },
        unprocessedProduct: {
          type: 'object',
          description: 'Updated unprocessed product',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Unprocessed product not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Product creation failed',
  })
  async createProductFromUnprocessedProduct(
    @Param('unprocessedProductSk') unprocessedProductSk: string,
    @Body()
    body: {
      reviewerId?: string;
      productOverrides?: Partial<Product>;
    },
  ) {
    return this.unprocessedProductService.createProductFromUnprocessedProduct(
      unprocessedProductSk,
      body.reviewerId,
      body.productOverrides,
    );
  }

  @Post('unprocessed/bulk-review')
  @ApiOperation({
    summary: 'Perform bulk review actions',
    description:
      'Perform review actions on multiple unprocessed products at once.',
  })
  @ApiBody({
    description: 'Bulk review action',
    schema: {
      properties: {
        unprocessedProductSks: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          description: 'List of unprocessed product SKs',
        },
        action: {
          type: 'string',
          enum: ['approve', 'reject', 'create_product'],
          description: 'Action to perform',
        },
        reviewNotes: { type: 'string', description: 'Optional review notes' },
        reviewerId: {
          type: 'string',
          format: 'uuid',
          description: 'ID of the reviewer',
        },
      },
      required: ['unprocessedProductSks', 'action'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk review results',
    schema: {
      properties: {
        success: { type: 'boolean' },
        processed: { type: 'number', example: 10 },
        approved: { type: 'number', example: 7 },
        rejected: { type: 'number', example: 2 },
        created: { type: 'number', example: 1 },
        errors: { type: 'number', example: 0 },
        errorMessages: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async performBulkReviewAction(@Body() bulkAction: BulkReviewAction) {
    return this.unprocessedProductService.performBulkReviewAction(bulkAction);
  }

  @Delete('unprocessed/cleanup')
  @ApiOperation({
    summary: 'Cleanup processed unprocessed products',
    description:
      'Delete old processed or rejected unprocessed products for database cleanup.',
  })
  @ApiQuery({
    name: 'olderThanDays',
    description: 'Delete records older than this many days',
    required: false,
    type: Number,
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'Cleanup results',
    schema: {
      properties: {
        deletedCount: { type: 'number', example: 150 },
      },
    },
  })
  async cleanupProcessedUnprocessedProducts(
    @Query('olderThanDays') olderThanDays?: number,
  ) {
    return this.unprocessedProductService.cleanupProcessedUnprocessedProducts(
      olderThanDays || 30,
    );
  }

  // Product Selection Endpoints (User Choice for Multiple Matches)

  @Post('selection/options')
  @ApiOperation({
    summary: 'Get product selection options for user choice',
    description:
      'When a normalized product has multiple potential catalog product matches, ' +
      'this endpoint returns all options for the user to choose from. Typically used ' +
      'when 2 or more products match the same normalized_name and brand.',
  })
  @ApiResponse({
    status: 200,
    description: 'Product selection options with matching candidates',
    type: ProductSelectionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Normalized product not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Product already linked or invalid request',
  })
  async getProductSelectionOptions(
    @Body() request: ProductSelectionRequestDto,
  ): Promise<ProductSelectionResponseDto> {
    return this.productSelectionService.getProductSelectionOptions(request);
  }

  @Post('selection/confirm')
  @ApiOperation({
    summary: 'Process user product selection',
    description:
      "Process the user's selection when they choose which catalog product " +
      'should be linked to a normalized product. Creates the final product link.',
  })
  @ApiResponse({
    status: 200,
    description: 'User selection processed and product linked',
    type: UserProductSelectionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid selection or product already linked',
  })
  async processUserSelection(
    @Body() selection: UserProductSelectionDto,
  ): Promise<UserProductSelectionResponseDto> {
    return this.productSelectionService.processUserSelection(selection);
  }

  @Post('selection/bulk-confirm')
  @ApiOperation({
    summary: 'Process multiple user selections in batch',
    description:
      'Process multiple user product selections at once. Useful for mobile apps ' +
      'where users might confirm multiple product matches in a single session.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk user selections processed',
    type: BulkProductSelectionResponseDto,
  })
  async processBulkUserSelections(
    @Body() bulkRequest: BulkProductSelectionDto,
  ): Promise<BulkProductSelectionResponseDto> {
    return this.productSelectionService.processBulkUserSelections(bulkRequest);
  }

  @Get('selection/pending')
  @ApiOperation({
    summary: 'Get products requiring user selection',
    description:
      'Get normalized products that have multiple catalog product matches ' +
      'and require user selection to resolve ambiguity. These are products ' +
      'where automated linking found 2 or more potential matches.',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of products to return',
    required: false,
    type: Number,
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Number of products to skip',
    required: false,
    type: Number,
    example: 0,
  })
  @ApiQuery({
    name: 'minConfidenceScore',
    description: 'Minimum confidence score for candidates',
    required: false,
    type: Number,
    example: 0.8,
  })
  @ApiResponse({
    status: 200,
    description: 'List of products requiring user selection',
    schema: {
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              normalizedProduct: { type: 'object' },
              matchCount: { type: 'number', example: 3 },
              topMatches: { type: 'array', items: { type: 'object' } },
            },
          },
        },
        totalCount: { type: 'number', example: 25 },
      },
    },
  })
  async getProductsRequiringSelection(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('minConfidenceScore') minConfidenceScore?: number,
  ) {
    // Ensure minimum confidence is never below the minimum threshold
    const validMinConfidence = Math.max(
      minConfidenceScore || this.MIN_CONFIDENCE_THRESHOLD,
      this.MIN_CONFIDENCE_THRESHOLD,
    );

    return this.productSelectionService.getProductsRequiringSelection(
      limit || 50,
      offset || 0,
      validMinConfidence,
    );
  }
}
