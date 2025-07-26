import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PriceService } from './price.service';

@ApiTags('Prices')
@Controller('prices')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get('product/:productSk')
  @ApiOperation({ summary: 'Get all prices for a product' })
  @ApiResponse({
    status: 200,
    description: 'List of prices for the product across different stores',
  })
  async getPricesByProduct(@Param('productSk') productSk: string) {
    return this.priceService.getPricesByProduct(productSk);
  }

  @Get('store/:storeSk')
  @ApiOperation({ summary: 'Get all prices at a store' })
  @ApiResponse({
    status: 200,
    description: 'List of product prices at the store',
  })
  async getPricesByStore(@Param('storeSk') storeSk: string) {
    return this.priceService.getPricesByStore(storeSk);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest price for a product at a store' })
  @ApiQuery({ name: 'productSk', required: true })
  @ApiQuery({ name: 'storeSk', required: true })
  @ApiResponse({
    status: 200,
    description: 'Latest price information',
  })
  async getLatestPrice(
    @Query('productSk') productSk: string,
    @Query('storeSk') storeSk: string,
  ) {
    return this.priceService.getLatestPrice(productSk, storeSk);
  }
}
