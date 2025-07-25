import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceiptController } from './receipt.controller';
import { ReceiptService } from './receipt.service';
import { Receipt } from '../entities/receipt.entity';
import { ReceiptItem } from '../entities/receipt-item.entity';
import { Store } from '../entities/store.entity';
import { UserModule } from '../user/user.module';
import { StoreModule } from '../store/store.module';
import { ProductModule } from '../product/product.module';
import { Category } from '../entities/category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Receipt, ReceiptItem, Store, Category]),
    UserModule,
    StoreModule,
    ProductModule,
  ],
  controllers: [ReceiptController],
  providers: [ReceiptService],
  exports: [ReceiptService],
})
export class ReceiptModule {}
