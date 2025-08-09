import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { BarcodeService } from './barcode.service';
import { ProductResponseDto } from './dto/product-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BarcodeType } from '@beezly/types';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserProfileDTO } from '../../../packages/types/dto/user';
import { GameScoreService } from '../gamification/game-score.service';

@ApiTags('Barcodes')
@Controller('barcode')
export class BarcodeController {
  constructor(
    private readonly barcodeService: BarcodeService,
    private readonly gameScoreService: GameScoreService,
  ) {}

  @Public()
  @Get(':barcode')
  @ApiOperation({ summary: 'Get product by barcode' })
  @ApiParam({
    name: 'barcode',
    description: 'The barcode string to lookup',
    example: '0123456789012',
  })
  @ApiQuery({
    name: 'type',
    description: 'The type of barcode',
    enum: BarcodeType,
    required: false,
    example: BarcodeType.EAN13,
  })
  @ApiResponse({
    status: 200,
    description: 'Product found',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductByBarcode(
    @Param('barcode') barcode: string,
    @Query('type') barcodeType?: BarcodeType,
  ): Promise<ProductResponseDto> {
    return this.barcodeService.getProductByBarcode(barcode, barcodeType);
  }

  @Public()
  @Post('lookup')
  @ApiOperation({
    summary: 'Lookup product by barcode (POST method for mobile compatibility)',
  })
  @ApiBody({
    description: 'Barcode lookup request',
    schema: {
      type: 'object',
      properties: {
        barcode: { type: 'string', example: '0123456789012' },
        type: {
          type: 'string',
          enum: Object.values(BarcodeType),
        },
      },
      required: ['barcode'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Product found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        product: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            barcode: { type: 'string' },
            barcodeType: { type: 'string', enum: Object.values(BarcodeType) },
            brand: { type: 'string' },
            category: { type: 'number' },
            image_url: { type: 'string' },
            isVerified: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Product not found' },
      },
    },
  })
  async lookupProductByBarcode(
    @Body() body: { barcode: string; type?: BarcodeType },
  ): Promise<{
    success: boolean;
    product?: ProductResponseDto;
    message?: string;
  }> {
    try {
      const product = await this.barcodeService.getProductByBarcode(
        body.barcode,
        body.type,
      );
      return { success: true, product };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Product not found',
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('scan')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Scan barcode and award points (authenticated users only)',
  })
  @ApiBody({
    description: 'Authenticated barcode scan request',
    schema: {
      type: 'object',
      properties: {
        barcode: { type: 'string', example: '0123456789012' },
        type: {
          type: 'string',
          enum: Object.values(BarcodeType),
        },
      },
      required: ['barcode'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Product found and points awarded',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        product: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            barcode: { type: 'string' },
            barcodeType: { type: 'string', enum: Object.values(BarcodeType) },
            brand: { type: 'string' },
            category: { type: 'number' },
            image_url: { type: 'string' },
            isVerified: { type: 'boolean' },
          },
        },
        pointsAwarded: { type: 'number' },
        newBadges: { type: 'number' },
        rankChange: {
          type: 'object',
          properties: {
            oldTier: { type: 'string' },
            newTier: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Product not found' },
      },
    },
  })
  async scanBarcodeAuthenticated(
    @CurrentUser() user: UserProfileDTO,
    @Body() body: { barcode: string; type?: BarcodeType },
  ): Promise<{
    success: boolean;
    product?: ProductResponseDto;
    message?: string;
    pointsAwarded?: number;
    newBadges?: number;
    rankChange?: any;
  }> {
    try {
      // First, get the product
      const product = await this.barcodeService.getProductByBarcode(
        body.barcode,
        body.type,
      );

      // Award points for barcode scanning
      try {
        const scoreResult = await this.gameScoreService.awardPoints(
          user.id,
          'BARCODE_SCAN',
          body.barcode,
          'barcode',
          1,
          {
            barcodeType: body.type || 'unknown',
            productFound: true,
            productName: product.name,
          },
        );

        return {
          success: true,
          product,
          pointsAwarded: scoreResult.activityLog.pointsAwarded,
          newBadges: scoreResult.newBadges?.length || 0,
          rankChange: scoreResult.rankChange,
        };
      } catch (scoreError) {
        console.error('Error awarding barcode scan points:', scoreError);
        // Still return the product even if scoring fails
        return {
          success: true,
          product,
          pointsAwarded: 0,
        };
      }
    } catch (error) {
      // Award points even if product is not found (user still scanned)
      try {
        const scoreResult = await this.gameScoreService.awardPoints(
          user.id,
          'BARCODE_SCAN',
          body.barcode,
          'barcode',
          0.5, // Lower multiplier for unsuccessful scans
          {
            barcodeType: body.type || 'unknown',
            productFound: false,
          },
        );

        return {
          success: false,
          message: error instanceof Error ? error.message : 'Product not found',
          pointsAwarded: scoreResult.activityLog.pointsAwarded,
          newBadges: scoreResult.newBadges?.length || 0,
        };
      } catch (scoreError) {
        console.error('Error awarding barcode scan points:', scoreError);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Product not found',
          pointsAwarded: 0,
        };
      }
    }
  }
}
