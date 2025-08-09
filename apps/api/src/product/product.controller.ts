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
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProductService } from './product.service';
import { NormalizedProductDTO } from '../../../packages/types/dto/product';
import { ProductCreateDto, ProductResponseDto } from './dto/product-create.dto';
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
import { ProductConfirmationService } from './product-confirmation.service';
import { EnhancedReceiptLinkingService } from './enhanced-receipt-linking.service';
import { ReceiptWorkflowIntegrationService } from './receipt-workflow-integration.service';
import { EnhancedProductResponseDto } from '../barcode/dto/enhanced-product-response.dto';
import {
  AddProductPriceDto,
  AddProductPriceResponseDto,
} from '../barcode/dto/add-product-price.dto';
import {
  ProcessReceiptConfirmationDto,
  ReceiptConfirmationResponseDto,
  GetConfirmationCandidatesResponseDto,
  ConfirmationStatsResponseDto,
  ReceiptPendingSelectionsResponseDto,
  ProcessReceiptSelectionsDto,
  ReceiptSelectionsResponseDto,
} from './dto/receipt-confirmation.dto';
import {
  UnprocessedProductService,
  BulkReviewAction,
} from './unprocessed-product.service';
import {
  UnprocessedProductStatus,
  UnprocessedProductReason,
} from '../entities/unprocessed-product.entity';
import { Product } from '../entities/product.entity';
import { GameScoreService } from '../gamification/game-score.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserProfileDTO } from '../../../packages/types/dto/user';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly vectorEmbeddingService: VectorEmbeddingService,
    private readonly productLinkingService: ProductLinkingService,
    private readonly receiptPriceIntegrationService: ReceiptPriceIntegrationService,
    private readonly productConfirmationService: ProductConfirmationService,
    private readonly enhancedReceiptLinkingService: EnhancedReceiptLinkingService,
    private readonly receiptWorkflowIntegrationService: ReceiptWorkflowIntegrationService,
    private readonly unprocessedProductService: UnprocessedProductService,
    private readonly gameScoreService: GameScoreService,
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
    summary: 'Create a new product with optional image and store linking',
    description: `
      **Unified Product Creation Endpoint**
      
      Creates a new product with flexible store linking options. Supports multiple scenarios:
      
      🖼️ **Image Upload**: Optional image file upload
      🏪 **Store Selection**: Choose from three options:
      - **No Store**: Create product without store linkage
      - **Existing Store**: Link to existing database store using 'storeSk'
      - **Google Places Store**: Create new store from Google Places data using 'googlePlacesStore'
      
      💰 **Price Information**: Optional price and currency data
      
      **Note**: Either 'storeSk' OR 'googlePlacesStore' can be provided, not both.
    `,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Product data with optional image and store selection',
    schema: {
      type: 'object',
      properties: {
        // Core product fields
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
        brandName: {
          type: 'string',
          example: 'Cheil Jedang',
          description: 'Brand name (optional)',
        },

        // Price information
        price: {
          type: 'number',
          example: 5000,
          description: 'Product price at selected store (optional)',
        },
        currency: {
          type: 'string',
          example: 'CAD',
          description: 'Currency code (default: CAD)',
        },

        // Store selection (choose ONE)
        storeSk: {
          type: 'string',
          format: 'uuid',
          example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          description:
            'Existing store UUID (use if user selected database store)',
        },
        googlePlacesStore: {
          type: 'object',
          description:
            'Google Places store data (use if user selected Google Places result) - matches store search response format',
          properties: {
            place_id: {
              type: 'string',
              example: 'ChIJ_xkgOm5xhlQRzCy7fF5HHqY',
            },
            name: { type: 'string', example: 'Save-On-Foods' },
            formatted_address: {
              type: 'string',
              example: '1234 Main St, Vancouver, BC V6B 2L2, Canada',
            },
            streetNumber: { type: 'string', example: '1766' },
            road: { type: 'string', example: 'Robson St' },
            streetAddress: { type: 'string', example: '1766 Robson St' },
            fullAddress: {
              type: 'string',
              example: '1234 Main St, Vancouver, BC V6B 2L2, Canada',
            },
            city: { type: 'string', example: 'Vancouver' },
            province: { type: 'string', example: 'BC' },
            postalCode: { type: 'string', example: 'V6B 2L2' },
            countryRegion: { type: 'string', example: 'Canada' },
            latitude: { type: 'number', example: 49.1398 },
            longitude: { type: 'number', example: -122.6705 },
            types: {
              type: 'array',
              items: { type: 'string' },
              example: ['supermarket', 'store'],
            },
          },
        },

        // Image upload
        image: {
          type: 'string',
          format: 'binary',
          description:
            'Product image file (optional - default placeholder used if not provided)',
        },
      },
      required: ['name', 'barcode', 'category'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Product successfully created with optional store linkage',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation errors or conflicting store data',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'Either storeSk or googlePlacesStore can be provided, not both',
            'Store with ID not found',
            'Invalid Google Places data',
            'Category not found',
          ],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('image'))
  async createProduct(
    @Body() productData: ProductCreateDto,
    @UploadedFile() imageFile?: Express.Multer.File,
  ): Promise<ProductResponseDto> {
    // Validate store selection logic - either storeSk OR googlePlacesStore, not both
    const hasStoreSk = !!productData.storeSk;
    const hasGoogleStore = !!productData.googlePlacesStore;

    if (hasStoreSk && hasGoogleStore) {
      throw new BadRequestException(
        'Provide either storeSk OR googlePlacesStore, not both',
      );
    }

    // Handle optional image upload
    let imageBuffer: Buffer | undefined;
    let mimeType: string | undefined;

    if (imageFile) {
      imageBuffer = imageFile.buffer;
      mimeType = imageFile.mimetype;
    }

    const result = await this.productService.createProductWithPriceAndStore(
      productData,
      imageBuffer,
      mimeType,
      'default_user', // userSk
    );

    // TODO: Award points for product registration when authentication is implemented
    // For now, this endpoint doesn't award points since there's no authenticated user

    return result;
  }

  @Post('authenticated')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new product with authentication and point rewards',
    description: `
      **Authenticated Product Creation Endpoint**
      
      Same functionality as the main product creation endpoint but:
      - Requires JWT authentication
      - Awards +20 points for PRODUCT_REGISTRATION
      - Returns scoring information in response
      
      Creates a new product with flexible store linking options and awards gamification points.
    `,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Product data with optional image and store selection',
    schema: {
      type: 'object',
      properties: {
        // Core product fields
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
        brandName: {
          type: 'string',
          example: 'Cheil Jedang',
          description: 'Brand name (optional)',
        },
        price: {
          type: 'number',
          example: 5000,
          description: 'Product price at selected store (optional)',
        },
        currency: {
          type: 'string',
          example: 'CAD',
          description: 'Currency code (default: CAD)',
        },
        storeSk: {
          type: 'string',
          format: 'uuid',
          example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          description: 'Existing store UUID (optional)',
        },
        googlePlacesStore: {
          type: 'object',
          description: 'Google Places store data (optional)',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Product image file (optional)',
        },
      },
      required: ['name', 'barcode', 'category'],
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'Product successfully created with gamification points awarded',
    schema: {
      type: 'object',
      allOf: [
        { $ref: '#/components/schemas/ProductResponseDto' },
        {
          type: 'object',
          properties: {
            pointsAwarded: { type: 'number', example: 20 },
            newBadges: { type: 'number', example: 0 },
            rankChange: {
              type: 'object',
              properties: {
                oldTier: { type: 'string', example: 'busy_bee' },
                newTier: { type: 'string', example: 'queen_bee' },
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation errors or conflicting store data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - valid JWT token required',
  })
  @UseInterceptors(FileInterceptor('image'))
  async createProductAuthenticated(
    @CurrentUser() user: UserProfileDTO,
    @Body() productData: ProductCreateDto,
    @UploadedFile() imageFile?: Express.Multer.File,
  ): Promise<
    ProductResponseDto & {
      pointsAwarded?: number;
      newBadges?: number;
      rankChange?: any;
    }
  > {
    // Validate store selection logic - either storeSk OR googlePlacesStore, not both
    const hasStoreSk = !!productData.storeSk;
    const hasGoogleStore = !!productData.googlePlacesStore;

    if (hasStoreSk && hasGoogleStore) {
      throw new BadRequestException(
        'Provide either storeSk OR googlePlacesStore, not both',
      );
    }

    // Handle optional image upload
    let imageBuffer: Buffer | undefined;
    let mimeType: string | undefined;

    if (imageFile) {
      imageBuffer = imageFile.buffer;
      mimeType = imageFile.mimetype;
    }

    // Create the product
    const result = await this.productService.createProductWithPriceAndStore(
      productData,
      imageBuffer,
      mimeType,
      user.id, // Use authenticated user ID
    );

    // Award points for product registration
    let pointsAwarded = 0;
    let newBadges = 0;
    let rankChange: any;

    try {
      const scoreResult = await this.gameScoreService.awardPoints(
        user.id,
        'PRODUCT_REGISTRATION',
        result.product_sk,
        'product_creation',
        1,
        {
          productName: productData.name,
          barcode: productData.barcode,
          category: productData.category,
          hasImage: !!imageFile,
          hasStore: hasStoreSk || hasGoogleStore,
          hasPrice: !!productData.price,
        },
      );

      pointsAwarded = scoreResult.activityLog.pointsAwarded;
      newBadges = scoreResult.newBadges?.length || 0;
      rankChange = scoreResult.rankChange;
    } catch (scoringError) {
      // Don't fail product creation if scoring fails, just log it
      console.warn(
        'Failed to award points for product registration:',
        scoringError,
      );
    }

    return {
      ...result,
      pointsAwarded,
      newBadges,
      rankChange,
    };
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

  @Get(':productSk/enhanced')
  // TODO: Add @UseGuards(JwtAuthGuard) when JWT authentication is implemented
  @ApiOperation({
    summary: 'Get product by product ID with store and price information',
    description:
      'Returns detailed product information including prices across different stores, location-based filtering, and price comparison data.',
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
      'Maximum distance in kilometers for nearby stores (default: 50km)',
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
          example: 'Product with ID not found',
        },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async getProductByIdEnhanced(
    @Param('productSk') productSk: string,
    @Query('storeSk') storeSk?: string,
    @Query('latitude') latitude?: number,
    @Query('longitude') longitude?: number,
    @Query('maxDistance') maxDistance?: number,
  ): Promise<EnhancedProductResponseDto> {
    return this.productService.getProductByProductSkEnhanced(
      productSk,
      storeSk,
      latitude,
      longitude,
      maxDistance || 50, // Default to 10km radius
    );
  }

  @Post(':productSk/price')
  // TODO: Add @UseGuards(JwtAuthGuard) when JWT authentication is implemented
  @ApiOperation({
    summary: 'Add store and price information to existing product',
    description:
      "Allows users to contribute price and store information for a product. You can either provide complete store location information (which will create a new store or match to an existing one) OR provide an existing storeSk to use an existing store. Only one of 'store' or 'storeSk' should be provided.",
  })
  @ApiBody({
    description: 'Price and store information to add',
    examples: {
      withExistingStore: {
        summary: 'Using existing store SK',
        description: 'Add price using an existing store ID',
        value: {
          storeSk: 'f829b2f6-997e-4400-b3ba-5994753f3ef7',
          price: {
            price: 9.99,
            currency: 'CAD',
          },
        },
      },
      withNewStore: {
        summary: 'Creating/matching store by location',
        description: 'Add price with store location information',
        value: {
          store: {
            name: 'Walmart Supercentre',
            fullAddress: '9855 Austin Rd, Burnaby, BC V3J 1N5',
            city: 'Burnaby',
            province: 'BC',
            postalCode: 'V3J 1N5',
            latitude: 49.2520495,
            longitude: -122.8962265,
            placeId: 'ChIJOYsF8jt4hlQRDjdIUr1JI2o',
          },
          price: {
            price: 12.99,
            currency: 'CAD',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully added price and store information',
    type: AddProductPriceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - invalid product ID, price data, or missing/invalid store information',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          examples: [
            'Invalid product ID provided',
            'Either store information or storeSk must be provided, but not both',
            'Store with ID not found',
            'Invalid store ID format',
          ],
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
          example: 'Product not found',
        },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async addProductPrice(
    @Param('productSk') productSk: string,
    @Body() addPriceData: AddProductPriceDto,
  ): Promise<AddProductPriceResponseDto> {
    return this.productService.addProductPriceByProductSk(
      productSk,
      addPriceData,
    );
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

  // Receipt Confirmation Endpoints (Frontend Integration)

  @Get('receipt/confirmation-candidates')
  @ApiOperation({
    summary: 'Get receipt items ready for user confirmation',
    description:
      'Retrieves high-confidence normalized products from receipt processing that require user confirmation before linking to catalog products.',
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
    type: GetConfirmationCandidatesResponseDto,
  })
  async getConfirmationCandidates(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('userId') userId?: string,
  ): Promise<GetConfirmationCandidatesResponseDto> {
    return this.productConfirmationService.getConfirmationCandidates(
      userId,
      limit || 50,
      offset || 0,
    );
  }

  @Post('receipt/process-confirmations')
  @ApiOperation({
    summary: 'Process user confirmations for receipt items',
    description:
      'Processes user confirmations and edits for receipt items after OCR processing. ' +
      'Links confirmed items to catalog products, handles unmatched items, and identifies ' +
      'items requiring user selection when multiple matches are found.',
  })
  @ApiBody({
    description:
      'Receipt confirmation request with user confirmations and edits',
    type: ProcessReceiptConfirmationDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Receipt confirmation processing results',
    type: ReceiptConfirmationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Some normalized products not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid confirmation data',
  })
  async processReceiptConfirmations(
    @Body() confirmationRequest: ProcessReceiptConfirmationDto,
  ): Promise<ReceiptConfirmationResponseDto> {
    const result =
      await this.productConfirmationService.confirmNormalizedProducts(
        confirmationRequest.items,
        confirmationRequest.userId,
      );

    // Award points for OCR verification (if user successfully confirmed items)
    if (confirmationRequest.userId && confirmationRequest.items?.length > 0) {
      try {
        const verifiedItemsCount = confirmationRequest.items.filter(
          (item) => item.isConfirmed === true || item.normalizedName,
        ).length;

        if (verifiedItemsCount > 0) {
          // Award points with multiplier based on number of verified items
          const multiplier = Math.min(verifiedItemsCount / 5, 3); // Cap at 3x for very large receipts

          const scoreResult = await this.gameScoreService.awardPoints(
            confirmationRequest.userId,
            'OCR_VERIFICATION',
            confirmationRequest.receiptId || 'unknown',
            'confirmation',
            multiplier,
            {
              totalItems: confirmationRequest.items.length,
              verifiedItems: verifiedItemsCount,
              accuracy: verifiedItemsCount / confirmationRequest.items.length,
            },
          );

          if (scoreResult?.newBadges?.length > 0) {
            console.log(
              `User earned ${scoreResult.newBadges.length} new badges for OCR verification`,
            );
          }

          if (scoreResult?.rankChange) {
            console.log(
              `User rank changed from ${scoreResult.rankChange.oldTier} to ${scoreResult.rankChange.newTier}`,
            );
          }
        }
      } catch (scoringError) {
        console.warn(
          'Error awarding points for OCR verification:',
          scoringError,
        );
        // Don't fail the confirmation process if scoring fails
      }
    }

    // Map the service result to our DTO structure
    return result as ReceiptConfirmationResponseDto;
  }

  @Get('receipt/confirmation-stats')
  @ApiOperation({
    summary: 'Get receipt confirmation statistics',
    description:
      'Retrieves statistics about receipt items pending confirmation, linked products, and unprocessed items.',
  })
  @ApiResponse({
    status: 200,
    description: 'Receipt confirmation statistics',
    type: ConfirmationStatsResponseDto,
  })
  async getReceiptConfirmationStats(): Promise<ConfirmationStatsResponseDto> {
    return this.productConfirmationService.getConfirmationStats();
  }

  @Get('receipt/:receiptId/pending-selections')
  @ApiOperation({
    summary: 'Get pending product selections for a specific receipt',
    description:
      'Retrieves all products from a specific receipt that require user selection ' +
      'because multiple catalog product matches were found. Automatically finds ' +
      'all unlinked, high-confidence normalized products from the receipt that ' +
      'have multiple potential matches.',
  })
  @ApiResponse({
    status: 200,
    description: 'Receipt-scoped pending product selections',
    type: ReceiptPendingSelectionsResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Receipt not found or no pending selections',
  })
  async getReceiptPendingSelections(
    @Param('receiptId') receiptId: string,
  ): Promise<ReceiptPendingSelectionsResponseDto> {
    return this.productConfirmationService.getReceiptPendingSelectionsByReceiptId(
      receiptId,
    );
  }

  @Post('receipt/process-selections')
  @ApiOperation({
    summary: 'Process user product selections for pending items',
    description:
      'Processes user choices for products that had multiple matches. Users can either ' +
      'select a specific catalog product or provide empty selection (which moves the ' +
      'item to the unprocessed queue for manual review).',
  })
  @ApiResponse({
    status: 200,
    description: 'User selections processed successfully',
    type: ReceiptSelectionsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid selection data',
  })
  @ApiResponse({
    status: 404,
    description: 'Some normalized products not found',
  })
  async processReceiptSelections(
    @Body() selectionsRequest: ProcessReceiptSelectionsDto,
  ): Promise<ReceiptSelectionsResponseDto> {
    return this.productConfirmationService.processReceiptSelections(
      selectionsRequest.selections,
      selectionsRequest.userId,
      selectionsRequest.receiptId,
    );
  }

  // Enhanced Product-Price-Store Linking Endpoints

  @Post('enhanced-linking/link-product')
  @ApiOperation({
    summary: 'Link product with automatic price and store synchronization',
    description:
      'Enhanced linking that automatically syncs price and store information when a product is successfully linked to a normalized product.',
  })
  @ApiBody({
    description: 'Product linking context with price and store information',
    schema: {
      properties: {
        receiptSk: {
          type: 'string',
          format: 'uuid',
          description: 'Receipt UUID',
        },
        normalizedProductSk: {
          type: 'string',
          format: 'uuid',
          description: 'Normalized product UUID',
        },
        linkedProductSk: {
          type: 'string',
          format: 'uuid',
          description: 'Catalog product UUID to link to',
        },
        linkingConfidence: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Confidence score (0-1)',
        },
        linkingMethod: {
          type: 'string',
          description: 'Method used for linking',
          example: 'barcode_match',
        },
        merchant: {
          type: 'string',
          description: 'Merchant/store name',
          example: 'Homeplus',
        },
        storeSk: {
          type: 'string',
          format: 'uuid',
          description: 'Store UUID (optional)',
        },
        receiptDate: {
          type: 'string',
          format: 'date-time',
          description: 'Receipt date (optional)',
        },
      },
      required: [
        'receiptSk',
        'normalizedProductSk',
        'linkedProductSk',
        'linkingConfidence',
        'linkingMethod',
        'merchant',
      ],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Enhanced linking completed successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        productLinked: { type: 'boolean', example: true },
        pricesSynced: { type: 'number', example: 3 },
        storeLinked: { type: 'boolean', example: true },
        errors: { type: 'array', items: { type: 'string' } },
        linkedProductSk: { type: 'string', format: 'uuid' },
        storeSk: { type: 'string', format: 'uuid' },
        pricesSyncResult: {
          type: 'object',
          properties: {
            regularPrices: { type: 'number', example: 2 },
            discounts: { type: 'number', example: 1 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid linking context or failed to link',
  })
  async enhancedProductLinking(
    @Body()
    linkingContext: {
      receiptSk: string;
      normalizedProductSk: string;
      linkedProductSk: string;
      linkingConfidence: number;
      linkingMethod: string;
      merchant: string;
      storeSk?: string;
      receiptDate?: Date;
    },
  ) {
    return this.enhancedReceiptLinkingService.linkProductWithPriceAndStore(
      linkingContext,
    );
  }

  @Post('enhanced-linking/batch-link')
  @ApiOperation({
    summary: 'Batch link multiple products with price and store sync',
    description:
      'Process multiple product linkings in batch with automatic price and store synchronization.',
  })
  @ApiBody({
    description: 'Array of product linking contexts',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          receiptSk: { type: 'string', format: 'uuid' },
          normalizedProductSk: { type: 'string', format: 'uuid' },
          linkedProductSk: { type: 'string', format: 'uuid' },
          linkingConfidence: { type: 'number', minimum: 0, maximum: 1 },
          linkingMethod: { type: 'string' },
          merchant: { type: 'string' },
          storeSk: { type: 'string', format: 'uuid' },
          receiptDate: { type: 'string', format: 'date-time' },
        },
        required: [
          'receiptSk',
          'normalizedProductSk',
          'linkedProductSk',
          'linkingConfidence',
          'linkingMethod',
          'merchant',
        ],
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Batch linking results',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          productLinked: { type: 'boolean' },
          pricesSynced: { type: 'number' },
          storeLinked: { type: 'boolean' },
          errors: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  })
  async batchEnhancedProductLinking(
    @Body()
    linkingContexts: Array<{
      receiptSk: string;
      normalizedProductSk: string;
      linkedProductSk: string;
      linkingConfidence: number;
      linkingMethod: string;
      merchant: string;
      storeSk?: string;
      receiptDate?: Date;
    }>,
  ) {
    return this.enhancedReceiptLinkingService.batchLinkProductsWithPriceAndStore(
      linkingContexts,
    );
  }

  @Post('enhanced-linking/process-all-pending')
  @ApiOperation({
    summary: 'Process all pending product links with price and store sync',
    description:
      "Automatically process all normalized products that are linked but haven't had their prices and store information synced yet.",
  })
  @ApiResponse({
    status: 200,
    description: 'Processing results for all pending links',
    schema: {
      properties: {
        processed: { type: 'number', example: 150 },
        successful: { type: 'number', example: 140 },
        totalPricesSynced: { type: 'number', example: 420 },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async processAllPendingLinks() {
    return this.enhancedReceiptLinkingService.processAllPendingLinks();
  }

  @Get('enhanced-linking/stats')
  @ApiOperation({
    summary: 'Get enhanced linking statistics',
    description:
      'Get comprehensive statistics about enhanced product linking including price and store sync coverage.',
  })
  @ApiResponse({
    status: 200,
    description: 'Enhanced linking statistics',
    schema: {
      properties: {
        totalLinkedProducts: { type: 'number', example: 600 },
        productsWithPrices: { type: 'number', example: 580 },
        productsWithStores: { type: 'number', example: 600 },
        totalPricesSynced: { type: 'number', example: 1200 },
        averageLinkingConfidence: { type: 'number', example: 0.92 },
      },
    },
  })
  async getEnhancedLinkingStats() {
    return this.enhancedReceiptLinkingService.getLinkingStatistics();
  }

  // Receipt Workflow Integration Endpoints

  @Post('receipt-workflow/process/:receiptId')
  @ApiOperation({
    summary: 'Process complete receipt workflow with enhanced linking',
    description:
      'Process a receipt through the complete workflow: OCR → Normalization → User Confirmation → Product Linking → Price/Store Sync',
  })
  @ApiResponse({
    status: 200,
    description: 'Receipt workflow processing results',
    schema: {
      properties: {
        receiptProcessed: { type: 'boolean', example: true },
        productsLinked: { type: 'number', example: 8 },
        pricesSynced: { type: 'number', example: 12 },
        storesLinked: { type: 'number', example: 1 },
        errors: { type: 'array', items: { type: 'string' } },
        statistics: {
          type: 'object',
          properties: {
            totalItems: { type: 'number', example: 10 },
            normalizedItems: { type: 'number', example: 9 },
            linkedItems: { type: 'number', example: 8 },
            pendingConfirmation: { type: 'number', example: 1 },
            requiresSelection: { type: 'number', example: 0 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Receipt not found',
  })
  async processReceiptWorkflow(@Param('receiptId') receiptId: string) {
    return this.receiptWorkflowIntegrationService.processReceiptWorkflow(
      receiptId,
    );
  }

  @Post('receipt-workflow/auto-process/:receiptId')
  @ApiOperation({
    summary: 'Auto-process receipt after user confirmations',
    description:
      'Automatically process receipt with enhanced linking after user has completed confirmations and selections.',
  })
  @ApiBody({
    description: 'Confirmed normalization IDs',
    schema: {
      properties: {
        confirmedNormalizations: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          description: 'Array of confirmed normalization IDs',
        },
      },
      required: ['confirmedNormalizations'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Auto-processing results',
    schema: {
      properties: {
        receiptProcessed: { type: 'boolean' },
        productsLinked: { type: 'number' },
        pricesSynced: { type: 'number' },
        storesLinked: { type: 'number' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async autoProcessAfterConfirmation(
    @Param('receiptId') receiptId: string,
    @Body() body: { confirmedNormalizations: string[] },
  ) {
    return this.receiptWorkflowIntegrationService.autoProcessAfterConfirmation(
      receiptId,
      body.confirmedNormalizations,
    );
  }

  @Get('receipt-workflow/status/:receiptId')
  @ApiOperation({
    summary: 'Get receipt processing status and next actions',
    description:
      'Get detailed status of receipt processing including progress statistics and recommended next actions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Receipt processing status',
    schema: {
      properties: {
        status: {
          type: 'string',
          enum: [
            'pending',
            'processing',
            'confirmation_needed',
            'selection_needed',
            'completed',
            'failed',
          ],
          example: 'confirmation_needed',
        },
        progress: {
          type: 'object',
          properties: {
            totalItems: { type: 'number', example: 10 },
            normalizedItems: { type: 'number', example: 9 },
            confirmedItems: { type: 'number', example: 7 },
            linkedItems: { type: 'number', example: 6 },
            pricesSynced: { type: 'number', example: 8 },
          },
        },
        nextActions: {
          type: 'array',
          items: { type: 'string' },
          example: ['Review and confirm 2 normalized products'],
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Receipt not found',
  })
  async getReceiptProcessingStatus(@Param('receiptId') receiptId: string) {
    return this.receiptWorkflowIntegrationService.getReceiptProcessingStatus(
      receiptId,
    );
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
}
