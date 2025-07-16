import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseHealthCheckService } from './database-health-check.service';
import { ProductModule } from './product/product.module';
import { ReceiptModule } from './receipt/receipt.module';
import { ReceiptItemModule } from './receiptItem/receiptItem.module';
import { StoreModule } from './store/store.module';
import { UserModule } from './user/user.module';
import {
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
} from './entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.NEXT_PUBLIC_SUPABASE_URL || 'localhost',
        port: parseInt(process.env.DB_PORT || '5000', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database:
          process.env.DB_NAME ||
          (process.env.NODE_ENV === 'test' ? 'beezly_test' : 'beezly_db'),
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
        ],
        synchronize: process.env.NODE_ENV !== 'production', // Auto-sync schema in dev/test, not in production
        logging:
          process.env.NODE_ENV === 'development' ||
          process.env.DB_LOGGING === 'true',
        ssl:
          process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
        // Test environment specific settings
        dropSchema: process.env.NODE_ENV === 'test', // Clean slate for each test run
      }),
    }),
    AuthModule,
    ProductModule,
    ReceiptModule,
    ReceiptItemModule,
    StoreModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseHealthCheckService],
})
export class AppModule {}
