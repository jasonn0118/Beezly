import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { OcrService, OcrResult } from './ocr.service';
import { upload_receipt } from '../utils/storage.util';
import { ProcessReceiptDto } from './dto/process-receipt.dto';

@ApiTags('OCR')
@Controller('ocr')
export class OcrController {
  constructor(
    private readonly ocrService: OcrService,
    private readonly configService: ConfigService,
  ) {}

  @Post('health')
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
        user_id: {
          type: 'string',
          description: 'User ID for file organization (optional)',
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
            total: { type: 'string' },
            subtotal: { type: 'string' },
            tax: { type: 'string' },
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
      const userId = body.user_id || 'default_user';
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
}
