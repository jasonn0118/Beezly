import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProductService } from './product.service';
import { Product } from '../entities/product.entity';
import { Category } from '../entities/category.entity';

describe('ProductService', () => {
  let service: ProductService;
  let productRepository: Repository<Product>;
  let categoryRepository: Repository<Category>;

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
    // Reset all mocks
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
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
    categoryRepository = module.get<Repository<Category>>(getRepositoryToken(Category));
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
          categoryEntity: { name: 'Food' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockProductRepository.find.mockResolvedValue(mockProducts);

      const result = await service.getAllProducts();
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('product-uuid-1');
      expect(result[0].name).toBe('Test Product');
      expect(result[0].category).toBe('Food');
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
        categoryEntity: { name: 'Food' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findOne.mockResolvedValue(mockProduct);

      const result = await service.getProductById('product-uuid-1');
      
      expect(result).toBeDefined();
      expect(result?.id).toBe('product-uuid-1');
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
        categoryEntity: { name: 'Food' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findOne
        .mockResolvedValueOnce(null) // First call with UUID
        .mockResolvedValueOnce(mockProduct); // Second call with integer ID

      const result = await service.getProductById('1');
      
      expect(result).toBeDefined();
      expect(result?.id).toBe('product-uuid-1');
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

  describe('createProduct', () => {
    it('should create a new product', async () => {
      const mockCategory = {
        id: 1,
        name: 'Food',
        slug: 'food',
        level: 1,
        useYn: true,
      };

      const mockProduct = {
        id: 1,
        productSk: 'product-uuid-1',
        name: 'Test Product',
        barcode: '1234567890',
        category: 1,
        categoryEntity: mockCategory,
        creditScore: 0,
        verifiedCount: 0,
        flaggedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const productData = {
        name: 'Test Product',
        barcode: '1234567890',
        category: 'Food',
      };

      // Mock findOrCreateCategory
      jest.spyOn(service as any, 'findOrCreateCategory').mockResolvedValue(mockCategory);
      mockProductRepository.create.mockReturnValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(mockProduct);

      const result = await service.createProduct(productData);

      expect(result).toBeDefined();
      expect(result.id).toBe('product-uuid-1');
      expect(result.name).toBe('Test Product');
      expect(result.barcode).toBe('1234567890');
      expect(result.category).toBe('Food');
      expect(mockProductRepository.create).toHaveBeenCalledWith({
        name: 'Test Product',
        barcode: '1234567890',
        category: 1,
        imageUrl: undefined,
        creditScore: 0,
        verifiedCount: 0,
        flaggedCount: 0,
      });
    });

    it('should create a product without category', async () => {
      const mockProduct = {
        id: 1,
        productSk: 'product-uuid-1',
        name: 'Test Product',
        barcode: '1234567890',
        category: undefined,
        categoryEntity: null,
        creditScore: 0,
        verifiedCount: 0,
        flaggedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const productData = {
        name: 'Test Product',
        barcode: '1234567890',
      };

      mockProductRepository.create.mockReturnValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(mockProduct);

      const result = await service.createProduct(productData);

      expect(result).toBeDefined();
      expect(result.id).toBe('product-uuid-1');
      expect(result.category).toBeUndefined();
    });
  });

  describe('updateProduct', () => {
    it('should update a product', async () => {
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

      const updatedProduct = {
        ...mockProduct,
        name: 'Updated Product',
      };

      // Mock getProductEntityById
      jest.spyOn(service as any, 'getProductEntityById').mockResolvedValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(updatedProduct);

      const result = await service.updateProduct('product-uuid-1', { name: 'Updated Product' });

      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Product');
      expect(mockProductRepository.save).toHaveBeenCalledWith(updatedProduct);
    });

    it('should throw NotFoundException if product not found', async () => {
      jest.spyOn(service as any, 'getProductEntityById').mockResolvedValue(null);

      await expect(service.updateProduct('non-existent-uuid', { name: 'Updated' }))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('updateProductVerification', () => {
    it('should update product verification (verify)', async () => {
      const mockProduct = {
        id: 1,
        productSk: 'product-uuid-1',
        name: 'Test Product',
        verifiedCount: 0,
        creditScore: 0,
        flaggedCount: 0,
        categoryEntity: { name: 'Food' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedProduct = {
        ...mockProduct,
        verifiedCount: 1,
        creditScore: 0.5,
      };

      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(updatedProduct);

      const result = await service.updateProductVerification('product-uuid-1', 'verify');

      expect(result).toBeDefined();
      expect(result.id).toBe('product-uuid-1');
      expect(mockProductRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        verifiedCount: 1,
        creditScore: 0.5,
      }));
    });

    it('should update product verification (flag)', async () => {
      const mockProduct = {
        id: 1,
        productSk: 'product-uuid-1',
        name: 'Test Product',
        verifiedCount: 0,
        creditScore: 5,
        flaggedCount: 0,
        categoryEntity: { name: 'Food' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedProduct = {
        ...mockProduct,
        flaggedCount: 1,
        creditScore: 4.7,
      };

      mockProductRepository.findOne.mockResolvedValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(updatedProduct);

      const result = await service.updateProductVerification('product-uuid-1', 'flag');

      expect(result).toBeDefined();
      expect(result.id).toBe('product-uuid-1');
      expect(mockProductRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        flaggedCount: 1,
        creditScore: 4.7,
      }));
    });

    it('should throw NotFoundException if product not found', async () => {
      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(service.updateProductVerification('non-existent-uuid', 'verify'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('searchProductsByName', () => {
    it('should search products by name', async () => {
      const mockProducts = [
        {
          id: 1,
          productSk: 'product-uuid-1',
          name: 'Test Product',
          barcode: '1234567890',
          categoryEntity: { name: 'Food' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockProductRepository.find.mockResolvedValue(mockProducts);

      const result = await service.searchProductsByName('Test');
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Product');
      expect(mockProductRepository.find).toHaveBeenCalledWith({
        where: { name: expect.any(Object) }, // ILike object
        relations: ['categoryEntity'],
        take: 50,
        order: { name: 'ASC' },
      });
    });
  });
});