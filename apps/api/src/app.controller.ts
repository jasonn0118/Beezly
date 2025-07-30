import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Health check endpoint to confirm the API is running.
   * GET /
   */
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'API is running' })
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Retrieves all categories from the Category module.
   * GET /categories
   */
  @Get('categories')
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved categories',
  })
  getCategories() {
    return this.appService.getCategories();
  }

  /**
   * Retrieves the currently authenticated user from the Auth module.
   * GET /me
   */
  @Get('me')
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved current user',
  })
  getMe() {
    return this.appService.getMe();
  }

  /**
   * Retrieves all products from the Product module.
   * GET /products
   */
  @Get('products')
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved products' })
  getProducts() {
    return this.appService.getProducts();
  }

  /**
   * Retrieves all receipt items from the ReceiptItem module.
   * GET /receipt-items
   */
  @Get('receipt-items')
  @ApiOperation({ summary: 'Get all receipt items' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved receipt items',
  })
  getReceiptItems() {
    return this.appService.getReceiptItems();
  }

  /**
   * Retrieves all receipts from the Receipt module.
   * GET /receipts
   */
  @Get('receipts')
  @ApiOperation({ summary: 'Get all receipts' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved receipts' })
  getReceipts() {
    return this.appService.getReceipts();
  }

  /**
   * Retrieves all stores from the Store module.
   * GET /stores
   */
  @Get('stores')
  @ApiOperation({ summary: 'Get all stores' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved stores' })
  getStores() {
    return this.appService.getStores();
  }

  /**
   * Retrieves all users from the User module.
   * GET /users
   */
  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved users' })
  getUsers() {
    return this.appService.getUsers();
  }
}
