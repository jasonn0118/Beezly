import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { NormalizedProductDTO } from '../../../packages/types/dto/product';
import { BarcodeType } from '@beezly/types';

interface OpenFoodFactsProduct {
  code: string;
  product_name: string;
  categories?: string;
  categories_tags?: string[];
  image_url?: string;
  last_modified_t: number;
  brands_tags?: string[];
  codes_tags?: string[];
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  private readonly BASE_URL = 'https://world.openfoodfacts.org/country/canada';
  private readonly categoryCache = new Map<string, number>();

  constructor(
    private readonly configService: ConfigService,
    private readonly supabase: SupabaseClient<any, 'public', any>,
    private readonly openai: OpenAI,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyTask() {
    this.logger.log('📅 Daily task executed at midnight!');
    await this.run();
  }

  async getLatestCreatedAt(): Promise<Date> {
    const { data, error } = await this.supabase
      .from('Product')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data?.created_at) {
      this.logger.warn('⚠️ Could not fetch latest created_at, using default.');
      return new Date('2000-01-01');
    }

    return new Date(data.created_at as string);
  }

  async fetchProducts(page = 1): Promise<OpenFoodFactsProduct[]> {
    const url = `${this.BASE_URL}/${page}.json`;

    try {
      const { data }: { data: { products: OpenFoodFactsProduct[] } } =
        await axios.get(url, {
          params: { page_size: 100 },
        });

      if (!Array.isArray(data.products)) {
        this.logger.warn(`⚠️ No products found on page ${page}`);
        return [];
      }

      return data.products.map((p) => ({
        code: p.code,
        product_name: p.product_name,
        categories: p.categories,
        categories_tags: p.categories_tags,
        image_url: p.image_url,
        last_modified_t: p.last_modified_t,
        brands_tags: p.brands_tags,
        codes_tags: p.codes_tags,
      })) satisfies OpenFoodFactsProduct[];
    } catch (err) {
      this.logger.error(`❌ Failed to fetch products on page ${page}`, err);
      return [];
    }
  }

  async fetchCategoryMap(): Promise<Record<string, number>> {
    const { data, error } = await this.supabase
      .from('Category')
      .select('id, category1, category2, category3');

    if (error)
      throw new Error(`❌ Failed to fetch categories: ${error.message}`);

    return (data ?? []).reduce(
      (
        map: Record<string, number>,
        cat: {
          id: number;
          category1?: string;
          category2?: string;
          category3?: string;
        },
      ) => {
        const path = [cat.category1, cat.category2, cat.category3]
          .filter(Boolean)
          .map((c: string) => c.trim().toLowerCase())
          .join(' > ');
        if (path) map[path] = cat.id;
        return map;
      },
      {} as Record<string, number>,
    );
  }

  async getBestCategoryFromOpenAI(
    sourceCategories: string[],
    beezlyCategoryNames: string[],
  ): Promise<string | null> {
    const prompt = `
Given the following product categories from an external API:
- ${sourceCategories.join('\n- ')}

Which one of the following internal category names is the best match?

Internal Categories:
- ${beezlyCategoryNames.join('\n- ')}

Respond with only the best matching internal category name.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      });

      const bestMatch = response.choices[0].message.content?.trim();
      return (
        beezlyCategoryNames.find(
          (name) => name.toLowerCase() === bestMatch?.toLowerCase(),
        ) || null
      );
    } catch (error) {
      this.logger.error('❌ OpenAI category mapping failed:', error);
      return null;
    }
  }

  async findBestCategoryIdAI(
    raw: OpenFoodFactsProduct,
    categoryMap: Record<string, number>,
  ): Promise<number | undefined> {
    const sourceCats = [
      ...(raw.categories_tags ?? []),
      ...(raw.categories?.split(',') ?? []),
    ]
      .map((c) => c.trim().replace(/_/g, ' '))
      .filter(Boolean);

    if (sourceCats.length === 0) return undefined;

    const key = sourceCats.sort().join('|');
    if (this.categoryCache.has(key)) return this.categoryCache.get(key);

    const beezlyNames = Object.keys(categoryMap);
    const bestCategoryName = await this.getBestCategoryFromOpenAI(
      sourceCats,
      beezlyNames,
    );

    if (!bestCategoryName) return undefined;

    const categoryId = categoryMap[bestCategoryName.toLowerCase()];
    if (categoryId !== undefined) {
      this.categoryCache.set(key, categoryId);
      return categoryId;
    }
    return undefined;
  }

  async mapToProductDTO(
    raw: OpenFoodFactsProduct,
    categoryMap: Record<string, number>,
  ): Promise<NormalizedProductDTO> {
    const category = await this.findBestCategoryIdAI(raw, categoryMap);

    const getBarcodeType = (
      code: string | undefined,
    ): BarcodeType | undefined => {
      if (!code) return undefined;
      switch (code.length) {
        case 8:
          return BarcodeType.EAN8;
        case 13:
          return BarcodeType.EAN13;
        case 14:
          return BarcodeType.ITF14;
        default:
          return undefined;
      }
    };

    return {
      product_sk: uuidv4(),
      name: raw.product_name,
      barcode: raw.code,
      image_url: raw.image_url || undefined,
      credit_score: 0,
      verified_count: 0,
      flagged_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category,
      barcode_type: getBarcodeType(raw.code) || undefined,
      brandName: raw.brands_tags?.[0] || undefined,
    };
  }

  async insertProduct(dto: NormalizedProductDTO): Promise<void> {
    const { data: existing, error: fetchError } = await this.supabase
      .from('Product')
      .select('id')
      .eq('barcode', dto.barcode)
      .maybeSingle();

    if (fetchError) {
      this.logger.error(
        `🔍 Failed to check existing product: ${fetchError.message}`,
      );
      return;
    }

    if (existing) {
      this.logger.log(`ℹ️ Product with barcode ${dto.barcode} already exists.`);
      return;
    }

    const { error } = await this.supabase.from('Product').insert([dto]);
    if (error) {
      this.logger.error(
        `❌ Failed to insert product (${dto.barcode}): ${error.message}`,
      );
    }
  }

  async barcodeExists(barcode: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('Product')
      .select('id')
      .eq('barcode', barcode)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `❌ Error checking barcode existence: ${error.message}`,
      );
      return false;
    }

    return !!data;
  }

  async run(): Promise<void> {
    const categoryMap = await this.fetchCategoryMap();
    const maxPages = 20;
    const latestCreatedAt = await this.getLatestCreatedAt();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    for (let page = 1; page <= maxPages; page++) {
      const products = await this.fetchProducts(page);
      const filtered = products.filter((p) => {
        const modified = new Date(p.last_modified_t * 1000);
        return p.code && modified > latestCreatedAt && modified <= yesterday;
      });

      if (filtered.length === 0) break;

      for (const raw of filtered) {
        if (
          raw.code &&
          raw.product_name &&
          !(await this.barcodeExists(raw.code))
        ) {
          const dto = await this.mapToProductDTO(raw, categoryMap);
          await this.insertProduct(dto);
        }
      }

      this.logger.log(`✅ Page ${page} processed`);
    }

    this.logger.log(
      `🧠 Total unique OpenAI mappings cached: ${this.categoryCache.size}`,
    );
  }
}
