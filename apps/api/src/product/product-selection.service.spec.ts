/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductSelectionService } from './product-selection.service';
import { ProductLinkingService } from './product-linking.service';
import { NormalizedProduct } from '../entities/normalized-product.entity';
import { Product } from '../entities/product.entity';
import {
  ProductSelectionRequestDto,
  UserProductSelectionDto,
} from './dto/product-selection.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ProductSelectionService', () => {
  let service: ProductSelectionService;
  let normalizedProductRepository: Repository<NormalizedProduct>;
  let productRepository: Repository<Product>;

  const mockNormalizedProduct = {
    normalizedProductSk: 'normalized-uuid-1',
    rawName: 'ORG APPLES',
    normalizedName: 'Organic Apples',
    brand: 'Fresh Farms',
    category: 'Produce',
    merchant: 'Whole Foods',
    confidenceScore: 0.95,
    linkedProductSk: null,
    embedding: [0.1, 0.2, 0.3], // Mock embedding
  };

  const mockProduct1 = {
    productSk: 'product-uuid-1',
    name: 'Organic Fuji Apples',
    brandName: 'Fresh Farms',
    barcode: '1234567890123',
    imageUrl: 'https://example.com/apple1.jpg',
    categoryEntity: { name: 'Fresh Produce' },
  };

  const mockCandidates = [
    {
      productSk: 'product-uuid-1',
      name: 'Organic Fuji Apples',
      brand: 'Fresh Farms',
      barcode: '1234567890123',
      score: 0.92,
      method: 'embedding_similarity',
    },
    {
      productSk: 'product-uuid-2',
      name: 'Organic Gala Apples',
      brand: 'Fresh Farms',
      barcode: '1234567890124',
      score: 0.88,
      method: 'name_similarity',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductSelectionService,
        {
          provide: getRepositoryToken(NormalizedProduct),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ProductLinkingService,
          useValue: {
            findProductCandidates: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductSelectionService>(ProductSelectionService);
    normalizedProductRepository = module.get<Repository<NormalizedProduct>>(
      getRepositoryToken(NormalizedProduct),
    );
    productRepository = module.get<Repository<Product>>(
      getRepositoryToken(Product),
    );

    // Setup private method access for testing
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (service as any).findProductCandidatesForSelection = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (service as any).enhanceMatchingOptions = jest.fn();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProductSelectionOptions', () => {
    const request: ProductSelectionRequestDto = {
      normalizedProductSk: 'normalized-uuid-1',
      query: 'organic apples',
      brand: 'Fresh Farms',
      minSimilarityThreshold: 0.8,
      maxOptions: 10,
    };

    it('should return selection options when multiple matches found', async () => {
      // Mock repository calls
      jest
        .spyOn(normalizedProductRepository, 'findOne')

        .mockResolvedValue(mockNormalizedProduct as any);

      // Mock private methods
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (service as any).findProductCandidatesForSelection = jest
        .fn()
        .mockResolvedValue(mockCandidates);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (service as any).enhanceMatchingOptions = jest.fn().mockResolvedValue([
        {
          productSk: 'product-uuid-1',
          name: 'Organic Fuji Apples',
          brandName: 'Fresh Farms',
          barcode: '1234567890123',
          score: 0.92,
          method: 'embedding_similarity',
          imageUrl: 'https://example.com/apple1.jpg',
          description: 'Category: Fresh Produce',
        },
        {
          productSk: 'product-uuid-2',
          name: 'Organic Gala Apples',
          brandName: 'Fresh Farms',
          barcode: '1234567890124',
          score: 0.88,
          method: 'name_similarity',
          imageUrl: 'https://example.com/apple2.jpg',
          description: 'Category: Fresh Produce',
        },
      ]);

      const result = await service.getProductSelectionOptions(request);

      expect(result.requiresUserSelection).toBe(true);
      expect(result.matchingOptions).toHaveLength(2);
      expect(result.totalMatches).toBe(2);
      expect(result.recommendedOption).toBeDefined();
      expect(result.normalizedProduct.normalizedProductSk).toBe(
        'normalized-uuid-1',
      );
    });

    it('should throw NotFoundException when normalized product not found', async () => {
      jest
        .spyOn(normalizedProductRepository, 'findOne')
        .mockResolvedValue(null);

      await expect(service.getProductSelectionOptions(request)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when product already linked', async () => {
      const linkedProduct = {
        ...mockNormalizedProduct,
        linkedProductSk: 'already-linked-uuid',
      };
      jest
        .spyOn(normalizedProductRepository, 'findOne')
        .mockResolvedValue(linkedProduct as any);

      await expect(service.getProductSelectionOptions(request)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('processUserSelection', () => {
    const selection: UserProductSelectionDto = {
      normalizedProductSk: 'normalized-uuid-1',
      selectedProductSk: 'product-uuid-1',
      userId: 'user-uuid-1',
      userConfidence: 0.95,
      userNotes: 'This matches exactly what I bought',
    };

    it('should successfully process user selection and create link', async () => {
      // Mock repository calls
      jest
        .spyOn(normalizedProductRepository, 'findOne')
        .mockResolvedValueOnce(mockNormalizedProduct as any) // First call for validation
        .mockResolvedValueOnce({
          // Second call for updated product
          ...mockNormalizedProduct,
          linkedProductSk: 'product-uuid-1',
          linkingConfidence: 0.95,
          linkingMethod: 'user_selection',
          linkedAt: new Date(),
        } as any);

      jest
        .spyOn(productRepository, 'findOne')
        .mockResolvedValue(mockProduct1 as any);
      jest
        .spyOn(normalizedProductRepository, 'update')
        .mockResolvedValue({} as any);

      const result = await service.processUserSelection(selection);

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Product successfully linked based on user selection',
      );
      expect(result.updatedNormalizedProduct.linkedProductSk).toBe(
        'product-uuid-1',
      );
      expect(result.updatedNormalizedProduct.linkingMethod).toBe(
        'user_selection',
      );
    });

    it('should return error when normalized product not found', async () => {
      jest
        .spyOn(normalizedProductRepository, 'findOne')
        .mockResolvedValue(null);

      const result = await service.processUserSelection(selection);

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'Normalized product normalized-uuid-1 not found',
      );
    });

    it('should return error when selected product not found', async () => {
      jest
        .spyOn(normalizedProductRepository, 'findOne')
        .mockResolvedValue(mockNormalizedProduct as any);
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(null);

      const result = await service.processUserSelection(selection);

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'Selected product product-uuid-1 not found',
      );
    });

    it('should return error when product already linked', async () => {
      const linkedProduct = {
        ...mockNormalizedProduct,
        linkedProductSk: 'already-linked-uuid',
      };
      jest
        .spyOn(normalizedProductRepository, 'findOne')
        .mockResolvedValue(linkedProduct as any);

      const result = await service.processUserSelection(selection);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already linked');
    });
  });

  describe('processBulkUserSelections', () => {
    it('should process multiple selections successfully', async () => {
      const bulkRequest = {
        selections: [
          {
            normalizedProductSk: 'normalized-uuid-1',
            selectedProductSk: 'product-uuid-1',
            userConfidence: 0.9,
          },
          {
            normalizedProductSk: 'normalized-uuid-2',
            selectedProductSk: 'product-uuid-2',
            userConfidence: 0.85,
          },
        ],
        userId: 'user-uuid-1',
      };

      // Mock processUserSelection to return success for both
      jest
        .spyOn(service, 'processUserSelection')
        .mockResolvedValueOnce({
          success: true,
          updatedNormalizedProduct: {} as any,
          message: 'Success',
        })
        .mockResolvedValueOnce({
          success: true,
          updatedNormalizedProduct: {} as any,
          message: 'Success',
        });

      const result = await service.processBulkUserSelections(bulkRequest);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
      expect(result.linked).toBe(2);
      expect(result.errors).toBe(0);
    });

    it('should handle mixed success and failure in bulk processing', async () => {
      const bulkRequest = {
        selections: [
          {
            normalizedProductSk: 'normalized-uuid-1',
            selectedProductSk: 'product-uuid-1',
            userConfidence: 0.9,
          },
          {
            normalizedProductSk: 'normalized-uuid-2',
            selectedProductSk: 'product-uuid-2',
            userConfidence: 0.85,
          },
        ],
        userId: 'user-uuid-1',
      };

      // Mock processUserSelection to return success for first, failure for second
      jest
        .spyOn(service, 'processUserSelection')
        .mockResolvedValueOnce({
          success: true,
          updatedNormalizedProduct: {} as any,
          message: 'Success',
        })
        .mockResolvedValueOnce({
          success: false,
          updatedNormalizedProduct: {} as any,
          message: 'Failed',
          error: 'Product not found',
        });

      const result = await service.processBulkUserSelections(bulkRequest);

      expect(result.success).toBe(false);
      expect(result.processed).toBe(2);
      expect(result.linked).toBe(1);
      expect(result.errors).toBe(1);
      expect(result.errorMessages).toHaveLength(1);
    });
  });
});
