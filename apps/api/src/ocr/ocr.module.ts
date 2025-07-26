import { Module } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { OcrAzureService } from './ocr-azure.service';
import { OcrController } from './ocr.controller';
import { ProductModule } from '../product/product.module';
import { ReceiptModule } from '../receipt/receipt.module';

@Module({
  imports: [ProductModule, ReceiptModule],
  controllers: [OcrController],
  providers: [OcrService, OcrAzureService],
  exports: [OcrService],
})
export class OcrModule {}
