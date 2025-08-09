import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios, { AxiosInstance } from 'axios';
import { Product } from '../entities/product.entity';
import { Category } from '../entities/category.entity';
import { BarcodeType } from '@beezly/types';

interface OpenFoodFactsProduct {
  code: string;
  product_name: string;
  brands?: string;
  brands_tags?: string[];
  brands_tags_en?: string[];
  quantity?: string;
  categories_tags?: string[];
  stores_tags?: string[];
  countries_tags?: string[];
  image_url?: string;
  image_small_url?: string;
  nutriscore_grade?: string;
  nova_group?: number;
}

interface OpenFoodFactsResponse {
  products: OpenFoodFactsProduct[];
  count: number;
  page: number;
  page_count: number;
  page_size: number;
  skip: number;
}

interface ProductFetchResult {
  totalFetched: number;
  totalMapped: number;
  duplicatesSkipped: number;
  errors: string[];
  newCategories: number;
  processingTimeMs: number;
}

@Injectable()
export class OpenFoodFactsApiService {
  private readonly logger = new Logger(OpenFoodFactsApiService.name);
  private readonly client: AxiosInstance;
  private readonly baseUrl = 'https://world.openfoodfacts.org/api/v2/search';
  private readonly defaultPageSize = 1000;

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'Beezly/1.0 (contact@beezly.com)',
      },
    });
  }

  /**
   * Fetch products from OpenFoodFacts API and map them to our Product database
   * @param pages Number of pages to fetch (default: 1)
   * @param stores Store filter (default: 'costco')
   * @param countries Country filter (default: 'en:united-states|en:canada')
   */
  async fetchAndMapProducts(
    pages: number = 1,
    stores: string = 'costco',
    countries: string = 'en:united-states|en:canada',
  ): Promise<ProductFetchResult> {
    const startTime = Date.now();
    const result: ProductFetchResult = {
      totalFetched: 0,
      totalMapped: 0,
      duplicatesSkipped: 0,
      errors: [],
      newCategories: 0,
      processingTimeMs: 0,
    };

    this.logger.log(
      `Starting OpenFoodFacts data fetch: ${pages} pages, stores=${stores}`,
    );

    try {
      for (let page = 1; page <= pages; page++) {
        this.logger.log(`Fetching page ${page}/${pages}...`);

        const response = await this.fetchProductsPage(page, stores, countries);
        result.totalFetched += response.products.length;

        // Process each product in the page
        for (const offProduct of response.products) {
          try {
            const mappingResult = await this.mapAndSaveProduct(offProduct);
            if (mappingResult.created) {
              result.totalMapped++;
            } else if (mappingResult.skipped) {
              result.duplicatesSkipped++;
            }

            if (mappingResult.newCategory) {
              result.newCategories++;
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            const errorMsg = `Failed to map product ${offProduct.code}: ${errorMessage}`;
            this.logger.warn(errorMsg);
            result.errors.push(errorMsg);
          }
        }

        // Add small delay between pages to be respectful to the API
        if (page < pages) {
          await this.delay(500);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorMsg = `Failed to fetch from OpenFoodFacts API: ${errorMessage}`;
      this.logger.error(errorMsg);
      result.errors.push(errorMsg);
      throw new HttpException(errorMsg, HttpStatus.BAD_GATEWAY);
    }

    result.processingTimeMs = Date.now() - startTime;

    this.logger.log(
      `OpenFoodFacts fetch completed: ${result.totalMapped} products mapped, ${result.duplicatesSkipped} duplicates skipped, ${result.errors.length} errors`,
    );

    return result;
  }

  private async fetchProductsPage(
    page: number,
    stores: string,
    countries: string,
  ): Promise<OpenFoodFactsResponse> {
    const params = {
      stores_tags: stores,
      countries_tags: countries,
      page_size: this.defaultPageSize,
      page,
      fields: [
        'code',
        'product_name',
        'brands',
        'brands_tags',
        'brands_tags_en',
        'quantity',
        'categories_tags',
        'stores_tags',
        'countries_tags',
        'image_url',
        'image_small_url',
        'nutriscore_grade',
        'nova_group',
      ].join(','),
    };

    try {
      const response = await this.client.get('', { params });
      return response.data as OpenFoodFactsResponse;
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
          response: { status: number; statusText: string };
        };
        throw new Error(
          `API request failed with status ${axiosError.response.status}: ${axiosError.response.statusText}`,
        );
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown network error';
      throw new Error(`Network error: ${errorMessage}`);
    }
  }

  private async mapAndSaveProduct(offProduct: OpenFoodFactsProduct): Promise<{
    created: boolean;
    skipped: boolean;
    newCategory: boolean;
  }> {
    // Skip products without essential data
    if (!offProduct.code || !offProduct.product_name) {
      return { created: false, skipped: true, newCategory: false };
    }

    // Check if product already exists by barcode
    const existingProduct = await this.productRepository.findOne({
      where: { barcode: offProduct.code },
    });

    if (existingProduct) {
      return { created: false, skipped: true, newCategory: false };
    }

    // Map and create the product
    const product = new Product();

    // Basic product information
    product.name = this.cleanProductName(offProduct.product_name);
    product.barcode = offProduct.code;
    product.barcodeType = this.inferBarcodeType(offProduct.code);
    product.brandName = this.extractBrandName(
      offProduct.brands,
      offProduct.brands_tags,
      offProduct.brands_tags_en,
    );
    product.imageUrl = offProduct.image_url || offProduct.image_small_url;

    // Map category information
    const categoryResult = await this.mapCategoryFromOpenFoodFacts(
      offProduct.categories_tags,
    );
    if (categoryResult.category) {
      product.categoryEntity = categoryResult.category;
      product.category = categoryResult.category.id;
    }

    // Initialize credit and verification scores
    product.creditScore = 0.8; // Default for OpenFoodFacts products
    product.verifiedCount = 1; // OpenFoodFacts verification
    product.flaggedCount = 0;

    try {
      await this.productRepository.save(product);
      this.logger.debug(`Mapped product: ${product.name} (${product.barcode})`);
      return {
        created: true,
        skipped: false,
        newCategory: categoryResult.isNew,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to save product: ${errorMessage}`);
    }
  }

  private async mapCategoryFromOpenFoodFacts(
    categoriesTags?: string[],
  ): Promise<{
    category: Category | null;
    isNew: boolean;
  }> {
    if (!categoriesTags || categoriesTags.length === 0) {
      return { category: null, isNew: false };
    }

    // Extract meaningful category hierarchy from OpenFoodFacts tags
    const relevantCategories = categoriesTags
      .filter((tag) => tag.startsWith('en:') && !tag.includes('unknown'))
      .map((tag) => tag.substring(3)) // Remove 'en:' prefix
      .map((tag) => this.formatCategoryName(tag))
      .slice(0, 3); // Take up to 3 levels

    if (relevantCategories.length === 0) {
      return { category: null, isNew: false };
    }

    // Try to find existing category with similar structure
    const category1 = relevantCategories[0];
    const category2 = relevantCategories[1] || null;
    const category3 = relevantCategories[2] || null;

    // Build where condition properly handling nulls
    const whereCondition: {
      category1: string;
      category2?: string;
      category3?: string;
    } = { category1 };
    if (category2 !== null) {
      whereCondition.category2 = category2;
    }
    if (category3 !== null) {
      whereCondition.category3 = category3;
    }

    const existingCategory = await this.categoryRepository.findOne({
      where: whereCondition,
    });

    if (existingCategory) {
      return { category: existingCategory, isNew: false };
    }

    // Create new category
    const newCategory = new Category();
    newCategory.category1 = category1;
    newCategory.category2 = category2;
    newCategory.category3 = category3;

    try {
      const savedCategory = await this.categoryRepository.save(newCategory);
      this.logger.debug(
        `Created new category: ${category1} > ${category2 || ''} > ${category3 || ''}`,
      );
      return { category: savedCategory, isNew: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to create category: ${errorMessage}`);
      return { category: null, isNew: false };
    }
  }

  private cleanProductName(name: string): string {
    if (!name) return '';

    return name
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\w\s\-&().,]/g, '') // Remove special characters except common ones
      .trim()
      .slice(0, 255); // Ensure it fits in database field
  }

  private extractBrandName(
    brands?: string,
    brandsTags?: string[],
    brandsTagsEn?: string[],
  ): string | undefined {
    // Try brands field first
    if (brands && brands.trim()) {
      return brands.split(',')[0].trim().slice(0, 100); // Take first brand, limit length
    }

    // Try English brand tags
    if (brandsTagsEn && brandsTagsEn.length > 0) {
      const brand = brandsTagsEn[0].replace(/^en:/, '');
      return this.formatBrandName(brand);
    }

    // Try regular brand tags
    if (brandsTags && brandsTags.length > 0) {
      const brand = brandsTags[0].replace(/^en:/, '');
      return this.formatBrandName(brand);
    }

    return undefined;
  }

  private formatBrandName(brand: string): string {
    return brand
      .replace(/-/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .slice(0, 100);
  }

  private formatCategoryName(category: string): string {
    return category
      .replace(/-/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private inferBarcodeType(barcode: string): BarcodeType | undefined {
    if (!barcode) return undefined;

    const cleanBarcode = barcode.replace(/\D/g, ''); // Remove non-digits

    switch (cleanBarcode.length) {
      case 8:
        return BarcodeType.EAN8;
      case 12:
        return BarcodeType.UPC_A;
      case 13:
        return BarcodeType.EAN13;
      case 14:
        return BarcodeType.ITF14;
      default:
        // Default to EAN13 for most common case
        return BarcodeType.EAN13;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get statistics about OpenFoodFacts integration
   */
  async getIntegrationStats(): Promise<{
    totalOpenFoodFactsProducts: number;
    productsWithOpenFoodFactsSource: number;
    categoriesFromOpenFoodFacts: number;
    lastFetchDate?: Date;
  }> {
    // Count products that likely came from OpenFoodFacts (have creditScore = 0.8)
    const offProductsCount = await this.productRepository.count({
      where: { creditScore: 0.8 },
    });

    const totalProducts = await this.productRepository.count();

    // Count categories that were likely created from OpenFoodFacts
    const totalCategories = await this.categoryRepository.count();

    return {
      totalOpenFoodFactsProducts: totalProducts,
      productsWithOpenFoodFactsSource: offProductsCount,
      categoriesFromOpenFoodFacts: totalCategories,
      // Note: We don't have a lastFetchDate field, could be added to a settings table
    };
  }
}
