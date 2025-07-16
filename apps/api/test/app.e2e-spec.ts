import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from './../src/app.controller';
import { AppService } from './../src/app.service';
import { AuthService } from './../src/auth/auth.service';
import { ProductService } from './../src/product/product.service';
import { ReceiptService } from './../src/receipt/receipt.service';
import { ReceiptItemService } from './../src/receiptItem/receiptItem.service';
import { StoreService } from './../src/store/store.service';
import { UserService } from './../src/user/user.service';
import { CategoryService } from 'src/category/category.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;

  // Mock services
  const mockAuthService = {
    getUser: jest.fn().mockResolvedValue({ id: 'test-user' }),
  };

  const mockProductService = {
    getAllProducts: jest.fn().mockResolvedValue([]),
  };

  const mockReceiptService = {
    getAllReceipts: jest.fn().mockResolvedValue([]),
  };

  const mockReceiptItemService = {
    getAllReceiptItems: jest.fn().mockResolvedValue([]),
  };

  const mockStoreService = {
    getAllStores: jest.fn().mockResolvedValue([]),
  };

  const mockUserService = {
    getAllUsers: jest.fn().mockResolvedValue([]),
  };

  const mockCategoryService = {
    getAllCategories: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create a minimal test module with mocked dependencies
    moduleFixture = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: ProductService, useValue: mockProductService },
        { provide: ReceiptService, useValue: mockReceiptService },
        { provide: ReceiptItemService, useValue: mockReceiptItemService },
        { provide: StoreService, useValue: mockStoreService },
        { provide: UserService, useValue: mockUserService },
        { provide: CategoryService, useValue: mockCategoryService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 10000); // Increased timeout to 10 seconds

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('API is running!');
  });
});
