import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from root .env file before anything else
config({ path: join(process.cwd(), '../../.env') });
console.log(
  '🔧 Environment loaded - SUPABASE_URL exists:',
  !!process.env.SUPABASE_URL,
);

async function bootstrap() {
  const app: INestApplication = await NestFactory.create(AppModule);

  // Configure CORS for frontend apps
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : [
        'http://localhost:3000', // Next.js web app (default)
        'http://localhost:3001', // Next.js web app (alternative)
        'http://localhost:8081', // Expo mobile app default port
        'http://localhost:19000', // Expo dev server port
        'http://localhost:19001', // Expo dev server port
        'http://localhost:19002', // Expo web port
      ];

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Beezly API')
    .setDescription('API documentation for Beezly backend')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .addTag('App', 'General application endpoints')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Barcodes', 'Barcode scanning and lookup endpoints')
    .addTag('Categories', 'Category management endpoints')
    .addTag('OCR', 'OCR processing endpoints')
    .addTag('Products', 'Product management endpoints')
    .addTag('Receipts', 'Receipt management endpoints')
    .addTag('ReceiptItems', 'Receipt item management endpoints')
    .addTag('Stores', 'Store management endpoints')
    .addTag('Users', 'User management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Configure Swagger UI with custom sorting
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT || 3006;
  await app.listen(port);

  console.log(`🚀 Beezly API is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api-docs`);
}
void bootstrap();
