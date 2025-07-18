import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category } from '../entities/category.entity';
import { Product } from '../entities/product.entity';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;

  const mockProductRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockCategoryRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepository,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllProducts', () => {
    it('should return all products', async () => {
      const mockProducts = [
        {
          id: 1,
          productSk: 'product-uuid-1',
          name: 'Test Product',
          barcode: '1234567890',
          category: 1,
          categoryEntity: { name: 'Food' },
          receiptItems: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockProductRepository.find.mockResolvedValue(mockProducts);

      const result = await service.getAllProducts();

      expect(result).toHaveLength(1);
      expect(result[0].product_sk).toBe('product-uuid-1');
      expect(result[0].name).toBe('Test Product');
      expect(result[0].category).toBe(1);
      expect(mockProductRepository.find).toHaveBeenCalledWith({
        relations: ['categoryEntity', 'receiptItems'],
        take: 100,
        order: { name: 'ASC' },
      });
    });
  });

  describe('getProductById', () => {
    it('should return product by UUID', async () => {
      const mockProduct = {
        id: 1,
        productSk: 'product-uuid-1',
        name: 'Test Product',
        barcode: '1234567890',
        category: 1,
        categoryEntity: { name: 'Food' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findOne.mockResolvedValue(mockProduct);

      const result = await service.getProductById('product-uuid-1');

      expect(result).toBeDefined();
      expect(result?.product_sk).toBe('product-uuid-1');
      expect(result?.name).toBe('Test Product');
      expect(mockProductRepository.findOne).toHaveBeenCalledWith({
        where: { productSk: 'product-uuid-1' },
        relations: ['categoryEntity', 'receiptItems'],
      });
    });

    it('should return product by integer ID if UUID not found', async () => {
      const mockProduct = {
        id: 1,
        productSk: 'product-uuid-1',
        name: 'Test Product',
        barcode: '1234567890',
        category: 1,
        categoryEntity: { name: 'Food' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockProduct);

      const result = await service.getProductById('1');

      expect(result).toBeDefined();
      expect(result?.product_sk).toBe('product-uuid-1');
      expect(mockProductRepository.findOne).toHaveBeenCalledTimes(2);
    });

    it('should return null if product not found', async () => {
      mockProductRepository.findOne.mockResolvedValue(null);

      const result = await service.getProductById('non-existent-uuid');

      expect(result).toBeNull();
    });
  });

  describe('getProductByBarcode', () => {
    it('should return product by barcode', async () => {
      const mockProduct = {
        id: 1,
        productSk: 'product-uuid-1',
        name: 'Test Product',
        barcode: '1234567890',
        category: 1,
        categoryEntity: { name: 'Food' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findOne.mockResolvedValue(mockProduct);

      const result = await service.getProductByBarcode('1234567890');

      expect(result).toBeDefined();
      expect(result?.barcode).toBe('1234567890');
      expect(mockProductRepository.findOne).toHaveBeenCalledWith({
        where: { barcode: '1234567890' },
        relations: ['categoryEntity', 'receiptItems'],
      });
    });
  });
});
