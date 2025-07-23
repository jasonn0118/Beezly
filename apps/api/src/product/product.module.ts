import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { Product } from '../entities/product.entity';
import { Category } from '../entities/category.entity';
import { Store } from '../entities/store.entity';
import { Price } from '../entities/price.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category, Store, Price])],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
