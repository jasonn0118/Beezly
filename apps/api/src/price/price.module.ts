import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceController } from './price.controller';
import { PriceService } from './price.service';
import { Price } from '../entities/price.entity';
import { Product } from '../entities/product.entity';
import { Store } from '../entities/store.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Price, Product, Store])],
  controllers: [PriceController],
  providers: [PriceService],
  exports: [PriceService],
})
export class PriceModule {}
