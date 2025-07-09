// apps/api/src/receipt-item/receipt-item.module.ts

import { Module } from '@nestjs/common';
import { ReceiptItemController } from './receiptItem.controller';
import { ReceiptItemService } from './receiptItem.service';

@Module({
  controllers: [ReceiptItemController],
  providers: [ReceiptItemService],
  exports: [ReceiptItemService],
})
export class ReceiptItemModule {}
