import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Server } from 'http';
import { ProductController } from '../src/product/product.controller';
import { ProductService } from '../src/product/product.service';

describe('Product Search (e2e)', () => {
  let app: INestApplication;

  const mockProductService = {
    getAllProducts: jest.fn().mockResolvedValue([]),
    getProductById: jest.fn().mockResolvedValue(null),
    getProductByBarcode: jest.fn().mockResolvedValue(null),
    createProduct: jest.fn(),
    updateProduct: jest.fn(),
    deleteProduct: jest.fn(),
    createProductWithPriceAndStore: jest.fn(),
    searchProductsByNameAndBrand: jest
      .fn()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .mockImplementation((query: string, _limit: number) => {
        // Mock response with sample products
        if (query.toLowerCase().includes('apple')) {
          return Promise.resolve([
            {
              name: 'Organic Apple',
              brand_name: 'Cheil Jedang',
              image_url: 'https://example.com/apple.jpg',
            },
          ]);
        }

        if (query.toLowerCase().includes('cheil')) {
          return Promise.resolve([
            {
              name: 'Rice Cake',
              brand_name: 'Cheil Jedang',
              image_url: 'https://example.com/rice-cake.jpg',
            },
          ]);
        }

        return Promise.resolve([]);
      }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: mockProductService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/products/search (GET)', () => {
    it('should return products matching name query', async () => {
      const server = app.getHttpServer() as Server;
      const response = await request(server)
        .get('/products/search?q=apple')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body[0]).toMatchObject({
        name: 'Organic Apple',
        brand_name: 'Cheil Jedang',
        image_url: 'https://example.com/apple.jpg',
      });
    });

    it('should return products matching brand name query', async () => {
      const server = app.getHttpServer() as Server;
      const response = await request(server)
        .get('/products/search?q=cheil')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body[0]).toMatchObject({
        name: 'Rice Cake',
        brand_name: 'Cheil Jedang',
        image_url: 'https://example.com/rice-cake.jpg',
      });
    });

    it('should return empty array for non-matching query', async () => {
      const server = app.getHttpServer() as Server;
      const response = await request(server)
        .get('/products/search?q=nonexistent')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should return 400 for missing query parameter', async () => {
      const server = app.getHttpServer() as Server;
      await request(server).get('/products/search').expect(400);
    });

    it('should return 400 for empty query parameter', async () => {
      const server = app.getHttpServer() as Server;
      await request(server).get('/products/search?q=').expect(400);
    });

    it('should respect limit parameter', async () => {
      const server = app.getHttpServer() as Server;
      await request(server)
        .get('/products/search?q=apple&limit=10')
        .expect(200);

      expect(
        mockProductService.searchProductsByNameAndBrand,
      ).toHaveBeenCalledWith('apple', 10);
    });

    it('should use default limit when not specified', async () => {
      const server = app.getHttpServer() as Server;
      await request(server).get('/products/search?q=apple').expect(200);

      expect(
        mockProductService.searchProductsByNameAndBrand,
      ).toHaveBeenCalledWith('apple', 50);
    });

    it('should cap limit at 100', async () => {
      const server = app.getHttpServer() as Server;
      await request(server)
        .get('/products/search?q=apple&limit=200')
        .expect(200);

      expect(
        mockProductService.searchProductsByNameAndBrand,
      ).toHaveBeenCalledWith('apple', 100);
    });
  });
});
