import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ReceiptItemService } from './receiptItem.service';
import { ReceiptItem } from '../entities/receipt-item.entity';

describe('ReceiptItemService', () => {
  let service: ReceiptItemService;
  let receiptItemRepository: Repository<ReceiptItem>;

  const mockReceiptItemRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptItemService,
        {
          provide: getRepositoryToken(ReceiptItem),
          useValue: mockReceiptItemRepository,
        },
      ],
    }).compile();

    service = module.get<ReceiptItemService>(ReceiptItemService);
    receiptItemRepository = module.get<Repository<ReceiptItem>>(getRepositoryToken(ReceiptItem));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllReceiptItems', () => {
    it('should return all receipt items', async () => {
      const mockItems = [
        {
          id: 1,
          receiptitemSk: 'item-uuid-1',
          receiptSk: 'receipt-uuid-1',
          productSk: 'product-uuid-1',
          price: 10.99,
          quantity: 2,
          lineTotal: 21.98,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockReceiptItemRepository.find.mockResolvedValue(mockItems);

      const result = await service.getAllReceiptItems();
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('item-uuid-1');
      expect(result[0].price).toBe(10.99);
      expect(result[0].quantity).toBe(2);
      expect(result[0].lineTotal).toBe(21.98);
      expect(mockReceiptItemRepository.find).toHaveBeenCalledWith({
        relations: ['receipt', 'product'],
        take: 100,
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getReceiptItemById', () => {
    it('should return receipt item by UUID', async () => {
      const mockItem = {
        id: 1,
        receiptitemSk: 'item-uuid-1',
        receiptSk: 'receipt-uuid-1',
        productSk: 'product-uuid-1',
        price: 10.99,
        quantity: 2,
        lineTotal: 21.98,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockReceiptItemRepository.findOne.mockResolvedValue(mockItem);

      const result = await service.getReceiptItemById('item-uuid-1');
      
      expect(result).toBeDefined();
      expect(result?.id).toBe('item-uuid-1');
      expect(result?.price).toBe(10.99);
      expect(mockReceiptItemRepository.findOne).toHaveBeenCalledWith({
        where: { receiptitemSk: 'item-uuid-1' },
        relations: ['receipt', 'product'],
      });
    });

    it('should return receipt item by integer ID if UUID not found', async () => {
      const mockItem = {
        id: 1,
        receiptitemSk: 'item-uuid-1',
        receiptSk: 'receipt-uuid-1',
        productSk: 'product-uuid-1',
        price: 10.99,
        quantity: 2,
        lineTotal: 21.98,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockReceiptItemRepository.findOne
        .mockResolvedValueOnce(null) // First call with UUID
        .mockResolvedValueOnce(mockItem); // Second call with integer ID

      const result = await service.getReceiptItemById('1');
      
      expect(result).toBeDefined();
      expect(result?.id).toBe('item-uuid-1');
      expect(mockReceiptItemRepository.findOne).toHaveBeenCalledTimes(2);
    });

    it('should return null if receipt item not found', async () => {
      mockReceiptItemRepository.findOne.mockResolvedValue(null);

      const result = await service.getReceiptItemById('non-existent-uuid');
      
      expect(result).toBeNull();
    });
  });

  describe('getReceiptItemsByReceiptId', () => {
    it('should return receipt items for a specific receipt', async () => {
      const mockItems = [
        {
          id: 1,
          receiptitemSk: 'item-uuid-1',
          receiptSk: 'receipt-uuid-1',
          productSk: 'product-uuid-1',
          price: 10.99,
          quantity: 2,
          lineTotal: 21.98,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          receiptitemSk: 'item-uuid-2',
          receiptSk: 'receipt-uuid-1',
          productSk: 'product-uuid-2',
          price: 5.99,
          quantity: 1,
          lineTotal: 5.99,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockReceiptItemRepository.find.mockResolvedValue(mockItems);

      const result = await service.getReceiptItemsByReceiptId('receipt-uuid-1');
      
      expect(result).toHaveLength(2);
      expect(result[0].receiptId).toBe('receipt-uuid-1');
      expect(result[1].receiptId).toBe('receipt-uuid-1');
      expect(mockReceiptItemRepository.find).toHaveBeenCalledWith({
        where: { receiptSk: 'receipt-uuid-1' },
        relations: ['receipt', 'product'],
        take: 50,
        order: { createdAt: 'ASC' },
      });
    });
  });

  describe('createReceiptItem', () => {
    it('should create a new receipt item', async () => {
      const mockItem = {
        id: 1,
        receiptitemSk: 'item-uuid-1',
        receiptSk: 'receipt-uuid-1',
        productSk: 'product-uuid-1',
        price: 10.99,
        quantity: 2,
        lineTotal: 21.98,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const itemData = {
        receiptId: 'receipt-uuid-1',
        productId: 'product-uuid-1',
        price: 10.99,
        quantity: 2,
        lineTotal: 21.98,
      };

      mockReceiptItemRepository.create.mockReturnValue(mockItem);
      mockReceiptItemRepository.save.mockResolvedValue(mockItem);
      mockReceiptItemRepository.findOne.mockResolvedValue(mockItem);

      const result = await service.createReceiptItem(itemData);

      expect(result).toBeDefined();
      expect(result.id).toBe('item-uuid-1');
      expect(result.price).toBe(10.99);
      expect(result.quantity).toBe(2);
      expect(result.lineTotal).toBe(21.98);
      expect(mockReceiptItemRepository.create).toHaveBeenCalledWith({
        receiptSk: 'receipt-uuid-1',
        productSk: 'product-uuid-1',
        price: 10.99,
        quantity: 2,
        lineTotal: 21.98,
      });
    });

    it('should create a receipt item with calculated line total', async () => {
      const mockItem = {
        id: 1,
        receiptitemSk: 'item-uuid-1',
        receiptSk: 'receipt-uuid-1',
        productSk: 'product-uuid-1',
        price: 10.99,
        quantity: 2,
        lineTotal: 21.98,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const itemData = {
        receiptId: 'receipt-uuid-1',
        productId: 'product-uuid-1',
        price: 10.99,
        quantity: 2,
        // No lineTotal provided - should be calculated
      };

      mockReceiptItemRepository.create.mockReturnValue(mockItem);
      mockReceiptItemRepository.save.mockResolvedValue(mockItem);
      mockReceiptItemRepository.findOne.mockResolvedValue(mockItem);

      const result = await service.createReceiptItem(itemData);

      expect(result).toBeDefined();
      expect(result.lineTotal).toBe(21.98);
      expect(mockReceiptItemRepository.create).toHaveBeenCalledWith({
        receiptSk: 'receipt-uuid-1',
        productSk: 'product-uuid-1',
        price: 10.99,
        quantity: 2,
        lineTotal: 21.98, // Calculated: 10.99 * 2
      });
    });
  });

  describe('updateReceiptItem', () => {
    it('should update a receipt item', async () => {
      const mockItem = {
        id: 1,
        receiptitemSk: 'item-uuid-1',
        receiptSk: 'receipt-uuid-1',
        productSk: 'product-uuid-1',
        price: 10.99,
        quantity: 2,
        lineTotal: 21.98,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedItem = {
        ...mockItem,
        quantity: 3,
        lineTotal: 32.97, // Recalculated: 10.99 * 3
      };

      // Mock getReceiptItemEntityById
      jest.spyOn(service as any, 'getReceiptItemEntityById').mockResolvedValue(mockItem);
      mockReceiptItemRepository.save.mockResolvedValue(updatedItem);
      mockReceiptItemRepository.findOne.mockResolvedValue(updatedItem);

      const result = await service.updateReceiptItem('item-uuid-1', { quantity: 3 });

      expect(result).toBeDefined();
      expect(result.quantity).toBe(3);
      expect(result.lineTotal).toBe(32.97);
    });

    it('should throw NotFoundException if receipt item not found', async () => {
      jest.spyOn(service as any, 'getReceiptItemEntityById').mockResolvedValue(null);

      await expect(service.updateReceiptItem('non-existent-uuid', { quantity: 3 }))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('getReceiptItemsTotal', () => {
    it('should calculate total for a receipt', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '45.97' }),
      };

      mockReceiptItemRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getReceiptItemsTotal('receipt-uuid-1');

      expect(result).toBe(45.97);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('SUM(item.lineTotal)', 'total');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('item.receiptSk = :receiptId', { receiptId: 'receipt-uuid-1' });
    });

    it('should return 0 if no items found', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: null }),
      };

      mockReceiptItemRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getReceiptItemsTotal('receipt-uuid-1');

      expect(result).toBe(0);
    });
  });

  describe('deleteReceiptItem', () => {
    it('should delete a receipt item', async () => {
      const mockItem = {
        id: 1,
        receiptitemSk: 'item-uuid-1',
        receiptSk: 'receipt-uuid-1',
        productSk: 'product-uuid-1',
        price: 10.99,
        quantity: 2,
        lineTotal: 21.98,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service as any, 'getReceiptItemEntityById').mockResolvedValue(mockItem);
      mockReceiptItemRepository.remove.mockResolvedValue(mockItem);

      await service.deleteReceiptItem('item-uuid-1');

      expect(mockReceiptItemRepository.remove).toHaveBeenCalledWith(mockItem);
    });

    it('should throw NotFoundException if receipt item not found', async () => {
      jest.spyOn(service as any, 'getReceiptItemEntityById').mockResolvedValue(null);

      await expect(service.deleteReceiptItem('non-existent-uuid'))
        .rejects
        .toThrow(NotFoundException);
    });
  });
});