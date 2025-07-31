import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductResponseDto } from './dto/product-response.dto';
import {
  EnhancedProductResponseDto,
  PriceInfoDto,
  StoreInfoDto,
} from './dto/enhanced-product-response.dto';
import {
  AddProductPriceDto,
  AddProductPriceResponseDto,
  StoreLocationDto,
  PriceInfoSubmissionDto,
} from './dto/add-product-price.dto';
import { Product } from '../entities/product.entity';
import { Price } from '../entities/price.entity';
import { Store } from '../entities/store.entity';
import { BarcodeType } from '@beezly/types';

@Injectable()
export class BarcodeService {
  private readonly logger = new Logger(BarcodeService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Price)
    private readonly priceRepository: Repository<Price>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
  ) {}

  async getProductByBarcode(
    barcode: string,
    barcodeType?: BarcodeType,
  ): Promise<ProductResponseDto> {
    // Validate barcode format
    if (!barcode || barcode.trim().length === 0) {
      throw new NotFoundException('Invalid barcode provided');
    }

    // Build query conditions
    const where: Partial<Product> = { barcode };
    if (barcodeType) {
      where.barcodeType = barcodeType;
    }

    const product = await this.productRepository.findOne({
      where,
      relations: ['categoryEntity'],
    });

    if (!product) {
      throw new NotFoundException(`Product with barcode ${barcode} not found`);
    }

    return this.mapProductToResponse(product, true);
  }

  async getProductByBarcodeEnhanced(
    barcode: string,
    barcodeType?: BarcodeType,
    storeSk?: string,
    latitude?: number,
    longitude?: number,
    maxDistance?: number,
  ): Promise<EnhancedProductResponseDto> {
    // Validate barcode format
    if (!barcode || barcode.trim().length === 0) {
      throw new BadRequestException('Invalid barcode provided');
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
      `Searching for product with barcode: ${barcode}${storeSk ? ` in store: ${storeSk}` : ''}${latitude && longitude ? ` near location: ${latitude}, ${longitude}` : ''}`,
    );

    try {
      // Build query conditions
      const where: Partial<Product> = { barcode };
      if (barcodeType) {
        where.barcodeType = barcodeType;
      }

      const product = await this.productRepository.findOne({
        where,
        relations: ['categoryEntity'],
      });

      if (!product) {
        throw new NotFoundException(
          `Product with barcode ${barcode} not found`,
        );
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

      this.logger.error(`Error searching for barcode ${barcode}:`, error);
      throw new NotFoundException(
        `Unable to search for product with barcode ${barcode}`,
      );
    }
  }

  async addProductPrice(
    barcode: string,
    barcodeType: BarcodeType | undefined,
    addPriceData: AddProductPriceDto,
  ): Promise<AddProductPriceResponseDto> {
    // Validate barcode format
    if (!barcode || barcode.trim().length === 0) {
      throw new BadRequestException('Invalid barcode provided');
    }

    this.logger.log(
      `Adding price info for barcode: ${barcode} at store: ${addPriceData.store.name}`,
    );

    try {
      // Find the product by barcode
      const where: Partial<Product> = { barcode };
      if (barcodeType) {
        where.barcodeType = barcodeType;
      }

      const product = await this.productRepository.findOne({ where });
      if (!product) {
        throw new NotFoundException(
          `Product with barcode ${barcode} not found`,
        );
      }

      // Find or create store
      const store = await this.findOrCreateStore(addPriceData.store);

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

      this.logger.error(`Error adding price for barcode ${barcode}:`, error);
      throw new BadRequestException(
        `Unable to add price information for product with barcode ${barcode}`,
      );
    }
  }

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

    this.logger.log(
      `Adding price info for product: ${productSk} at store: ${addPriceData.store.name}`,
    );

    try {
      // Find the product by productSk
      const product = await this.productRepository.findOne({
        where: { productSk },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID ${productSk} not found`);
      }

      // Find or create store
      const store = await this.findOrCreateStore(addPriceData.store);

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

  /**
   * Maps a Product entity to ProductResponseDto
   */
  private mapProductToResponse(
    product: Product,
    isVerified: boolean,
  ): ProductResponseDto {
    return {
      id: product.productSk,
      name: product.name,
      barcode: product.barcode || '',
      barcodeType: product.barcodeType,
      brand: product.brandName,
      category: product.categoryEntity?.id || undefined,
      image_url: product.imageUrl ?? undefined,
      isVerified: isVerified,
    };
  }

  /**
   * Maps a Product entity with prices to EnhancedProductResponseDto
   */
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

  /**
   * Maps a Store entity to StoreInfoDto
   */
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

  /**
   * Validates UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Find an existing store or create a new one
   */
  private async findOrCreateStore(
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

  /**
   * Create a new price entry
   */
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
