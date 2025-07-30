import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductNormalizationService } from './product-normalization.service';
import { VectorEmbeddingService } from './vector-embedding.service';
import { OpenAIService } from './openai.service';
import { ProductLinkingService } from './product-linking.service';
import { ReceiptPriceIntegrationService } from './receipt-price-integration.service';
import { UnmatchedProductService } from './unmatched-product.service';
import { ProductConfirmationService } from './product-confirmation.service';
import { UnprocessedProductService } from './unprocessed-product.service';
import { ProductSelectionService } from './product-selection.service';
import { Product } from '../entities/product.entity';
import { Category } from '../entities/category.entity';
import { Store } from '../entities/store.entity';
import { Price } from '../entities/price.entity';
import { NormalizedProduct } from '../entities/normalized-product.entity';
import { UnprocessedProduct } from '../entities/unprocessed-product.entity';
import { ReceiptItem } from '../entities/receipt-item.entity';
import { ReceiptItemNormalization } from '../entities/receipt-item-normalization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      Category,
      Store,
      Price,
      NormalizedProduct,
      UnprocessedProduct,
      ReceiptItem,
      ReceiptItemNormalization,
    ]),
  ],
  controllers: [ProductController],
  providers: [
    ProductService,
    ProductNormalizationService,
    VectorEmbeddingService,
    OpenAIService,
    ProductLinkingService,
    ReceiptPriceIntegrationService,
    UnmatchedProductService,
    ProductConfirmationService,
    UnprocessedProductService,
    ProductSelectionService,
  ],
  exports: [
    ProductService,
    ProductNormalizationService,
    VectorEmbeddingService,
    OpenAIService,
    ProductLinkingService,
    ReceiptPriceIntegrationService,
    UnmatchedProductService,
    ProductConfirmationService,
    UnprocessedProductService,
    ProductSelectionService,
  ],
})
export class ProductModule {}
