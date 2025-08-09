import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductNormalizationService } from './product-normalization.service';
import { VectorEmbeddingService } from './vector-embedding.service';
import { OpenAIService } from './openai.service';
import { ProductLinkingService } from './product-linking.service';
import { ReceiptPriceIntegrationService } from './receipt-price-integration.service';
import { EnhancedReceiptLinkingService } from './enhanced-receipt-linking.service';
import { ReceiptWorkflowIntegrationService } from './receipt-workflow-integration.service';
import { UnmatchedProductService } from './unmatched-product.service';
import { ProductConfirmationService } from './product-confirmation.service';
import { UnprocessedProductService } from './unprocessed-product.service';
import { ProductSelectionService } from './product-selection.service';
import { StoreModule } from '../store/store.module';
import { GamificationModule } from '../gamification/gamification.module';
import { AuthModule } from '../auth/auth.module';
import { Product } from '../entities/product.entity';
import { Category } from '../entities/category.entity';
import { Store } from '../entities/store.entity';
import { Price } from '../entities/price.entity';
import { Receipt } from '../entities/receipt.entity';
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
      Receipt,
      NormalizedProduct,
      UnprocessedProduct,
      ReceiptItem,
      ReceiptItemNormalization,
    ]),
    StoreModule,
    GamificationModule, // Import GamificationModule to make GameScoreService available
    forwardRef(() => AuthModule), // For JwtAuthGuard access
  ],
  controllers: [ProductController],
  providers: [
    ProductService,
    ProductNormalizationService,
    VectorEmbeddingService,
    OpenAIService,
    ProductLinkingService,
    ReceiptPriceIntegrationService,
    EnhancedReceiptLinkingService,
    ReceiptWorkflowIntegrationService,
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
    EnhancedReceiptLinkingService,
    ReceiptWorkflowIntegrationService,
    UnmatchedProductService,
    ProductConfirmationService,
    UnprocessedProductService,
    ProductSelectionService,
  ],
})
export class ProductModule {}
