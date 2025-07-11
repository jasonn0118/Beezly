import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { GooglePlacesStoreService } from '../googlePlaces/googlePlaceStore.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(GooglePlacesStoreService);

  await service.fetchAndSaveStoresInBC([
    'Korean grocery store',
    'Chinese supermarket',
    'H-mart',
  ]);

  await app.close();
}

void bootstrap();
