import { Injectable, NotFoundException } from '@nestjs/common';
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
   * Search products by name (fuzzy search)
   */
  async searchProductsByName(
    name: string,
    limit: number = 50,
  ): Promise<NormalizedProductDTO[]> {
    const products = await this.productRepository.find({
      where: { name: ILike(`%${name}%`) },
      relations: ['categoryEntity'],
      take: limit,
      order: { name: 'ASC' },
    });

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

    // Add text filters
    if (name) {
      query = query.andWhere('product.name ILIKE :name', { name: `%${name}%` });
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
      category: product.category,
      image_url: product.imageUrl,
      brand_name: product.brandName,
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
      name: product.name,
      brand_name: product.brandName,
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
        currency: 'KRW',
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
      barcode: product.barcode || '',
      category: product.category || 0,
      image_url: product.imageUrl || '',
      store: {
        store_sk: store.storeSk,
        name: store.name,
        address: store.address || '',
        city: store.city,
        province: store.province,
      },
      price: {
        price_sk: price.priceSk,
        price: Number(price.price),
        currency: price.currency || 'KRW',
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
      where: { name, address },
    });

    // If not found with exact match, try case-insensitive search
    if (!store) {
      store = await this.storeRepository
        .createQueryBuilder('store')
        .where('LOWER(store.name) = LOWER(:name)', { name })
        .andWhere('LOWER(store.address) = LOWER(:address)', { address })
        .getOne();
    }

    // Create new store only if no existing store found
    if (!store) {
      store = this.storeRepository.create({
        name: name.trim(), // Trim whitespace
        address: address.trim(),
        city,
        province,
        postalCode,
      });
      store = await this.storeRepository.save(store);
      console.log(`Created new store: ${store.name} at ${store.address}`);
    } else {
      console.log(`Found existing store: ${store.name} (ID: ${store.storeSk})`);
    }

    return store;
  }
}
