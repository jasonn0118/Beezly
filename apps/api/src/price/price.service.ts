import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Price } from '../entities/price.entity';
import { Product } from '../entities/product.entity';
import { Store } from '../entities/store.entity';

export interface CreatePriceDto {
  productSk: string;
  storeSk: string;
  price: number;
  currency?: string;
}

export interface PriceWithRelations extends Price {
  product?: Product;
  store?: Store;
}

@Injectable()
export class PriceService {
  constructor(
    @InjectRepository(Price)
    private readonly priceRepository: Repository<Price>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
  ) {}

  async createPrice(createPriceDto: CreatePriceDto): Promise<Price> {
    // Validate product exists
    const product = await this.productRepository.findOne({
      where: { productSk: createPriceDto.productSk },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with SK ${createPriceDto.productSk} not found`,
      );
    }

    // Validate store exists
    const store = await this.storeRepository.findOne({
      where: { storeSk: createPriceDto.storeSk },
    });

    if (!store) {
      throw new NotFoundException(
        `Store with SK ${createPriceDto.storeSk} not found`,
      );
    }

    const price = this.priceRepository.create({
      productSk: createPriceDto.productSk,
      storeSk: createPriceDto.storeSk,
      price: createPriceDto.price,
      currency: createPriceDto.currency || 'KRW',
      creditScore: 0,
      verifiedCount: 0,
      flaggedCount: 0,
    });

    return await this.priceRepository.save(price);
  }

  async getPricesByProduct(productSk: string): Promise<PriceWithRelations[]> {
    return await this.priceRepository.find({
      where: { productSk },
      relations: ['store'],
      order: { recordedAt: 'DESC' },
    });
  }

  async getPricesByStore(storeSk: string): Promise<PriceWithRelations[]> {
    return await this.priceRepository.find({
      where: { storeSk },
      relations: ['product'],
      order: { recordedAt: 'DESC' },
    });
  }

  async getLatestPrice(
    productSk: string,
    storeSk: string,
  ): Promise<Price | null> {
    return await this.priceRepository.findOne({
      where: { productSk, storeSk },
      order: { recordedAt: 'DESC' },
    });
  }

  async updatePriceVerification(
    priceSk: string,
    action: 'verify' | 'flag',
  ): Promise<Price> {
    const price = await this.priceRepository.findOne({
      where: { priceSk },
    });

    if (!price) {
      throw new NotFoundException(`Price with SK ${priceSk} not found`);
    }

    if (action === 'verify') {
      price.verifiedCount = (price.verifiedCount || 0) + 1;
      price.creditScore = (price.creditScore || 0) + 0.5;
    } else if (action === 'flag') {
      price.flaggedCount = (price.flaggedCount || 0) + 1;
      price.creditScore = (price.creditScore || 0) - 0.3;
    }

    // Ensure credit score stays within bounds
    price.creditScore = Math.max(0, Math.min(10, price.creditScore || 0));

    return await this.priceRepository.save(price);
  }
}
