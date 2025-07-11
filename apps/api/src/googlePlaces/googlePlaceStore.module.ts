import { Module } from '@nestjs/common';
import { GooglePlacesStoreService } from './googlePlaceStore.service';

@Module({
  providers: [GooglePlacesStoreService],
  exports: [GooglePlacesStoreService],
})
export class GooglePlacesModule {}
