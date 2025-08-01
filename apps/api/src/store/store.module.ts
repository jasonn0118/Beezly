import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { Store } from '../entities/store.entity';
import { StoreCacheService } from './cache/store-cache.service';

@Module({
  imports: [TypeOrmModule.forFeature([Store])],
  controllers: [StoreController],
  providers: [StoreService, StoreCacheService],
  exports: [StoreService, StoreCacheService],
})
export class StoreModule {}
