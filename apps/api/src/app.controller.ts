import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Health check endpoint to confirm the API is running.
   * GET /
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Retrieves all users from the User module.
   * GET /users
   */
  @Get('users')
  getUsers() {
    return this.appService.getUsers();
  }

  /**
   * Retrieves all products from the Product module.
   * GET /products
   */
  @Get('products')
  getProducts() {
    return this.appService.getProducts();
  }

  /**
   * Retrieves all receipts from the Receipt module.
   * GET /receipts
   */
  @Get('receipts')
  getReceipts() {
    return this.appService.getReceipts();
  }

  /**
   * Retrieves all receipt items from the ReceiptItem module.
   * GET /receipt-items
   */
  @Get('receipt-items')
  getReceiptItems() {
    return this.appService.getReceiptItems();
  }

  /**
   * Retrieves all stores from the Store module.
   * GET /stores
   */
  @Get('stores')
  getStores() {
    return this.appService.getStores();
  }

  /**
   * Retrieves the currently authenticated user from the Auth module.
   * GET /me
   */
  @Get('me')
  getMe() {
    return this.appService.getMe();
  }
}
