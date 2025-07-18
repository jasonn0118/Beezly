import { Module } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { OcrAzureService } from './ocr-azure.service';
import { OcrController } from './ocr.controller';

@Module({
  controllers: [OcrController],
  providers: [OcrService, OcrAzureService],
  exports: [OcrService],
})
export class OcrModule {}
