import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
import { ProductService } from './product/product.service';
import { ReceiptService } from './receipt/receipt.service';
import { ReceiptItemService } from './receiptItem/receiptItem.service';
import { StoreService } from './store/store.service';
import { UserService } from './user/user.service';
import { CategoryService } from './category/category.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: AuthService, useValue: {} },
        { provide: ProductService, useValue: {} },
        { provide: ReceiptService, useValue: {} },
        { provide: ReceiptItemService, useValue: {} },
        { provide: StoreService, useValue: {} },
        { provide: CategoryService, useValue: {} },
        {
          provide: UserService,
          useValue: {
            getAllUsers: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    appController = moduleRef.get<AppController>(AppController);
  });

  describe('getUsers', () => {
    it('should return an array (mock test)', async () => {
      const result = await appController.getUsers();
      console.log(result);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
});
