import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ProductModule } from './product/product.module';
import { ReceiptModule } from './receipt/receipt.module';
import { ReceiptItemModule } from './receiptItem/receiptItem.module';
import { StoreModule } from './store/store.module';
import { UserModule } from './user/user.module';
import { GooglePlacesModule } from './googlePlaces/googlePlaceStore.module';

@Module({
  imports: [
    AuthModule,
    ProductModule,
    ReceiptModule,
    ReceiptItemModule,
    StoreModule,
    UserModule,
    GooglePlacesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
