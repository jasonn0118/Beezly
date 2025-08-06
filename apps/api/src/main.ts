import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { config } from 'dotenv';
import { join } from 'path';
import { AppModule } from './app.module';

// Load environment variables from root .env file before anything else
config({ path: join(process.cwd(), '../../.env') });
console.log(
  '🔧 Environment loaded - SUPABASE_URL exists:',
  !!process.env.SUPABASE_URL,
);

async function bootstrap() {
  const app: INestApplication = await NestFactory.create(AppModule);

  // Configure CORS for frontend apps
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    // In development, be more permissive with CORS
    app.enableCors({
      origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => {
        // Allow requests with no origin (like mobile apps)
        if (!origin) {
          callback(null, true);
          return;
        }

        // Allow localhost and common development IPs
        const allowedPatterns = [
          /^http:\/\/localhost:\d+$/,
          /^http:\/\/127\.0\.0\.1:\d+$/,
          /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
          /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
        ];

        const isAllowed = allowedPatterns.some((pattern) =>
          pattern.test(origin),
        );
        callback(null, isAllowed);
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      credentials: true,
    });
  } else {
    // Production: use specific origins
    const corsOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['https://your-production-domain.com'];

    app.enableCors({
      origin: corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      credentials: true,
    });
  }

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
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);

  console.log(`🚀 Beezly API is running on: http://localhost:${port}`);
  console.log(`📱 Mobile access: http://172.20.10.11:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api-docs`);
}
void bootstrap();
