import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BarcodeController } from './barcode.controller';
import { BarcodeService } from './barcode.service';
import { Product } from '../entities/product.entity';
import { Price } from '../entities/price.entity';
import { Store } from '../entities/store.entity';
import { GamificationModule } from '../gamification/gamification.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Price, Store]),
    GamificationModule,
    forwardRef(() => AuthModule), // For JwtAuthGuard access
  ],
  controllers: [BarcodeController],
  providers: [BarcodeService],
  exports: [BarcodeService],
})
export class BarcodeModule {}
