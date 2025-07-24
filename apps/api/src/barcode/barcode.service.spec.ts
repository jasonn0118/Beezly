import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BarcodeService } from './barcode.service';
import { Product } from '../entities/product.entity';
import { NotFoundException } from '@nestjs/common';

describe('BarcodeService', () => {
  let service: BarcodeService;
  let productRepository: jest.Mocked<Repository<Product>>;

  const mockProduct: Partial<Product> = {
    id: 1,
    productSk: 'test-uuid',
    name: 'Test Product',
    barcode: '1234567890',
    creditScore: 5,
    verifiedCount: 10,
    flaggedCount: 0,
    categoryEntity: {
      id: 1,
      category1: 'Test Category',
      category2: null,
      category3: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      products: [],
    } as Product['categoryEntity'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BarcodeService,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BarcodeService>(BarcodeService);
    productRepository = module.get(getRepositoryToken(Product));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('lookupBarcode', () => {
    it('should return existing product when found', async () => {
      productRepository.findOne.mockResolvedValue(mockProduct as Product);

      const result = await service.lookupBarcode({
        barcode: '1234567890',
      });

      expect(result).toEqual({
        id: 'test-uuid',
        name: 'Test Product',
        barcode: '1234567890',
        brand: undefined,
        category: 1,
        barcodeType: undefined,
        image_url: undefined,
        isVerified: true,
      });
    });

    it('should create and return placeholder when product not found', async () => {
      productRepository.findOne.mockResolvedValue(null);
      productRepository.create.mockReturnValue({
        name: 'Unknown Product (9876543210)',
        barcode: '9876543210',
      } as Product);
      productRepository.save.mockResolvedValue({
        productSk: 'new-uuid',
        name: 'Unknown Product (9876543210)',
        barcode: '9876543210',
      } as Product);

      const result = await service.lookupBarcode({
        barcode: '9876543210',
      });

      expect(result).toEqual({
        id: 'new-uuid',
        name: 'Unknown Product (9876543210)',
        barcode: '9876543210',
        brand: undefined,
        category: undefined,
        isVerified: false,
      });
    });
  });

  describe('getProductByBarcode', () => {
    it('should return product when found', async () => {
      productRepository.findOne.mockResolvedValue(mockProduct as Product);

      const result = await service.getProductByBarcode('1234567890');

      expect(result).toEqual({
        id: 'test-uuid',
        name: 'Test Product',
        barcode: '1234567890',
        brand: undefined,
        category: 1,
        barcodeType: undefined,
        image_url: undefined,
        isVerified: true,
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.getProductByBarcode('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for empty barcode', async () => {
      await expect(service.getProductByBarcode('')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
