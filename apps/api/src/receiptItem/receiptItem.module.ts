import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceiptItemController } from './receiptItem.controller';
import { ReceiptItemService } from './receiptItem.service';
import { ReceiptItem } from '../entities/receipt-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReceiptItem])],
  controllers: [ReceiptItemController],
  providers: [ReceiptItemService],
  exports: [ReceiptItemService],
})
export class ReceiptItemModule {}
