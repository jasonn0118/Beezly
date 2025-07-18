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

  const config = new DocumentBuilder()
    .setTitle('Beezly API')
    .setDescription('API documentation for Beezly backend')
    .setVersion('1.0')
    .addTag('Beezly')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3002;
  await app.listen(port);

  console.log(`🚀 Beezly API is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api-docs`);
}
void bootstrap();
