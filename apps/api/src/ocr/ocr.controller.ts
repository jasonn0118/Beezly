import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
  HttpException,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { OcrService, OcrResult, CleanOcrResult } from './ocr.service';
import { ReceiptService } from '../receipt/receipt.service';
import { ReceiptNormalizationService } from '../receipt/receipt-normalization.service';
import { upload_receipt } from '../utils/storage.util';
import {
  ProcessReceiptDto,
  ProcessReceiptEnhancedDto,
} from './dto/process-receipt.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserProfileDTO } from '../../../packages/types/dto/user';

@ApiTags('OCR')
@Controller('ocr')
@UseGuards(JwtAuthGuard) // Apply JWT Auth Guard to all routes in this controller
export class OcrController {
  constructor(
    private readonly ocrService: OcrService,
    private readonly receiptService: ReceiptService,
    private readonly normalizationService: ReceiptNormalizationService,
    private readonly configService: ConfigService,
  ) {}

  @Post('health')
  @Public() // Allow health check without authentication
  @ApiOperation({
    summary: 'Health check for OCR service',
    description:
      'Check if the OCR service is running and Azure credentials are configured via environment variables',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        azure_configured: { type: 'boolean' },
      },
    },
  })
  healthCheck() {
    // Check if Azure is configured via environment variables
    const azureEndpoint = this.configService.get<string>(
      'AZURE_FORM_RECOGNIZER_ENDPOINT',
    );
    const azureApiKey = this.configService.get<string>(
      'AZURE_FORM_RECOGNIZER_API_KEY',
    );

    const azureConfigured = !!(azureEndpoint && azureApiKey);

    return {
      success: true,
      message: 'OCR service is running',
      azure_configured: azureConfigured,
    };
  }

  @Post('process-receipt')
  @ApiOperation({
    summary: 'Process receipt image and extract data',
    description:
      'Upload a receipt image and extract structured data using Azure Form Recognizer or fallback OCR. The image is saved to storage asynchronously for better performance.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'Receipt image file (PNG, JPG, JPEG, BMP, TIFF, WebP, HEIC, HEIF supported)',
        },
        store_id: {
          type: 'string',
          description: 'Store ID for file organization (optional)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Receipt processed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            merchant: { type: 'string' },
            store_address: { type: 'string' },
            date: { type: 'string' },
            time: { type: 'string' },
            total: { type: 'number' },
            subtotal: { type: 'number' },
            tax: { type: 'number' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  price: { type: 'string' },
                  quantity: { type: 'string' },
                  unit_price: { type: 'string' },
                },
              },
            },
            raw_text: { type: 'string' },
            azure_confidence: { type: 'number' },
            engine_used: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid file or missing parameters',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - OCR processing failed',
  })
  @UseInterceptors(FileInterceptor('file'))
  async processReceipt(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: ProcessReceiptDto,
    @CurrentUser() user: UserProfileDTO,
  ): Promise<{ success: boolean; data: OcrResult }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Check file type
    const allowedMimeTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/bmp',
      'image/tiff',
      'image/webp',
      'image/heic',
      'image/heif',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Supported types: ${allowedMimeTypes.join(', ')}`,
      );
    }

    // Check file size (50MB limit to match Azure)
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxFileSize) {
      throw new BadRequestException(
        `File size too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Maximum allowed: 50MB`,
      );
    }

    try {
      // Use environment variables only
      const azureEndpoint = this.configService.get<string>(
        'AZURE_FORM_RECOGNIZER_ENDPOINT',
      );
      const azureApiKey = this.configService.get<string>(
        'AZURE_FORM_RECOGNIZER_API_KEY',
      );

      if (!azureEndpoint || !azureApiKey) {
        throw new BadRequestException(
          'Azure Form Recognizer credentials not configured. Please set AZURE_FORM_RECOGNIZER_ENDPOINT and AZURE_FORM_RECOGNIZER_API_KEY environment variables.',
        );
      }

      // Process OCR first
      const result = await this.ocrService.processReceipt(
        file.buffer,
        azureEndpoint,
        azureApiKey,
      );

      // Upload file to storage asynchronously (fire-and-forget)
      const userId = user.id; // Use authenticated user's ID
      const storeId = body.store_id || 'default_store';

      console.log(`Starting async upload for user ${userId}, store ${storeId}`);

      // Fire-and-forget upload - don't await to avoid blocking response
      upload_receipt(userId, storeId, file.buffer, file.mimetype)
        .then((uploadedFilePath) => {
          if (uploadedFilePath) {
            console.log(
              `Receipt uploaded successfully to: ${uploadedFilePath}`,
            );
          } else {
            console.warn('Failed to upload receipt to storage');
          }
        })
        .catch((error) => {
          console.error('Error uploading receipt to storage:', error);
        });

      // Note: uploaded_file_path is not included in immediate response
      // since upload happens asynchronously

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('process-receipt-enhanced')
  @Public() // Allow non-authenticated users to upload receipts
  @ApiOperation({
    summary: 'Process receipt image with product normalization',
    description:
      'Upload a receipt image, extract data using OCR, normalize product names to canonical forms, and create receipt record in database. Always includes discount detection and confidence scoring. Authentication is optional - non-authenticated users can upload receipts.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'Receipt image file (PNG, JPG, JPEG, BMP, TIFF, WebP, HEIC, HEIF supported)',
        },
        user_id: {
          type: 'string',
          description:
            'User ID for file organization (optional for non-authenticated users)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Receipt processed, normalized, and saved to database successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            merchant: { type: 'string' },
            store_address: { type: 'string' },
            date: { type: 'string' },
            time: { type: 'string' },
            total: { type: 'number' },
            subtotal: { type: 'number' },
            tax: { type: 'number' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  normalized_name: { type: 'string' },
                  brand: { type: 'string' },
                  category: { type: 'string' },
                  quantity: { type: 'string' },
                  unit_price: { type: 'string' },
                  item_number: { type: 'string' },
                  confidence_score: { type: 'number' },
                  normalized_product_sk: { type: 'string' },
                  linked_discounts: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        discount_id: { type: 'string' },
                        discount_amount: { type: 'number' },
                        discount_type: {
                          type: 'string',
                          enum: ['percentage', 'fixed', 'unknown'],
                        },
                        discount_description: { type: 'string' },
                        link_confidence: { type: 'number' },
                      },
                    },
                  },
                  applied_to_product_id: { type: 'string' },
                  original_price: { type: 'number' },
                  final_price: { type: 'number' },
                },
              },
            },
            normalization_summary: {
              type: 'object',
              properties: {
                total_items: { type: 'number' },
                product_items: { type: 'number' },
                discount_items: { type: 'number' },
                adjustment_items: { type: 'number' },
                average_confidence: { type: 'number' },
                linked_discounts: { type: 'number' },
                total_discount_amount: { type: 'number' },
                products_with_discounts: { type: 'number' },
              },
            },
            raw_text: { type: 'string' },
            azure_confidence: { type: 'number' },
            engine_used: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid file or missing parameters',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error - OCR or normalization processing failed',
  })
  @UseInterceptors(FileInterceptor('file'))
  async processReceiptEnhanced(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: ProcessReceiptEnhancedDto,
    @Req() request: Request & { user?: UserProfileDTO },
  ): Promise<{ success: boolean; data: CleanOcrResult | OcrResult }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Check file type
    const allowedMimeTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/bmp',
      'image/tiff',
      'image/webp',
      'image/heic',
      'image/heif',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Supported types: ${allowedMimeTypes.join(', ')}`,
      );
    }

    // Check file size (50MB limit to match Azure)
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxFileSize) {
      throw new BadRequestException(
        `File size too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Maximum allowed: 50MB`,
      );
    }

    try {
      // Use environment variables only
      const azureEndpoint = this.configService.get<string>(
        'AZURE_FORM_RECOGNIZER_ENDPOINT',
      );
      const azureApiKey = this.configService.get<string>(
        'AZURE_FORM_RECOGNIZER_API_KEY',
      );

      if (!azureEndpoint || !azureApiKey) {
        throw new BadRequestException(
          'Azure Form Recognizer credentials not configured. Please set AZURE_FORM_RECOGNIZER_ENDPOINT and AZURE_FORM_RECOGNIZER_API_KEY environment variables.',
        );
      }

      // Use authenticated user's ID if available, otherwise use body.user_id or default
      const userId = request.user?.id || body.user_id || 'anonymous_user';
      const storeId = 'default_store'; // Always use default store

      console.log(
        `Starting parallel processing: OCR + Storage upload for user ${userId}, store ${storeId}`,
      );

      // Run OCR processing and file upload in parallel
      const [result, uploadResult] = await Promise.allSettled([
        // OCR Processing (main operation) - using WithNormalization for database compatibility
        this.ocrService.processReceiptWithNormalization(
          file.buffer,
          azureEndpoint,
          azureApiKey,
        ),
        // Storage upload (parallel operation)
        upload_receipt(userId, storeId, file.buffer, file.mimetype),
      ]);

      // Handle OCR result (must succeed)
      if (result.status === 'rejected') {
        throw new Error(`OCR processing failed: ${result.reason}`);
      }
      const ocrResult = result.value;

      // Handle upload result (optional, can fail)
      let uploadedFilePath: string | undefined;
      if (uploadResult.status === 'fulfilled' && uploadResult.value) {
        uploadedFilePath = uploadResult.value;
        console.log(`Receipt uploaded successfully to: ${uploadedFilePath}`);
      } else {
        console.error(
          'Error uploading receipt to storage:',
          uploadResult.status === 'rejected'
            ? uploadResult.reason
            : 'Upload failed',
        );
        // Continue without file path - not critical for OCR processing
      }

      // Always create receipt record in database
      let receiptId: string | undefined;

      try {
        // Use the already processed OCR result from the parallel processing
        const receipt = await this.receiptService.createReceiptFromOcrResult(
          ocrResult,
          userId, // Pass the determined user ID (authenticated, provided, or anonymous)
          uploadedFilePath,
        );
        receiptId = receipt.receiptSk;
        console.log(`Receipt created in database with ID: ${receiptId}`);

        // Note: Normalization already completed during processReceiptWithNormalization()
        // No additional background normalization needed - saves ~815ms
      } catch (error) {
        console.error('Error creating receipt in database:', error);
        // Continue without receipt creation - OCR result still valid
      }

      // Convert EnhancedOcrResult to CleanOcrResult for API response
      const cleanResult = this.ocrService.convertToCleanResult(ocrResult);

      return {
        success: true,
        data: {
          ...cleanResult,
          // Add receipt_id to response if created
          ...(receiptId && { receipt_id: receiptId }),
          // Add uploaded file path to response if available
          ...(uploadedFilePath && { uploaded_file_path: uploadedFilePath }),
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
