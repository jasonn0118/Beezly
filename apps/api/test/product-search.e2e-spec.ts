import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Server } from 'http';
import { ProductController } from '../src/product/product.controller';
import { ProductService } from '../src/product/product.service';
import { VectorEmbeddingService } from '../src/product/vector-embedding.service';
import { ProductLinkingService } from '../src/product/product-linking.service';
import { ReceiptPriceIntegrationService } from '../src/product/receipt-price-integration.service';
import { ProductConfirmationService } from '../src/product/product-confirmation.service';
import { EnhancedReceiptLinkingService } from '../src/product/enhanced-receipt-linking.service';
import { ReceiptWorkflowIntegrationService } from '../src/product/receipt-workflow-integration.service';
import { UnprocessedProductService } from '../src/product/unprocessed-product.service';
import { OpenFoodFactsApiService } from '../src/product/openfoodfacts-api.service';

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
              product_sk: '550e8400-e29b-41d4-a716-446655440001',
              name: 'Organic Apple',
              brandName: 'Cheil Jedang',
              image_url: 'https://example.com/apple.jpg',
            },
          ]);
        }

        if (query.toLowerCase().includes('cheil')) {
          return Promise.resolve([
            {
              product_sk: '550e8400-e29b-41d4-a716-446655440002',
              name: 'Rice Cake',
              brandName: 'Cheil Jedang',
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
        {
          provide: VectorEmbeddingService,
          useValue: {
            findSimilarProductsEnhanced: jest.fn(),
            batchFindSimilarProducts: jest.fn(),
            generateEmbedding: jest.fn(),
            updateProductEmbedding: jest.fn(),
            batchUpdateEmbeddings: jest.fn(),
            getEmbeddingStats: jest.fn().mockResolvedValue({
              totalProducts: 0,
              productsWithEmbeddings: 0,
              productsWithoutEmbeddings: 0,
              averageEmbeddingLength: 0,
            }),
          },
        },
        {
          provide: ProductLinkingService,
          useValue: {
            linkSingleProduct: jest.fn(),
            linkNormalizedProducts: jest.fn(),
            getLinkingStatistics: jest.fn(),
            getUnlinkedHighConfidenceProducts: jest.fn(),
          },
        },
        {
          provide: ReceiptPriceIntegrationService,
          useValue: {
            syncReceiptPrices: jest.fn(),
            getPriceSyncStatistics: jest.fn(),
          },
        },
        {
          provide: ProductConfirmationService,
          useValue: {
            getConfirmationCandidates: jest.fn(),
            confirmNormalizedProducts: jest.fn(),
            getConfirmationStats: jest.fn(),
            getReceiptPendingSelectionsByReceiptId: jest.fn(),
            processReceiptSelections: jest.fn(),
          },
        },
        {
          provide: EnhancedReceiptLinkingService,
          useValue: {
            processReceiptWithEnhancedLinking: jest.fn(),
            getProcessingStats: jest.fn(),
            getReceiptProcessingHistory: jest.fn(),
          },
        },
        {
          provide: ReceiptWorkflowIntegrationService,
          useValue: {
            processReceiptWorkflow: jest.fn(),
            getWorkflowStatus: jest.fn(),
          },
        },
        {
          provide: UnprocessedProductService,
          useValue: {
            getUnprocessedProductsForReview: jest.fn(),
            getUnprocessedProductStats: jest.fn(),
            getHighPriorityUnprocessedProducts: jest.fn(),
            updateUnprocessedProductStatus: jest.fn(),
            createProductFromUnprocessedProduct: jest.fn(),
            performBulkReviewAction: jest.fn(),
            cleanupProcessedUnprocessedProducts: jest.fn(),
          },
        },
        {
          provide: OpenFoodFactsApiService,
          useValue: {
            fetchAndMapProducts: jest.fn(),
            getIntegrationStats: jest.fn().mockResolvedValue({
              totalOpenFoodFactsProducts: 0,
              productsWithOpenFoodFactsSource: 0,
              categoriesFromOpenFoodFacts: 0,
              lastFetchDate: null,
            }),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
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
        product_sk: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Organic Apple',
        brandName: 'Cheil Jedang',
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
        product_sk: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Rice Cake',
        brandName: 'Cheil Jedang',
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
