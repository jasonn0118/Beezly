import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BarcodeLookupDto } from './dto/barcode-lookup.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { Product } from '../entities/product.entity';

@Injectable()
export class BarcodeService {
  private readonly logger = new Logger(BarcodeService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async lookupBarcode(
    barcodeLookupDto: BarcodeLookupDto,
  ): Promise<ProductResponseDto> {
    const { barcode, userId } = barcodeLookupDto;

    // Log the barcode lookup attempt
    this.logger.log(
      `Looking up barcode: ${barcode}${userId ? ` by user: ${userId}` : ''}`,
    );

    // First, try to find the product in our database
    const existingProduct = await this.productRepository.findOne({
      where: { barcode },
      relations: ['categoryEntity'],
    });

    if (existingProduct) {
      // Product found in database
      this.logger.log(`Product found for barcode: ${barcode}`);
      return this.mapProductToResponse(existingProduct, true);
    }

    // Product not found, create a placeholder
    this.logger.log(
      `Product not found for barcode: ${barcode}, creating placeholder`,
    );

    // Create a placeholder product
    const placeholderProduct = this.productRepository.create({
      name: `Unknown Product (${barcode})`,
      barcode: barcode,
      creditScore: 0,
      verifiedCount: 0,
      flaggedCount: 0,
    });

    // Save the placeholder product
    const savedProduct = await this.productRepository.save(placeholderProduct);

    // Return the placeholder product response
    return this.mapProductToResponse(savedProduct, false);
  }

  async getProductByBarcode(barcode: string): Promise<ProductResponseDto> {
    // Validate barcode format
    if (!barcode || barcode.trim().length === 0) {
      throw new NotFoundException('Invalid barcode provided');
    }

    const product = await this.productRepository.findOne({
      where: { barcode },
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
      brand: this.extractBrandFromName(product.name),
      category: product.categoryEntity?.name,
      isVerified: isVerified,
    };
  }

  /**
   * Attempts to extract brand name from product name
   * This is a simple implementation that can be enhanced later
   */
  private extractBrandFromName(productName: string): string | undefined {
    // Common patterns: "Brand - Product" or "Brand Product"
    const parts = productName.split(' - ');
    if (parts.length > 1) {
      return parts[0].trim();
    }

    // For now, return undefined if we can't determine the brand
    return undefined;
  }
}
