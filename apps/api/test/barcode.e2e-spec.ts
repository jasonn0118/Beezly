import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Repository } from 'typeorm';
import { Product } from '../src/entities/product.entity';
import { Category } from '../src/entities/category.entity';
import { BarcodeType } from '@beezly/types';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Server } from 'http';

describe('BarcodeController (e2e)', () => {
  let app: INestApplication;
  let productRepository: Repository<Product>;
  let categoryRepository: Repository<Category>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    productRepository = moduleFixture.get<Repository<Product>>(
      getRepositoryToken(Product),
    );
    categoryRepository = moduleFixture.get<Repository<Category>>(
      getRepositoryToken(Category),
    );
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/barcode/:barcode (GET)', () => {
    it('should return product by barcode', async () => {
      const category = await categoryRepository.save({
        category1: 'Drinks',
        category2: 'Soda',
        category3: 'Cola',
      });

      const testProduct = await productRepository.save({
        name: 'Test Product',
        barcode: '1234567890',
        creditScore: 5,
        verifiedCount: 10,
        flaggedCount: 0,
        categoryEntity: category,
        brandName: 'Coca-Cola',
        barcodeType: BarcodeType.EAN13,
        image_url: 'https://example.com/coke.jpg',
      });

      const server = app.getHttpServer() as Server;
      const response = await request(server)
        .get('/barcode/1234567890')
        .expect(200);

      expect(response.body).toMatchObject({
        id: testProduct.productSk,
        name: 'Test Product',
        barcode: '1234567890',
        brand: 'Coca-Cola',
        category: category.id,
        barcodeType: 'ean13',
        isVerified: true,
      });
    });

    it('should return 404 for non-existent barcode', async () => {
      const server = app.getHttpServer() as Server;
      await request(server).get('/barcode/nonexistent').expect(404);
    });
  });
});
