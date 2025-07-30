import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductResponseDto } from './dto/product-response.dto';
import { Product } from '../entities/product.entity';
import { BarcodeType } from '@beezly/types';

@Injectable()
export class BarcodeService {
  private readonly logger = new Logger(BarcodeService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
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
   * Attempts to extract brand name from product name
   * This is a simple implementation that can be enhanced later
   */
  // private extractBrandFromName(productName: string): string | undefined {
  //   // Common patterns: "Brand - Product" or "Brand Product"
  //   const parts = productName.split(' - ');
  //   if (parts.length > 1) {
  //     return parts[0].trim();
  //   }

  //   // For now, return undefined if we can't determine the brand
  //   return undefined;
  // }
}
