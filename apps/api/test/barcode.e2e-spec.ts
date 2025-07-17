import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Repository } from 'typeorm';
import { Product } from '../src/entities/product.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('BarcodeController (e2e)', () => {
  let app: INestApplication;
  let productRepository: Repository<Product>;

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
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/barcode/lookup (POST)', () => {
    it('should return 200 with product data for valid barcode', async () => {
      // Create a test product
      const testProduct = await productRepository.save({
        name: 'Test Product',
        barcode: '1234567890',
        creditScore: 5,
        verifiedCount: 10,
        flaggedCount: 0,
      });

      const response = await request(app.getHttpServer())
        .post('/barcode/lookup')
        .send({ barcode: '1234567890' })
        .expect(200);

      expect(response.body).toMatchObject({
        id: testProduct.productSk,
        name: 'Test Product',
        barcode: '1234567890',
        isVerified: true,
      });
    });

    it('should create placeholder for unknown barcode', async () => {
      const response = await request(app.getHttpServer())
        .post('/barcode/lookup')
        .send({ barcode: '9999999999' })
        .expect(200);

      expect(response.body).toMatchObject({
        name: 'Unknown Product (9999999999)',
        barcode: '9999999999',
        isVerified: false,
      });
      expect(response.body).toHaveProperty('id');
    });

    it('should return 400 for invalid request', async () => {
      await request(app.getHttpServer())
        .post('/barcode/lookup')
        .send({ invalid: 'field' })
        .expect(400);
    });
  });

  describe('/barcode/:barcode (GET)', () => {
    it('should return product by barcode', async () => {
      // Create a test product
      const testProduct = await productRepository.save({
        name: 'Test Product',
        barcode: '1234567890',
        creditScore: 5,
        verifiedCount: 10,
        flaggedCount: 0,
      });

      const response = await request(app.getHttpServer())
        .get('/barcode/1234567890')
        .expect(200);

      expect(response.body).toMatchObject({
        id: testProduct.productSk,
        name: 'Test Product',
        barcode: '1234567890',
        isVerified: true,
      });
    });

    it('should return 404 for non-existent barcode', async () => {
      await request(app.getHttpServer())
        .get('/barcode/nonexistent')
        .expect(404);
    });
  });
});
