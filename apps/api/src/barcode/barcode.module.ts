import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BarcodeController } from './barcode.controller';
import { BarcodeService } from './barcode.service';
import { Product } from '../entities/product.entity';
import { Price } from '../entities/price.entity';
import { Store } from '../entities/store.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Price, Store])],
  controllers: [BarcodeController],
  providers: [BarcodeService],
  exports: [BarcodeService],
})
export class BarcodeModule {}
