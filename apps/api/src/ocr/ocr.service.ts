/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import * as heicConvert from 'heic-convert';
import { OcrAzureService } from './ocr-azure.service';

export interface OcrItem {
  name: string;
  price: string;
  quantity: string;
  unit_price?: string;
  item_number?: string;
}

export interface OcrResult {
  merchant: string;
  store_address?: string;
  date: string;
  time?: string;
  total: string;
  subtotal?: string;
  tax?: string;
  items: OcrItem[];
  item_count: number;
  raw_text: string;
  azure_confidence?: number;
  engine_used: string;
  uploaded_file_path?: string;
}

@Injectable()
export class OcrService {
  constructor(private readonly ocrAzureService: OcrAzureService) {}

  /**
   * Load and process image with format support
   * Azure Document Intelligence supports: JPEG/JPG, PNG, BMP, TIFF, HEIF (but not HEIC)
   */
  async loadImageWithFormatSupport(buffer: Buffer): Promise<Buffer> {
    try {
      // Check if the buffer is HEIC/HEIF format
      const isHeic = this.isHeicBuffer(buffer);

      if (isHeic) {
        // Convert HEIC to JPEG for Azure Document Intelligence compatibility
        console.log(
          'HEIC format detected, converting to JPEG for Azure compatibility',
        );

        // Convert HEIC to JPEG using heic-convert
        const jpegBuffer = await heicConvert({
          buffer: buffer,
          format: 'JPEG',
          quality: 0.9, // 90% quality for OCR
        });

        console.log(
          `HEIC converted to JPEG. Original size: ${buffer.length}, JPEG size: ${jpegBuffer.length}`,
        );
        return Buffer.from(jpegBuffer);
      } else {
        // For other formats, apply standard preprocessing
        const processedBuffer = await sharp(buffer)
          .removeAlpha()
          .toColorspace('srgb')
          .jpeg()
          .toBuffer();
        return processedBuffer;
      }
    } catch (error) {
      throw new Error(
        `Error loading image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Check if buffer contains HEIC/HEIF data
   */
  private isHeicBuffer(buffer: Buffer): boolean {
    // HEIC files start with specific byte patterns
    // Check for 'ftyp' at offset 4 and 'heic' or 'mif1' afterwards
    if (buffer.length < 12) return false;

    const ftypOffset = buffer.indexOf('ftyp', 4);
    if (ftypOffset === -1) return false;

    const brand = buffer.subarray(ftypOffset + 4, ftypOffset + 8).toString();
    return brand === 'heic' || brand === 'heix' || brand === 'mif1';
  }

  /**
   * Compress image to fit within Azure's size limits while maintaining OCR quality
   */
  async compressImageForAzure(
    buffer: Buffer,
    maxSizeMb: number = 10,
  ): Promise<Buffer> {
    try {
      const maxSizeBytes = maxSizeMb * 1024 * 1024;
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Start with reasonable dimensions for OCR
      const maxDimension = 2048;
      let width = metadata.width;
      let height = metadata.height;

      // Resize if image is too large
      if (Math.max(width, height) > maxDimension) {
        if (width > height) {
          width = maxDimension;
          height = Math.round(
            (metadata.height * maxDimension) / metadata.width,
          );
        } else {
          height = maxDimension;
          width = Math.round((metadata.width * maxDimension) / metadata.height);
        }
      }

      // Try different compression levels
      let quality = 95;
      let compressedBuffer: Buffer = Buffer.alloc(0);

      while (quality > 20) {
        compressedBuffer = await image
          .resize(width, height, { fit: 'inside' })
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();

        if (compressedBuffer.length <= maxSizeBytes) {
          break;
        }

        quality -= 10;
      }

      // If still too large, try more aggressive resizing
      if (compressedBuffer.length > maxSizeBytes && quality <= 20) {
        let scaleFactor = 0.8;

        while (compressedBuffer.length > maxSizeBytes && scaleFactor > 0.3) {
          const newWidth = Math.round(width * scaleFactor);
          const newHeight = Math.round(height * scaleFactor);

          compressedBuffer = await image
            .resize(newWidth, newHeight, { fit: 'inside' })
            .jpeg({ quality: 85, mozjpeg: true })
            .toBuffer();

          if (compressedBuffer.length <= maxSizeBytes) {
            break;
          }

          scaleFactor -= 0.1;
        }
      }

      return compressedBuffer;
    } catch (error) {
      throw new Error(
        `Error compressing image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Extract text using Azure Form Recognizer Prebuilt Receipt API v4.0
   */
  async extractTextAzure(
    buffer: Buffer,
    endpoint: string,
    apiKey: string,
  ): Promise<OcrResult> {
    if (!endpoint || !apiKey) {
      throw new Error('Azure API credentials not provided');
    }

    try {
      // Pre-process the image to ensure compatibility with Azure Document Intelligence
      const processedBuffer = await this.loadImageWithFormatSupport(buffer);

      // Compress the processed image to fit Azure's size limits
      const finalBuffer = await this.compressImageForAzure(processedBuffer);

      // Use the prebuilt receipt model
      return await this.ocrAzureService.extractWithPrebuiltReceipt(
        finalBuffer,
        endpoint,
        apiKey,
      );
    } catch (error) {
      throw new Error(
        `Azure API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Process receipt image and extract data
   */
  async processReceipt(
    buffer: Buffer,
    endpoint?: string,
    apiKey?: string,
  ): Promise<OcrResult> {
    try {
      // Process the image
      const processedBuffer = await this.loadImageWithFormatSupport(buffer);

      // If Azure credentials are provided, use Azure OCR
      if (endpoint && apiKey) {
        return await this.extractTextAzure(processedBuffer, endpoint, apiKey);
      }

      // Fallback: Return basic structure (Tesseract OCR implementation would go here)
      throw new Error(
        'Only Azure OCR is currently supported. Please provide Azure credentials.',
      );
    } catch (error) {
      throw new Error(
        `Error processing receipt: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
