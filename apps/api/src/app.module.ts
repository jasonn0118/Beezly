import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { AuthMiddleware } from './auth/middleware/auth.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BarcodeModule } from './barcode/barcode.module';
import { CategoryModule } from './category/category.module';
import { DatabaseHealthCheckService } from './database-health-check.service';
import {
  Badges,
  Category,
  Price,
  Product,
  Receipt,
  ReceiptItem,
  ScoreType,
  Store,
  User,
  UserBadges,
  UserScore,
  VerificationLogs,
  NormalizedProduct,
  ReceiptItemNormalization,
  UnprocessedProduct,
} from './entities';
import { OcrModule } from './ocr/ocr.module';
import { PriceModule } from './price/price.module';
import { ProductModule } from './product/product.module';
import { ReceiptModule } from './receipt/receipt.module';
import { ReceiptItemModule } from './receiptItem/receiptItem.module';
import { StoreModule } from './store/store.module';
import { SupabaseModule } from './supabase/supabase.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    AppConfigModule,
    (() => {
      const rootEnvPath = join(process.cwd(), '../../.env');
      console.log('🔍 Loading .env from:', rootEnvPath);
      console.log('📁 Current working directory:', process.cwd());

      // Check if file exists
      if (existsSync(rootEnvPath)) {
        console.log('✅ Root .env file found!');
        // Load and check the file content
        const content = readFileSync(rootEnvPath, 'utf8');
        console.log(
          '📋 File contains SUPABASE_URL:',
          content.includes('SUPABASE_URL'),
        );
      } else {
        console.log('❌ Root .env file NOT found!');
      }

      return ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: [
          rootEnvPath, // Load root .env file from project root
          '.env', // Load local .env file (if exists)
        ],
      });
    })(),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'postgres',
        entities: [
          User,
          Store,
          Receipt,
          Product,
          ReceiptItem,
          Category,
          Badges,
          ScoreType,
          UserBadges,
          UserScore,
          Price,
          VerificationLogs,
          NormalizedProduct,
          ReceiptItemNormalization,
          UnprocessedProduct,
        ],
        synchronize: process.env.NODE_ENV === 'test', // Only synchronize for tests, use migrations for dev/prod
        logging:
          process.env.DB_LOGGING === 'verbose'
            ? true
            : process.env.DB_LOGGING === 'minimal'
              ? ['error', 'warn', 'migration']
              : false,
        ssl:
          process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        dropSchema: process.env.NODE_ENV === 'test',
      }),
    }),
    AuthModule,
    BarcodeModule,
    CategoryModule,
    OcrModule,
    PriceModule,
    ProductModule,
    ReceiptModule,
    ReceiptItemModule,
    StoreModule,
    SupabaseModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseHealthCheckService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('*'); // Apply to all routes
  }
}
