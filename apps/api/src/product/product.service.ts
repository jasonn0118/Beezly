import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { NormalizedProductDTO } from '../../../packages/types/dto/product';
import { Product } from '../entities/product.entity';
import { Category } from '../entities/category.entity';
import { Store } from '../entities/store.entity';
import { Price } from '../entities/price.entity';
import { upload_product } from '../utils/storage.util';
import {
  MobileProductCreateDto,
  MobileProductResponseDto,
} from './dto/mobile-product-create.dto';
import { ProductSearchResponseDto } from './dto/product-search-response.dto';
import {
  EnhancedProductResponseDto,
  PriceInfoDto,
  StoreInfoDto,
} from '../barcode/dto/enhanced-product-response.dto';
import {
  AddProductPriceDto,
  AddProductPriceResponseDto,
  StoreLocationDto,
  PriceInfoSubmissionDto,
} from '../barcode/dto/add-product-price.dto';

export interface ProductSearchParams {
  name?: string;
  barcode?: string;
  category?: number;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(Price)
    private readonly priceRepository: Repository<Price>,
  ) {}

  async getAllProducts(limit: number = 100): Promise<NormalizedProductDTO[]> {
    const products = await this.productRepository.find({
      relations: ['categoryEntity', 'receiptItems'],
      take: limit,
      order: { name: 'ASC' },
    });

    return products.map((product) => this.mapProductToDTO(product));
  }

  async getProductById(id: string): Promise<NormalizedProductDTO | null> {
    // Try to find by productSk (UUID) first, then by id (integer)
    let product = await this.productRepository.findOne({
      where: { productSk: id },
      relations: ['categoryEntity', 'receiptItems'],
    });

    // If not found by productSk, try by integer id
    if (!product && !isNaN(Number(id))) {
      product = await this.productRepository.findOne({
        where: { id: Number(id) },
        relations: ['categoryEntity', 'receiptItems'],
      });
    }

    return product ? this.mapProductToDTO(product) : null;
  }

  async getProductByBarcode(
    barcode: string,
  ): Promise<NormalizedProductDTO | null> {
    const product = await this.productRepository.findOne({
      where: { barcode },
      relations: ['categoryEntity', 'receiptItems'],
    });

    return product ? this.mapProductToDTO(product) : null;
  }

  async createProduct(
    productData: Partial<NormalizedProductDTO>,
  ): Promise<NormalizedProductDTO> {
    // Validate category ID if provided
    const categoryId: number | undefined = productData.category;

    if (categoryId !== undefined) {
      const categoryExists = await this.categoryRepository.findOne({
        where: { id: categoryId },
      });

      if (!categoryExists) {
        throw new NotFoundException(
          `Category with ID ${categoryId} not found.`,
        );
      }
    }

    const product = this.productRepository.create({
      name: productData.name,
      barcode: productData.barcode,
      barcodeType: productData.barcode_type,
      category: categoryId,
      imageUrl: productData.image_url,
      creditScore: productData.credit_score ?? 0,
      verifiedCount: productData.verified_count ?? 0,
      flaggedCount: productData.flagged_count ?? 0,
    });

    const savedProduct = await this.productRepository.save(product);
    return this.mapProductToDTO(savedProduct);
  }

  async updateProduct(
    id: string,
    productData: Partial<NormalizedProductDTO>,
  ): Promise<NormalizedProductDTO> {
    const product = await this.getProductEntityById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // ✅ Update scalar fields
    if (productData.name !== undefined) product.name = productData.name;
    if (productData.barcode !== undefined)
      product.barcode = productData.barcode;
    if (productData.barcode_type !== undefined)
      product.barcodeType = productData.barcode_type;
    if (productData.image_url !== undefined)
      product.imageUrl = productData.image_url;

    // ✅ Update category by ID (FK)
    if (productData.category !== undefined) {
      if (productData.category !== null) {
        const category = await this.categoryRepository.findOne({
          where: { id: productData.category },
        });

        if (!category) {
          throw new NotFoundException(
            `Category with ID ${productData.category} not found`,
          );
        }

        product.category = category.id;
      } else {
        product.category = undefined;
      }
    }

    const updatedProduct = await this.productRepository.save(product);
    return this.mapProductToDTO(updatedProduct);
  }

  async deleteProduct(id: string): Promise<void> {
    const product = await this.getProductEntityById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.productRepository.remove(product);
  }

  // 🔍 SEARCH AND DISCOVERY METHODS

  /**
   * Search products by name and brand (fuzzy search)
   */
  async searchProductsByName(
    query: string,
    limit: number = 50,
  ): Promise<NormalizedProductDTO[]> {
    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.categoryEntity', 'categoryEntity')
      .where('product.name ILIKE :query', { query: `%${query}%` })
      .orWhere('product.brandName ILIKE :query', { query: `%${query}%` })
      .orderBy('product.name', 'ASC')
      .limit(limit)
      .getMany();

    return products.map((product) => this.mapProductToDTO(product));
  }

  /**
   * Search products by name and/or brandName with fuzzy matching
   */
  async searchProductsByNameAndBrand(
    query: string,
    limit: number = 50,
  ): Promise<ProductSearchResponseDto[]> {
    const products = await this.productRepository
      .createQueryBuilder('product')
      .where('product.name ILIKE :query', { query: `%${query}%` })
      .orWhere('product.brandName ILIKE :query', { query: `%${query}%` })
      .orderBy('product.name', 'ASC')
      .limit(limit)
      .getMany();

    return products.map((product) => this.mapProductToSearchResponse(product));
  }

  /**
   * Search products by barcode (exact match)
   */
  async searchProductsByBarcode(
    barcode: string,
  ): Promise<NormalizedProductDTO[]> {
    const products = await this.productRepository.find({
      where: { barcode: ILike(`%${barcode}%`) },
      relations: ['categoryEntity'],
      order: { name: 'ASC' },
    });

    return products.map((product) => this.mapProductToDTO(product));
  }

  // private async getProductsByCategoryLevel(
  //   field: 'category1' | 'category2' | 'category3',
  //   keyword: string,
  //   limit = 50,
  // ): Promise<NormalizedProductDTO[]> {
  //   const category = await this.categoryRepository.findOne({
  //     where: { [field]: ILike(`%${keyword}%`) },
  //   });

  //   if (!category) return [];

  //   const products = await this.productRepository.find({
  //     where: { category: category.id },
  //     relations: ['categoryEntity'],
  //     take: limit,
  //     order: { name: 'ASC' },
  //   });

  //   return products.map((product) => this.mapProductToDTO(product));
  // }

  /**
   * Get products by category1
   */
  async getProductsByCategory1(
    keyword: string,
    limit: number = 50,
  ): Promise<NormalizedProductDTO[]> {
    const category = await this.categoryRepository.findOne({
      where: { category1: ILike(`%${keyword}%`) },
    });

    if (!category) {
      return [];
    }

    const products = await this.productRepository.find({
      where: { category: category.id },
      relations: ['categoryEntity'],
      take: limit,
      order: { name: 'ASC' },
    });

    return products.map((product) => this.mapProductToDTO(product));
  }

  /**
   * Get products by category2
   */
  async getProductsByCategory2(
    keyword: string,
    limit: number = 50,
  ): Promise<NormalizedProductDTO[]> {
    const category = await this.categoryRepository.findOne({
      where: { category2: ILike(`%${keyword}%`) },
    });

    if (!category) {
      return [];
    }

    const products = await this.productRepository.find({
      where: { category: category.id },
      relations: ['categoryEntity'],
      take: limit,
      order: { name: 'ASC' },
    });

    return products.map((product) => this.mapProductToDTO(product));
  }

  /**
   * Get products by category3
   */
  async getProductsByCategory3(
    keyword: string,
    limit: number = 50,
  ): Promise<NormalizedProductDTO[]> {
    const category = await this.categoryRepository.findOne({
      where: { category3: ILike(`%${keyword}%`) },
    });

    if (!category) {
      return [];
    }

    const products = await this.productRepository.find({
      where: { category: category.id },
      relations: ['categoryEntity'],
      take: limit,
      order: { name: 'ASC' },
    });

    return products.map((product) => this.mapProductToDTO(product));
  }

  /**
   * Advanced product search with multiple criteria
   */
  async searchProducts(
    params: ProductSearchParams,
  ): Promise<NormalizedProductDTO[]> {
    const { name, barcode, category, minPrice, maxPrice, limit = 50 } = params;

    let query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.categoryEntity', 'category')
      .leftJoinAndSelect('product.receiptItems', 'receiptItem');

    // Add text filters - search both name and brand
    if (name) {
      query = query.andWhere(
        '(product.name ILIKE :name OR product.brandName ILIKE :name)',
        { name: `%${name}%` },
      );
    }

    if (barcode) {
      query = query.andWhere('product.barcode ILIKE :barcode', {
        barcode: `%${barcode}%`,
      });
    }

    if (category) {
      query = query.andWhere('category.name ILIKE :category', {
        category: `%${category}%`,
      });
    }

    // Add price filters (using average price from receipt items)
    if (minPrice !== undefined || maxPrice !== undefined) {
      query = query.having('AVG(receiptItem.price) IS NOT NULL');

      if (minPrice !== undefined) {
        query = query.andHaving('AVG(receiptItem.price) >= :minPrice', {
          minPrice,
        });
      }

      if (maxPrice !== undefined) {
        query = query.andHaving('AVG(receiptItem.price) <= :maxPrice', {
          maxPrice,
        });
      }
    }

    const products = await query
      .groupBy('product.id')
      .addGroupBy('category.id')
      .orderBy('product.name', 'ASC')
      .limit(limit)
      .getMany();

    return products.map((product) => this.mapProductToDTO(product));
  }

  /**
   * Get most popular products (most receipt items)
   */
  async getPopularProducts(
    limit: number = 20,
  ): Promise<NormalizedProductDTO[]> {
    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.categoryEntity', 'category')
      .leftJoin('product.receiptItems', 'receiptItem')
      .loadRelationCountAndMap(
        'product.receiptItemCount',
        'product.receiptItems',
      )
      .orderBy('product.receiptItemCount', 'DESC')
      .limit(limit)
      .getMany();

    return products.map((product) => this.mapProductToDTO(product));
  }

  /**
   * Get products with highest verification score
   */
  async getVerifiedProducts(
    limit: number = 20,
  ): Promise<NormalizedProductDTO[]> {
    const products = await this.productRepository.find({
      where: { verifiedCount: 5 }, // minimum 5 verifications
      relations: ['categoryEntity'],
      take: limit,
      order: { creditScore: 'DESC' },
    });

    return products.map((product) => this.mapProductToDTO(product));
  }

  /**
   * Get products needing verification (low credit score)
   */
  async getProductsNeedingVerification(
    limit: number = 20,
  ): Promise<NormalizedProductDTO[]> {
    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.categoryEntity', 'category')
      .where('product.creditScore < :threshold', { threshold: 3 })
      .orWhere('product.verifiedCount < :minVerifications', {
        minVerifications: 2,
      })
      .orderBy('product.creditScore', 'ASC')
      .limit(limit)
      .getMany();

    return products.map((product) => this.mapProductToDTO(product));
  }

  /**
   * Update product verification metrics
   */
  async updateProductVerification(
    productSk: string,
    action: 'verify' | 'flag',
  ): Promise<NormalizedProductDTO> {
    const product = await this.productRepository.findOne({
      where: { productSk },
      relations: ['categoryEntity'],
    });

    if (!product) {
      throw new NotFoundException(`Product with UUID ${productSk} not found`);
    }

    if (action === 'verify') {
      product.verifiedCount = (product.verifiedCount || 0) + 1;
      product.creditScore = (product.creditScore || 0) + 0.5;
    } else if (action === 'flag') {
      product.flaggedCount = (product.flaggedCount || 0) + 1;
      product.creditScore = (product.creditScore || 0) - 0.3;
    }

    // Ensure credit score stays within bounds
    product.creditScore = Math.max(0, Math.min(10, product.creditScore || 0));

    const updatedProduct = await this.productRepository.save(product);
    return this.mapProductToDTO(updatedProduct);
  }

  // PRODUCT_SK-BASED ENHANCED METHODS

  async getProductByProductSkEnhanced(
    productSk: string,
    storeSk?: string,
    latitude?: number,
    longitude?: number,
    maxDistance?: number,
  ): Promise<EnhancedProductResponseDto> {
    // Validate product ID format
    if (!this.isValidUUID(productSk)) {
      throw new BadRequestException('Invalid product ID format');
    }

    // Validate location parameters
    if ((latitude && !longitude) || (!latitude && longitude)) {
      throw new BadRequestException(
        'Both latitude and longitude must be provided for location-based search',
      );
    }

    if (latitude && (latitude < -90 || latitude > 90)) {
      throw new BadRequestException(
        'Latitude must be between -90 and 90 degrees',
      );
    }

    if (longitude && (longitude < -180 || longitude > 180)) {
      throw new BadRequestException(
        'Longitude must be between -180 and 180 degrees',
      );
    }

    if (maxDistance && maxDistance <= 0) {
      throw new BadRequestException('maxDistance must be greater than 0');
    }

    if (maxDistance && maxDistance > 100) {
      throw new BadRequestException('maxDistance cannot exceed 100 kilometers');
    }

    // Validate store UUID format if provided
    if (storeSk && !this.isValidUUID(storeSk)) {
      throw new BadRequestException('Invalid store ID format');
    }

    this.logger.log(
      `Searching for product with ID: ${productSk}${storeSk ? ` in store: ${storeSk}` : ''}${latitude && longitude ? ` near location: ${latitude}, ${longitude}` : ''}`,
    );

    try {
      const product = await this.productRepository.findOne({
        where: { productSk },
        relations: ['categoryEntity'],
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productSk} not found`);
      }

      // Get prices for this product
      let prices: Price[] = [];

      if (storeSk) {
        // Get prices from specific store
        prices = await this.priceRepository.find({
          where: { productSk: product.productSk, storeSk },
          relations: ['store'],
          order: { recordedAt: 'DESC' },
          take: 10, // Limit to recent prices
        });

        this.logger.log(
          `Found ${prices.length} prices for product ${product.productSk} in store ${storeSk}`,
        );
      } else if (latitude && longitude && maxDistance) {
        // Get prices from nearby stores using location
        prices = await this.getPricesFromNearbyStores(
          product.productSk,
          latitude,
          longitude,
          maxDistance,
        );

        this.logger.log(
          `Found ${prices.length} prices for product ${product.productSk} within ${maxDistance}km of location`,
        );
      } else {
        // Get all prices for this product
        prices = await this.priceRepository.find({
          where: { productSk: product.productSk },
          relations: ['store'],
          order: { recordedAt: 'DESC' },
          take: 20, // Limit to prevent huge responses
        });

        this.logger.log(
          `Found ${prices.length} total prices for product ${product.productSk}`,
        );
      }

      return this.mapProductToEnhancedResponse(product, prices);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(`Error searching for product ${productSk}:`, error);
      throw new NotFoundException(
        `Unable to search for product with ID ${productSk}`,
      );
    }
  }

  async addProductPriceByProductSk(
    productSk: string,
    addPriceData: AddProductPriceDto,
  ): Promise<AddProductPriceResponseDto> {
    // Validate product ID format
    if (!this.isValidUUID(productSk)) {
      throw new BadRequestException('Invalid product ID format');
    }

    // Validate that either store or storeSk is provided (handled by DTO validator, but add extra check)
    if (!addPriceData.store && !addPriceData.storeSk) {
      throw new BadRequestException(
        'Either store information or storeSk must be provided',
      );
    }

    if (addPriceData.store && addPriceData.storeSk) {
      throw new BadRequestException(
        'Cannot provide both store information and storeSk',
      );
    }

    const storeIdentifier =
      addPriceData.storeSk || addPriceData.store?.name || 'Unknown';
    this.logger.log(
      `Adding price info for product: ${productSk} at store: ${storeIdentifier}`,
    );

    try {
      // Find the product by productSk
      const product = await this.productRepository.findOne({
        where: { productSk },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID ${productSk} not found`);
      }

      let store: Store & { isNew?: boolean };

      if (addPriceData.storeSk) {
        // Validate storeSk format
        if (!this.isValidUUID(addPriceData.storeSk)) {
          throw new BadRequestException('Invalid store ID format');
        }

        // Find existing store by storeSk
        const existingStore = await this.storeRepository.findOne({
          where: { storeSk: addPriceData.storeSk },
        });

        if (!existingStore) {
          throw new NotFoundException(
            `Store with ID ${addPriceData.storeSk} not found`,
          );
        }

        store = { ...existingStore, isNew: false };
        this.logger.log(
          `Using existing store: ${store.name} (${store.storeSk})`,
        );
      } else {
        // Find or create store using location data
        store = await this.findOrCreateStoreAdvanced(addPriceData.store!);
      }

      // Create new price entry
      const price = await this.createPrice(
        product.productSk,
        store.storeSk,
        addPriceData.price,
      );

      this.logger.log(
        `Successfully added price ${price.price} CAD for product ${product.productSk} at store ${store.storeSk}`,
      );

      return {
        message: 'Successfully added price information for product',
        store: {
          storeSk: store.storeSk,
          name: store.name,
          isNew: store.isNew || false,
        },
        price: {
          priceSk: price.priceSk,
          price: Number(price.price),
          currency: price.currency || 'CAD',
          recordedAt: price.recordedAt,
        },
        product: {
          productSk: product.productSk,
          name: product.name,
          barcode: product.barcode || '',
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(`Error adding price for product ${productSk}:`, error);
      throw new BadRequestException(
        `Unable to add price information for product with ID ${productSk}`,
      );
    }
  }

  // PRIVATE HELPER METHODS

  private async getProductEntityById(id: string): Promise<Product | null> {
    // Try to find by productSk (UUID) first, then by id (integer)
    let product = await this.productRepository.findOne({
      where: { productSk: id },
      relations: ['categoryEntity'],
    });

    // If not found by productSk, try by integer id
    if (!product && !isNaN(Number(id))) {
      product = await this.productRepository.findOne({
        where: { id: Number(id) },
        relations: ['categoryEntity'],
      });
    }

    return product;
  }

  private mapProductToDTO(product: Product): NormalizedProductDTO {
    return {
      product_sk: product.productSk,
      name: product.name,
      barcode: product.barcode,
      barcode_type: product.barcodeType,
      category: product.category,
      image_url: product.imageUrl,
      brandName: product.brandName,
      created_at: product.createdAt.toISOString(),
      updated_at: product.updatedAt.toISOString(),
      credit_score: product.creditScore ?? 0,
      verified_count: product.verifiedCount ?? 0,
      flagged_count: product.flaggedCount ?? 0,
    };
  }

  private mapProductToSearchResponse(
    product: Product,
  ): ProductSearchResponseDto {
    return {
      product_sk: product.productSk,
      name: product.name,
      brandName: product.brandName,
      image_url: product.imageUrl,
    };
  }

  // Mobile-specific method for creating product with store and price
  async createProductWithPriceAndStore(
    productData: MobileProductCreateDto,
    imageFile: Buffer,
    userSk: string = 'mobile_user',
  ): Promise<MobileProductResponseDto> {
    // 1. Find or create store
    const store = await this.findOrCreateStore(
      productData.storeName,
      productData.storeAddress,
      productData.storeCity,
      productData.storeProvince,
      productData.storePostalCode,
    );

    // 2. Check if product already exists by barcode
    let product = await this.productRepository.findOne({
      where: { barcode: productData.barcode },
      relations: ['categoryEntity'],
    });

    // 3. Upload image to Supabase storage
    const imagePath = await upload_product(userSk, store.storeSk, imageFile);
    let imageUrl: string | undefined;

    if (imagePath) {
      // Construct the public URL for the uploaded image
      const supabaseUrl =
        process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      imageUrl = `${supabaseUrl}/storage/v1/object/public/product/${imagePath}`;
    }

    // 4. Create or update product
    if (!product) {
      // Validate category exists
      const categoryExists = await this.categoryRepository.findOne({
        where: { id: productData.category },
      });

      if (!categoryExists) {
        throw new NotFoundException(
          `Category with ID ${productData.category} not found`,
        );
      }

      product = this.productRepository.create({
        name: productData.name,
        barcode: productData.barcode,
        barcodeType: productData.barcodeType,
        brandName: productData.brandName,
        category: productData.category,
        imageUrl: imageUrl,
        creditScore: 0,
        verifiedCount: 0,
        flaggedCount: 0,
      });

      product = await this.productRepository.save(product);
    } else {
      // Update existing product if needed
      if (imageUrl && !product.imageUrl) {
        product.imageUrl = imageUrl;
        product = await this.productRepository.save(product);
      }
    }

    // 5. Create or update price entry
    let price = await this.priceRepository.findOne({
      where: {
        productSk: product.productSk,
        storeSk: store.storeSk,
      },
      order: { recordedAt: 'DESC' },
    });

    // Only create new price if doesn't exist or price changed
    if (!price || price.price !== productData.price) {
      price = this.priceRepository.create({
        productSk: product.productSk,
        storeSk: store.storeSk,
        price: productData.price,
        currency: 'CAD',
        creditScore: 0,
        verifiedCount: 0,
        flaggedCount: 0,
      });

      price = await this.priceRepository.save(price);
    }

    // 6. Return enriched response
    return {
      product_sk: product.productSk,
      name: product.name,
      brandName: product.brandName || '',
      barcode: product.barcode || '',
      category: product.category || 0,
      image_url: product.imageUrl || '',
      store: {
        store_sk: store.storeSk,
        name: store.name,
        address: store.fullAddress || '',
        city: store.city,
        province: store.province,
      },
      price: {
        price_sk: price.priceSk,
        price: Number(price.price),
        currency: price.currency || 'CAD',
        recorded_at: price.recordedAt.toISOString(),
      },
    };
  }

  private async findOrCreateStore(
    name: string,
    address: string,
    city?: string,
    province?: string,
    postalCode?: string,
  ): Promise<Store> {
    // Try to find existing store by name and address (exact match first)
    let store = await this.storeRepository.findOne({
      where: { name, fullAddress: address },
    });

    // If not found with exact match, try case-insensitive search
    if (!store) {
      store = await this.storeRepository
        .createQueryBuilder('store')
        .where('LOWER(store.name) = LOWER(:name)', { name })
        .andWhere('LOWER(store.fullAddress) = LOWER(:address)', { address })
        .getOne();
    }

    // Create new store only if no existing store found
    if (!store) {
      store = this.storeRepository.create({
        name: name.trim(), // Trim whitespace
        fullAddress: address.trim(),
        city,
        province,
        postalCode,
      });
      store = await this.storeRepository.save(store);
      console.log(`Created new store: ${store.name} at ${store.fullAddress}`);
    } else {
      console.log(`Found existing store: ${store.name} (ID: ${store.storeSk})`);
    }

    return store;
  }

  // Helper methods for enhanced product functionality

  private async getPricesFromNearbyStores(
    productSk: string,
    latitude: number,
    longitude: number,
    maxDistanceKm: number,
  ): Promise<Price[]> {
    try {
      // Use PostgreSQL's Earth extension or a simpler calculation
      // For now, let's use a basic bounding box approach
      const earthRadiusKm = 6371;
      const latDelta = (maxDistanceKm / earthRadiusKm) * (180 / Math.PI);
      const lonDelta =
        ((maxDistanceKm / earthRadiusKm) * (180 / Math.PI)) /
        Math.cos((latitude * Math.PI) / 180);

      const minLat = latitude - latDelta;
      const maxLat = latitude + latDelta;
      const minLon = longitude - lonDelta;
      const maxLon = longitude + lonDelta;

      this.logger.log(
        `Searching for prices near location (${latitude}, ${longitude}) within ${maxDistanceKm}km`,
      );
      this.logger.log(
        `Bounding box: lat ${minLat}-${maxLat}, lon ${minLon}-${maxLon}`,
      );

      const prices = await this.priceRepository
        .createQueryBuilder('price')
        .leftJoinAndSelect('price.store', 'store')
        .where('price.productSk = :productSk', { productSk })
        .andWhere('store.latitude IS NOT NULL AND store.longitude IS NOT NULL')
        .andWhere('store.latitude BETWEEN :minLat AND :maxLat', {
          minLat,
          maxLat,
        })
        .andWhere('store.longitude BETWEEN :minLon AND :maxLon', {
          minLon,
          maxLon,
        })
        .orderBy('price.recordedAt', 'DESC')
        .take(15)
        .getMany();

      this.logger.log(`Found ${prices.length} prices from nearby stores`);
      return prices;
    } catch (error) {
      this.logger.error(
        `Error finding nearby stores for product ${productSk}:`,
        error,
      );
      // Fallback to getting all prices if location search fails
      return await this.priceRepository.find({
        where: { productSk },
        relations: ['store'],
        order: { recordedAt: 'DESC' },
        take: 10,
      });
    }
  }

  private mapProductToEnhancedResponse(
    product: Product,
    prices: Price[],
  ): EnhancedProductResponseDto {
    const priceInfos: PriceInfoDto[] = prices.map((price) => ({
      priceSk: price.priceSk,
      price: Number(price.price),
      currency: price.currency || 'CAD',
      recordedAt: price.recordedAt,
      creditScore: price.creditScore ? Number(price.creditScore) : undefined,
      verifiedCount: price.verifiedCount || undefined,
      isDiscount: price.isDiscount,
      originalPrice: price.originalPrice
        ? Number(price.originalPrice)
        : undefined,
      store: this.mapStoreToDto(price.store!),
    }));

    // Find the lowest price
    const lowestPrice = priceInfos.reduce(
      (lowest, current) => {
        if (!lowest || current.price < lowest.price) {
          return current;
        }
        return lowest;
      },
      undefined as PriceInfoDto | undefined,
    );

    // Count unique stores
    const uniqueStores = new Set(priceInfos.map((p) => p.store.storeSk));

    return {
      id: product.productSk,
      name: product.name,
      barcode: product.barcode || '',
      barcodeType: product.barcodeType,
      brand: product.brandName,
      categoryName: product.categoryEntity?.category1 || undefined,
      category: product.categoryEntity?.id || undefined,
      image_url: product.imageUrl ?? undefined,
      isVerified: true,
      prices: priceInfos,
      lowestPrice,
      availableStoresCount: uniqueStores.size,
    };
  }

  private mapStoreToDto(store: Store): StoreInfoDto {
    return {
      storeSk: store.storeSk,
      name: store.name,
      fullAddress: store.fullAddress || undefined,
      city: store.city || undefined,
      province: store.province || undefined,
      latitude: store.latitude || undefined,
      longitude: store.longitude || undefined,
    };
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private async findOrCreateStoreAdvanced(
    storeData: StoreLocationDto,
  ): Promise<Store & { isNew?: boolean }> {
    // Try to find existing store by name and location
    let existingStore: Store | null = null;

    // First try to find by place ID if provided
    if (storeData.placeId) {
      existingStore = await this.storeRepository.findOne({
        where: { placeId: storeData.placeId },
      });
    }

    // If not found by place ID, try to find by name and location
    if (!existingStore && storeData.latitude && storeData.longitude) {
      // Find stores with the same name within 100m radius (rough match)
      const latDelta = 0.001; // ~100m
      const lonDelta = 0.001; // ~100m

      existingStore = await this.storeRepository
        .createQueryBuilder('store')
        .where('LOWER(store.name) = LOWER(:name)', { name: storeData.name })
        .andWhere('store.latitude IS NOT NULL AND store.longitude IS NOT NULL')
        .andWhere('store.latitude BETWEEN :minLat AND :maxLat', {
          minLat: storeData.latitude - latDelta,
          maxLat: storeData.latitude + latDelta,
        })
        .andWhere('store.longitude BETWEEN :minLon AND :maxLon', {
          minLon: storeData.longitude - lonDelta,
          maxLon: storeData.longitude + lonDelta,
        })
        .getOne();
    }

    // If not found by location, try to find by name and address
    if (!existingStore && storeData.fullAddress) {
      existingStore = await this.storeRepository
        .createQueryBuilder('store')
        .where('LOWER(store.name) = LOWER(:name)', { name: storeData.name })
        .andWhere('LOWER(store.fullAddress) = LOWER(:address)', {
          address: storeData.fullAddress,
        })
        .getOne();
    }

    if (existingStore) {
      this.logger.log(
        `Found existing store: ${existingStore.name} (${existingStore.storeSk})`,
      );
      return existingStore;
    }

    // Create new store
    this.logger.log(`Creating new store: ${storeData.name}`);
    const newStore = this.storeRepository.create({
      name: storeData.name,
      streetNumber: storeData.streetNumber,
      road: storeData.road,
      streetAddress: storeData.streetAddress,
      fullAddress: storeData.fullAddress,
      city: storeData.city,
      province: storeData.province,
      postalCode: storeData.postalCode,
      countryRegion: storeData.countryRegion,
      latitude: storeData.latitude,
      longitude: storeData.longitude,
      placeId: storeData.placeId,
    });

    const savedStore = await this.storeRepository.save(newStore);
    (savedStore as Store & { isNew: boolean }).isNew = true;

    this.logger.log(
      `Created new store: ${savedStore.name} (${savedStore.storeSk})`,
    );
    return savedStore as Store & { isNew: boolean };
  }

  private async createPrice(
    productSk: string,
    storeSk: string,
    priceData: PriceInfoSubmissionDto,
  ): Promise<Price> {
    // Check if a recent price exists (within last hour) to avoid duplicates
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentPrice = await this.priceRepository.findOne({
      where: {
        productSk,
        storeSk,
      },
      order: { recordedAt: 'DESC' },
    });

    // If recent price exists with same value, don't create duplicate
    if (
      recentPrice &&
      recentPrice.recordedAt > oneHourAgo &&
      Number(recentPrice.price) === priceData.price
    ) {
      this.logger.log(
        `Recent price already exists, returning existing price: ${recentPrice.priceSk}`,
      );
      return recentPrice;
    }

    const price = this.priceRepository.create({
      productSk,
      storeSk,
      price: priceData.price,
      currency: priceData.currency || 'CAD',
      creditScore: 1.0, // Initial credit score for user-submitted prices
      verifiedCount: 0,
      flaggedCount: 0,
    });

    const savedPrice = await this.priceRepository.save(price);
    this.logger.log(
      `Created new price: ${savedPrice.price} ${savedPrice.currency} (${savedPrice.priceSk})`,
    );

    return savedPrice;
  }
}
