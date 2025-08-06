import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OcrService } from './ocr.service';
import { OcrAzureService } from './ocr-azure.service';
import { OcrController } from './ocr.controller';
import { ProductModule } from '../product/product.module';
import { ReceiptModule } from '../receipt/receipt.module';
import { AuthModule } from '../auth/auth.module';
import { NormalizedProduct } from '../entities/normalized-product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([NormalizedProduct]),
    ProductModule,
    ReceiptModule,
    AuthModule, // Import AuthModule to make AuthService available
  ],
  controllers: [OcrController],
  providers: [OcrService, OcrAzureService],
  exports: [OcrService],
})
export class OcrModule {}
