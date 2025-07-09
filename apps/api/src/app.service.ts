import { Injectable } from '@nestjs/common';
import { AuthService } from './auth/auth.service';
import { ProductService } from './product/product.service';
import { ReceiptService } from './receipt/receipt.service';
import { ReceiptItemService } from './receiptItem/receiptItem.service';
import { StoreService } from './store/store.service';
import { UserService } from './user/user.service';

@Injectable()
export class AppService {
  constructor(
    private readonly authService: AuthService,
    private readonly productService: ProductService,
    private readonly receiptService: ReceiptService,
    private readonly receiptItemService: ReceiptItemService,
    private readonly storeService: StoreService,
    private readonly userService: UserService,
  ) {}

  /**
   * Returns a health check message to confirm that the API is running.
   */
  getHello(): string {
    return 'API is running!';
  }

  /**
   * Fetches all users from the User module.
   */
  async getUsers() {
    return this.userService.getAllUsers();
  }

  /**
   * Fetches all products from the Product module.
   */
  async getProducts() {
    return this.productService.getAllProducts();
  }

  /**
   * Fetches all receipts from the Receipt module.
   */
  async getReceipts() {
    return this.receiptService.getAllReceipts();
  }

  /**
   * Fetches all receipt items from the ReceiptItem module.
   */
  async getReceiptItems() {
    return this.receiptItemService.getAllReceiptItems();
  }

  /**
   * Fetches all stores from the Store module.
   */
  async getStores() {
    return this.storeService.getAllStores();
  }

  /**
   * Fetches the current authenticated user from the Auth module.
   */
  async getMe() {
    return this.authService.getUser();
  }
}
