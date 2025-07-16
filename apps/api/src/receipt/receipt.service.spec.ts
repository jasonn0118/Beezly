import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReceiptService } from './receipt.service';
import { Receipt } from '../entities/receipt.entity';
import { Store } from '../entities/store.entity';
import { UserService } from '../user/user.service';
import { StoreService } from '../store/store.service';
import { ProductService } from '../product/product.service';

describe('ReceiptService', () => {
  let service: ReceiptService;

  const mockReceiptRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
  };

  const mockStoreRepository = {
    findOne: jest.fn(),
  };

  const mockUserService = {
    getUserById: jest.fn(),
  };

  const mockStoreService = {
    getStoreById: jest.fn(),
  };

  const mockProductService = {
    getProductByBarcode: jest.fn(),
    createProduct: jest.fn(),
    getProductById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptService,
        {
          provide: getRepositoryToken(Receipt),
          useValue: mockReceiptRepository,
        },
        {
          provide: getRepositoryToken(Store),
          useValue: mockStoreRepository,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: StoreService,
          useValue: mockStoreService,
        },
        {
          provide: ProductService,
          useValue: mockProductService,
        },
      ],
    }).compile();

    service = module.get<ReceiptService>(ReceiptService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllReceipts', () => {
    it('should return all receipts', async () => {
      const mockReceipts = [
        {
          id: 1,
          receiptSk: 'receipt-uuid-1',
          userSk: 'user-uuid-1',
          storeSk: 'store-uuid-1',
          status: 'done',
          items: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockReceiptRepository.find.mockResolvedValue(mockReceipts);

      // Mock the mapReceiptToDTO method
      jest.spyOn(service as any, 'mapReceiptToDTO').mockResolvedValue({
        id: 'receipt-uuid-1',
        userId: 'user-uuid-1',
        storeName: 'Test Store',
        purchaseDate: new Date().toISOString(),
        status: 'done',
        totalAmount: 0,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await service.getAllReceipts();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('receipt-uuid-1');
      expect(mockReceiptRepository.find).toHaveBeenCalledWith({
        relations: ['user', 'store', 'items', 'items.product'],
        take: 50,
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getReceiptById', () => {
    it('should return receipt by UUID', async () => {
      const mockReceipt = {
        id: 1,
        receiptSk: 'receipt-uuid-1',
        userSk: 'user-uuid-1',
        storeSk: 'store-uuid-1',
        status: 'done',
        items: [],
        store: { name: 'Test Store' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockReceiptRepository.findOne.mockResolvedValue(mockReceipt);

      // Mock the mapReceiptToDTO method
      jest.spyOn(service as any, 'mapReceiptToDTO').mockResolvedValue({
        id: 'receipt-uuid-1',
        userId: 'user-uuid-1',
        storeName: 'Test Store',
        purchaseDate: new Date().toISOString(),
        status: 'done',
        totalAmount: 0,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await service.getReceiptById('receipt-uuid-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('receipt-uuid-1');
      expect(mockReceiptRepository.findOne).toHaveBeenCalledWith({
        where: { receiptSk: 'receipt-uuid-1' },
        relations: ['user', 'store', 'items', 'items.product'],
      });
    });

    it('should return null if receipt not found', async () => {
      mockReceiptRepository.findOne.mockResolvedValue(null);

      const result = await service.getReceiptById('non-existent-uuid');

      expect(result).toBeNull();
    });
  });

  describe('createReceipt', () => {
    it('should create a receipt with items', async () => {
      const mockUser = { id: 'user-uuid-1', email: 'test@example.com' };
      const mockStore = { id: 'store-uuid-1', name: 'Test Store' };
      const mockProduct = { id: 'product-uuid-1', name: 'Test Product' };

      const receiptData = {
        userId: 'user-uuid-1',
        storeId: 'store-uuid-1',
        items: [
          {
            productName: 'Test Product',
            barcode: '1234567890',
            category: 'Food',
            price: 10.99,
            quantity: 2,
          },
        ],
      };

      const mockReceipt = {
        id: 1,
        receiptSk: 'receipt-uuid-1',
        userSk: 'user-uuid-1',
        storeSk: 'store-uuid-1',
        status: 'done',
        items: [],
        store: mockStore,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the transaction manager
      const mockManager = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
      };

      mockReceiptRepository.manager.transaction.mockImplementation(
        (callback: (manager: any) => Promise<any>) => {
          return Promise.resolve(callback(mockManager));
        },
      );

      // Mock services
      mockUserService.getUserById.mockResolvedValue(mockUser);
      mockStoreService.getStoreById.mockResolvedValue(mockStore);
      mockProductService.getProductByBarcode.mockResolvedValue(mockProduct);

      // Mock manager methods
      mockManager.create.mockReturnValue(mockReceipt);
      mockManager.save.mockResolvedValue(mockReceipt);
      mockManager.findOne.mockResolvedValue(mockReceipt);

      // Mock the mapReceiptToDTO method
      jest.spyOn(service as any, 'mapReceiptToDTO').mockResolvedValue({
        id: 'receipt-uuid-1',
        userId: 'user-uuid-1',
        storeName: 'Test Store',
        purchaseDate: new Date().toISOString(),
        status: 'done',
        totalAmount: 21.98,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await service.createReceipt(receiptData);

      expect(result).toBeDefined();
      expect(result.id).toBe('receipt-uuid-1');
      expect(result.status).toBe('done');
      expect(mockUserService.getUserById).toHaveBeenCalledWith('user-uuid-1');
      expect(mockStoreService.getStoreById).toHaveBeenCalledWith(
        'store-uuid-1',
      );
      expect(mockProductService.getProductByBarcode).toHaveBeenCalledWith(
        '1234567890',
      );
    });

    it('should create a receipt without user', async () => {
      const receiptData = {
        storeName: 'Test Store',
        items: [
          {
            productName: 'Test Product',
            price: 5.99,
            quantity: 1,
          },
        ],
      };

      const mockReceipt = {
        id: 1,
        receiptSk: 'receipt-uuid-1',
        userSk: undefined,
        storeSk: undefined,
        status: 'done',
        items: [],
        store: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the transaction manager
      const mockManager = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
      };

      mockReceiptRepository.manager.transaction.mockImplementation(
        (callback: (manager: any) => Promise<any>) => {
          return Promise.resolve(callback(mockManager));
        },
      );

      // Mock store lookup
      mockStoreRepository.findOne.mockResolvedValue(null);
      mockProductService.getProductByBarcode.mockResolvedValue(null);
      mockProductService.createProduct.mockResolvedValue({
        id: 'product-uuid-1',
        name: 'Test Product',
      });

      // Mock manager methods
      mockManager.create.mockReturnValue(mockReceipt);
      mockManager.save.mockResolvedValue(mockReceipt);
      mockManager.findOne.mockResolvedValue(mockReceipt);

      // Mock the mapReceiptToDTO method
      jest.spyOn(service as any, 'mapReceiptToDTO').mockResolvedValue({
        id: 'receipt-uuid-1',
        userId: undefined,
        storeName: 'Unknown Store',
        purchaseDate: new Date().toISOString(),
        status: 'done',
        totalAmount: 5.99,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await service.createReceipt(receiptData);

      expect(result).toBeDefined();
      expect(result.id).toBe('receipt-uuid-1');
      expect(result.status).toBe('done');
      expect(mockProductService.createProduct).toHaveBeenCalledWith({
        name: 'Test Product',
        barcode: undefined,
        category: undefined,
      });
    });
  });

  describe('updateReceipt', () => {
    it('should update receipt status', async () => {
      const mockReceipt = {
        id: 1,
        receiptSk: 'receipt-uuid-1',
        status: 'pending',
        purchaseDate: new Date(),
        store: { name: 'Test Store' },
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedReceipt = {
        ...mockReceipt,
        status: 'done',
      };

      // Mock getReceiptEntityById
      jest
        .spyOn(service as any, 'getReceiptEntityById')
        .mockResolvedValue(mockReceipt);
      mockReceiptRepository.save.mockResolvedValue(updatedReceipt);
      mockReceiptRepository.findOne.mockResolvedValue(updatedReceipt);

      // Mock the mapReceiptToDTO method
      jest.spyOn(service as any, 'mapReceiptToDTO').mockResolvedValue({
        id: 'receipt-uuid-1',
        userId: undefined,
        storeName: 'Test Store',
        purchaseDate: new Date().toISOString(),
        status: 'done',
        totalAmount: 0,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await service.updateReceipt('receipt-uuid-1', {
        status: 'done',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('done');
      expect(mockReceiptRepository.save).toHaveBeenCalledWith(updatedReceipt);
    });
  });
});
