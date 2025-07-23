import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductNormalizationService } from './product-normalization.service';
import { VectorEmbeddingService } from './vector-embedding.service';
import { Product } from '../entities/product.entity';
import { Category } from '../entities/category.entity';
import { Store } from '../entities/store.entity';
import { Price } from '../entities/price.entity';
import { NormalizedProduct } from '../entities/normalized-product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      Category,
      Store,
      Price,
      NormalizedProduct,
    ]),
  ],
  controllers: [ProductController],
  providers: [
    ProductService,
    ProductNormalizationService,
    VectorEmbeddingService,
  ],
  exports: [
    ProductService,
    ProductNormalizationService,
    VectorEmbeddingService,
  ],
})
export class ProductModule {}
