/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import * as heicConvert from 'heic-convert';
import { OcrAzureService } from './ocr-azure.service';
import {
  ProductNormalizationService,
  NormalizationResult,
} from '../product/product-normalization.service';
import { VectorEmbeddingService } from '../product/vector-embedding.service';
import { StoreService } from '../store/store.service';
import { Store } from '../entities/store.entity';

export interface OcrItem {
  name: string;
  price: string;
  quantity: string;
  unit_price?: string;
  item_number?: string;
}

export interface DiscountInfo {
  discount_id: string;
  discount_amount: number;
  discount_type: 'percentage' | 'fixed' | 'unknown';
  discount_description: string;
  link_confidence: number;
}

export interface EmbeddingLookupResult {
  found: boolean;
  normalized_name?: string;
  brand?: string;
  category?: string;
  confidence_score?: number;
  similarity_score?: number;
  method: 'embedding_match' | 'no_match';
  raw_name?: string;
}

export interface EnhancedOcrItem extends OcrItem {
  normalized_name: string;
  brand?: string;
  category?: string;
  confidence_score: number;
  is_discount: boolean;
  is_adjustment: boolean;
  normalization_method: string;
  normalized_product_sk?: string; // Added to include the database SK
  embedding_lookup?: EmbeddingLookupResult; // Results from embedding search
  linked_discounts?: DiscountInfo[]; // Discounts that apply to this product
  applied_to_product_id?: string; // If this is a discount, which product it applies to
  original_price_numeric?: number; // For calculation purposes
  final_price?: number; // Price after discounts
  price_format_info?: {
    was_negative: boolean;
    original_format: string;
  }; // Information about the original price format
}

export interface CleanOcrItem {
  name: string;
  quantity: string;
  unit_price?: string;
  item_number?: string;
  normalized_name: string;
  brand?: string;
  category?: string;
  confidence_score: number;
  normalized_product_sk?: string;
  linked_discounts?: DiscountInfo[];
  applied_to_product_id?: string;
  original_price: number;
  final_price: number;
}

export interface OcrResult {
  merchant: string;
  store_address?: string;
  date: string;
  time?: string;
  total: number;
  subtotal?: number;
  tax?: number;
  items: OcrItem[];
  item_count: number;
  raw_text: string;
  azure_confidence?: number;
  engine_used: string;
  uploaded_file_path?: string;
}

export interface EnhancedOcrResult extends Omit<OcrResult, 'items'> {
  items: EnhancedOcrItem[];
  normalization_summary: {
    total_items: number;
    product_items: number;
    discount_items: number;
    adjustment_items: number;
    average_confidence: number;
    linked_discounts: number;
    total_discount_amount: number;
    products_with_discounts: number;
  };
  // Store search result information
  store_search?: {
    storeFound: boolean;
    store?: {
      id: string;
      name: string;
      fullAddress?: string;
      confidence: number;
      matchMethod: string;
    };
    extractedMerchant: string;
    extractedAddress?: string;
    message: string;
    requiresUserConfirmation: boolean;
  };
}

export interface CleanOcrResult extends Omit<OcrResult, 'items'> {
  items: CleanOcrItem[];
  normalization_summary: {
    total_items: number;
    product_items: number;
    discount_items: number;
    adjustment_items: number;
    average_confidence: number;
    linked_discounts: number;
    total_discount_amount: number;
    products_with_discounts: number;
  };
  receipt_id?: string; // Receipt ID if stored in database
  session_id?: string; // Temporary session ID for tracking
}

@Injectable()
export class OcrService {
  constructor(
    private readonly ocrAzureService: OcrAzureService,
    private readonly productNormalizationService: ProductNormalizationService,
    private readonly vectorEmbeddingService: VectorEmbeddingService,
    private readonly storeService: StoreService,
  ) {}

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
        // For other formats, apply optimized preprocessing
        const processStartTime = performance.now();
        const processedBuffer = await sharp(buffer)
          .removeAlpha()
          .toColorspace('srgb')
          .jpeg({ quality: 90, mozjpeg: true, progressive: false }) // Optimized settings
          .toBuffer();
        const processDuration = performance.now() - processStartTime;
        console.log(`🗜 Image preprocessing: ${processDuration.toFixed(1)}ms`);
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
   * Optimized for speed while preserving text readability
   */
  async compressImageForAzure(
    buffer: Buffer,
    maxSizeMb: number = 4, // Reduced from 10MB for faster processing
  ): Promise<Buffer> {
    const compressStartTime = performance.now();

    try {
      const maxSizeBytes = maxSizeMb * 1024 * 1024;
      const originalSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

      console.log(
        `🗜 Processing image: ${originalSizeMB}MB (target: <${maxSizeMb}MB)`,
      );

      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Optimized dimensions for OCR (reduced from 2048 for faster processing)
      const maxDimension = 1600; // Sweet spot for OCR accuracy vs speed
      let width = metadata.width || 1600;
      let height = metadata.height || 1200;

      console.log(`📜 Original dimensions: ${width}x${height}`);

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
        console.log(`🔄 Resizing to: ${width}x${height}`);
      }

      // Start with higher quality and work down more efficiently
      const qualityLevels = [90, 80, 70, 60, 50, 40]; // Faster quality steps
      let compressedBuffer: Buffer = Buffer.alloc(0);

      for (const quality of qualityLevels) {
        compressedBuffer = await image
          .resize(width, height, { fit: 'inside', kernel: 'lanczos3' })
          .jpeg({ quality, mozjpeg: true, progressive: false }) // Non-progressive for faster processing
          .toBuffer();

        const compressedSizeMB = (
          compressedBuffer.length /
          (1024 * 1024)
        ).toFixed(2);
        console.log(`🗜 Quality ${quality}: ${compressedSizeMB}MB`);

        if (compressedBuffer.length <= maxSizeBytes) {
          break;
        }
      }

      // If still too large, try more aggressive resizing (but faster approach)
      if (compressedBuffer.length > maxSizeBytes) {
        const scaleFactors = [0.8, 0.6, 0.4]; // Bigger jumps for speed

        for (const scaleFactor of scaleFactors) {
          const newWidth = Math.round(width * scaleFactor);
          const newHeight = Math.round(height * scaleFactor);

          console.log(
            `🔄 Aggressive resize: ${newWidth}x${newHeight} (${(scaleFactor * 100).toFixed(0)}%)`,
          );

          compressedBuffer = await image
            .resize(newWidth, newHeight, { fit: 'inside', kernel: 'lanczos3' })
            .jpeg({ quality: 75, mozjpeg: true, progressive: false })
            .toBuffer();

          if (compressedBuffer.length <= maxSizeBytes) {
            break;
          }
        }
      }

      const compressDuration = performance.now() - compressStartTime;
      const finalSizeMB = (compressedBuffer.length / (1024 * 1024)).toFixed(2);
      const compressionRatio = (
        (1 - compressedBuffer.length / buffer.length) *
        100
      ).toFixed(1);

      console.log(
        `✅ Image compression: ${compressDuration.toFixed(1)}ms | ${originalSizeMB}MB → ${finalSizeMB}MB (${compressionRatio}% reduction)`,
      );

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
      // Single-pass optimized image processing (saves ~618ms)
      const optimizedBuffer = await this.optimizeImageForOcr(buffer);

      // If Azure credentials are provided, use Azure OCR
      if (endpoint && apiKey) {
        return await this.ocrAzureService.extractWithPrebuiltReceipt(
          optimizedBuffer,
          endpoint,
          apiKey,
        );
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

  /**
   * Single-pass optimized image processing (combines preprocessing + compression)
   * Saves ~618ms by eliminating duplicate processing steps
   */
  private async optimizeImageForOcr(buffer: Buffer): Promise<Buffer> {
    const startTime = performance.now();
    try {
      // Check if it's HEIC format first
      if (this.isHeicBuffer(buffer)) {
        console.log('HEIC format detected, converting to optimized JPEG');

        // Single-pass HEIC conversion with optimal settings
        const optimizedBuffer = await heicConvert({
          buffer: buffer,
          format: 'JPEG',
          quality: 0.85, // Balanced quality for OCR
        });

        const duration = performance.now() - startTime;
        const originalSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
        const finalSizeMB = (optimizedBuffer.length / (1024 * 1024)).toFixed(2);
        console.log(
          `🚀 Single-pass optimization: ${duration.toFixed(1)}ms | ${originalSizeMB}MB → ${finalSizeMB}MB`,
        );

        return Buffer.from(optimizedBuffer);
      }

      // Single-pass processing for other formats
      const maxSizeMb = 4; // Azure limit
      const maxSizeBytes = maxSizeMb * 1024 * 1024;
      const originalSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

      console.log(
        `🚀 Single-pass optimization: ${originalSizeMB}MB (target: <${maxSizeMb}MB)`,
      );

      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Optimal dimensions for OCR performance
      const maxDimension = 1600;
      let width = metadata.width || 1600;
      let height = metadata.height || 1200;

      console.log(`📜 Original dimensions: ${width}x${height}`);

      // Resize if needed
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
        console.log(`🔄 Resizing to: ${width}x${height}`);
      }

      // Single-pass processing with optimal settings for OCR
      const quality = buffer.length > maxSizeBytes ? 80 : 90;
      const optimizedBuffer = await image
        .resize(width, height, { fit: 'inside', kernel: 'lanczos3' })
        .removeAlpha()
        .toColorspace('srgb')
        .jpeg({
          quality: quality,
          mozjpeg: true,
          progressive: false,
        })
        .toBuffer();

      const duration = performance.now() - startTime;
      const finalSizeMB = (optimizedBuffer.length / (1024 * 1024)).toFixed(2);
      const reduction = (
        (1 - optimizedBuffer.length / buffer.length) *
        100
      ).toFixed(1);

      console.log(
        `🚀 Single-pass optimization: ${duration.toFixed(1)}ms | ${originalSizeMB}MB → ${finalSizeMB}MB (${reduction}% reduction)`,
      );

      return optimizedBuffer;
    } catch (error) {
      throw new Error(
        `Image optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Save normalized products to the database using optimized batch processing
   */
  private async saveNormalizedProducts(
    normalizedResults: NormalizationResult[],
    ocrItems: OcrItem[],
    merchant: string,
  ): Promise<string[]> {
    const normalizedProductSks: string[] = [];
    const embeddingUpdatePromises: Promise<void>[] = [];
    let newProducts = 0;
    let existingProducts = 0;

    for (let i = 0; i < normalizedResults.length; i++) {
      const normalization = normalizedResults[i];
      const ocrItem = ocrItems[i];

      try {
        // Use ProductNormalizationService's comprehensive duplicate detection
        // This handles all duplicate scenarios properly
        const savedProduct = await this.productNormalizationService.storeResult(
          merchant,
          ocrItem.name,
          normalization,
        );

        const isNew = savedProduct.matchCount === 1;
        if (isNew) {
          newProducts++;
        } else {
          existingProducts++;
        }

        console.log(
          `Product ${i} processed: ${savedProduct.normalizedProductSk} (${savedProduct.normalizedName}) - ${isNew ? 'new' : 'existing'}`,
        );
        normalizedProductSks.push(savedProduct.normalizedProductSk);

        // Generate embedding asynchronously if not a discount/adjustment and it's a new product
        if (
          !normalization.isDiscount &&
          !normalization.isAdjustment &&
          isNew && // Only for new products
          !savedProduct.embedding // Only if embedding doesn't exist
        ) {
          // Collect promises for batch monitoring (but don't await)
          const embeddingPromise = this.vectorEmbeddingService
            .updateProductEmbedding(savedProduct)
            .catch((error) => {
              console.warn(
                `Failed to generate embedding for ${savedProduct.normalizedProductSk}:`,
                error,
              );
            });
          embeddingUpdatePromises.push(embeddingPromise);
        }
      } catch (error) {
        console.error(
          `Failed to save normalized product for item ${i} (${ocrItem.name}):`,
          error,
        );
        // Push empty string to indicate save failure
        normalizedProductSks.push('');
      }
    }

    console.log(
      `💾 Database summary: ${newProducts} new, ${existingProducts} existing products`,
    );

    // Monitor embedding generation in background (don't block response)
    if (embeddingUpdatePromises.length > 0) {
      void Promise.allSettled(embeddingUpdatePromises).then((results) => {
        const successful = results.filter(
          (r) => r.status === 'fulfilled',
        ).length;
        console.log(
          `🔮 Background embeddings: ${successful}/${embeddingUpdatePromises.length} completed`,
        );
      });
    }

    return normalizedProductSks;
  }

  /**
   * Process receipt with product normalization
   */
  async processReceiptWithNormalization(
    buffer: Buffer,
    endpoint?: string,
    apiKey?: string,
    includeStoreSearch?: boolean,
  ): Promise<EnhancedOcrResult> {
    const startTime = performance.now();
    try {
      // Step 1: Get OCR results
      const ocrStartTime = performance.now();
      const ocrResult = await this.processReceipt(buffer, endpoint, apiKey);
      const ocrDuration = performance.now() - ocrStartTime;
      console.log(`📊 OCR Processing: ${ocrDuration.toFixed(1)}ms`);

      // Step 2: Filter out non-product items and clean product names
      const filterStartTime = performance.now();
      const productItems = ocrResult.items
        .filter((item, index) => {
          const shouldExclude = this.shouldExcludeFromNormalization(item.name);
          if (shouldExclude) {
            console.log(`Excluding non-product item ${index}: "${item.name}"`);
          }
          return !shouldExclude;
        })
        .map((item) => {
          // Clean product name and extract item code
          const { cleanedName, extractedItemCode } =
            this.cleanProductNameAndExtractCode(item.name);

          return {
            ...item,
            name: cleanedName,
            // Preserve original item_number if it exists, otherwise use extracted code
            item_number: item.item_number || extractedItemCode || undefined,
          };
        });
      const filterDuration = performance.now() - filterStartTime;

      console.log(
        `📊 Item Filtering: ${filterDuration.toFixed(1)}ms - Filtered ${ocrResult.items.length} items to ${productItems.length} products`,
      );

      // Step 3: Perform embedding lookup for product items only
      const embeddingStartTime = performance.now();
      const embeddingLookups = await this.performEmbeddingLookupForItems(
        productItems,
        ocrResult.merchant,
      );
      const embeddingDuration = performance.now() - embeddingStartTime;
      console.log(`📊 Embedding Lookup: ${embeddingDuration.toFixed(1)}ms`);

      // Step 4: Prepare items for discount linking
      const itemsWithIndex = productItems.map((item, index) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        itemCode: item.item_number,
        index: index,
      }));

      // Step 5: Normalize items with discount linking
      const normalizationStartTime = performance.now();
      const normalizedResults =
        await this.productNormalizationService.normalizeReceiptWithDiscountLinking(
          itemsWithIndex,
          ocrResult.merchant,
        );
      const normalizationDuration = performance.now() - normalizationStartTime;
      console.log(
        `📊 Product Normalization: ${normalizationDuration.toFixed(1)}ms`,
      );

      // Step 6: Save normalized products to database and get SKs
      const saveStartTime = performance.now();
      console.log(
        `Processing ${normalizedResults.length} normalized products for saving...`,
      );
      const normalizedProductSks = await this.saveNormalizedProducts(
        normalizedResults,
        productItems,
        ocrResult.merchant,
      );
      const saveDuration = performance.now() - saveStartTime;
      console.log(
        `📊 Database Save: ${saveDuration.toFixed(1)}ms - Saved products with SKs:`,
        normalizedProductSks.filter((sk) => sk && sk !== ''),
      );

      // Step 7: Convert to EnhancedOcrItem format and filter out linked discounts
      const enhancedItems: EnhancedOcrItem[] = productItems
        .map((originalItem, index): EnhancedOcrItem | null => {
          const normalization = normalizedResults[index];
          const embeddingLookup = embeddingLookups[index];
          const normalizedProductSk =
            normalizedProductSks[index] && normalizedProductSks[index] !== ''
              ? normalizedProductSks[index]
              : undefined;

          // Use embedding result if found and has high confidence
          let finalNormalization = normalization;
          if (
            embeddingLookup.found &&
            this.shouldUseEmbeddingResult(embeddingLookup, normalization)
          ) {
            finalNormalization = {
              ...normalization,
              normalizedName: embeddingLookup.normalized_name!,
              brand: embeddingLookup.brand,
              category: embeddingLookup.category,
              confidenceScore: embeddingLookup.confidence_score!, // Use original normalization confidence, not similarity
              method: 'embedding_lookup',
            };
          }
          // Use improved price parsing that handles discount formats
          const parsedPrice = this.productNormalizationService.parsePrice(
            originalItem.price,
            ocrResult.merchant,
          );
          const originalPrice = parsedPrice.amount;

          // For discount/fee items that have been linked to products,
          // we'll filter them out unless they couldn't be linked
          if (
            (finalNormalization.isDiscount ||
              finalNormalization.isAdjustment) &&
            finalNormalization.appliedToProductId
          ) {
            // This discount/fee was successfully linked to a product,
            // so we don't show it as a separate item
            return null;
          }

          // Calculate final price after discounts and fees
          let finalPrice = originalPrice;
          if (
            finalNormalization.linkedDiscounts &&
            finalNormalization.linkedDiscounts.length > 0
          ) {
            // Separate discounts (negative) from fees (positive)
            let totalDiscount = 0;
            let totalFees = 0;

            finalNormalization.linkedDiscounts.forEach((discount) => {
              // Check if this is a fee by looking at the description
              if (
                discount.discountDescription.match(
                  /^(ECO\s*FEE|ENV(?:IRO)?\s*FEE|DEPOSIT|RECYCLING\s*FEE|BAG\s*FEE|SERVICE\s*FEE)/i,
                )
              ) {
                totalFees += discount.discountAmount;
              } else {
                totalDiscount += discount.discountAmount;
              }
            });

            finalPrice = Math.max(0, originalPrice - totalDiscount + totalFees);
          }

          return {
            ...originalItem,
            normalized_name: finalNormalization.normalizedName,
            brand: finalNormalization.brand,
            category: finalNormalization.category,
            confidence_score: finalNormalization.confidenceScore,
            is_discount: finalNormalization.isDiscount,
            is_adjustment: finalNormalization.isAdjustment,
            normalization_method: finalNormalization.method || 'fallback',
            normalized_product_sk: normalizedProductSk, // Include the database SK
            embedding_lookup: embeddingLookup,
            linked_discounts: finalNormalization.linkedDiscounts?.map(
              (discount) => ({
                discount_id: discount.discountId,
                discount_amount: discount.discountAmount,
                discount_type: discount.discountType,
                discount_description: discount.discountDescription,
                link_confidence: discount.confidence,
              }),
            ),
            applied_to_product_id: finalNormalization.appliedToProductId,
            original_price_numeric: originalPrice,
            final_price: finalPrice,
            price_format_info: {
              was_negative: parsedPrice.isNegative,
              original_format: parsedPrice.originalString,
            },
          };
        })
        .filter((item): item is EnhancedOcrItem => item !== null); // Remove null items (linked discounts)

      // Step 8: Calculate enhanced normalization summary using original results
      // (before filtering out linked discounts)
      const normalizationSummary =
        this.calculateEnhancedNormalizationSummaryFromResults(
          normalizedResults,
          enhancedItems,
        );

      // Step 9: Return enhanced result with only actual products
      // Note: Product linking now happens later when user confirms normalized products
      const totalDuration = performance.now() - startTime;
      const embeddingHitRate =
        (embeddingLookups.filter((lookup) => lookup.found).length /
          Math.max(embeddingLookups.length, 1)) *
        100;

      console.log(
        `🎯 Receipt Processing Complete: ${totalDuration.toFixed(1)}ms`,
      );
      console.log(
        `📈 Embedding Hit Rate: ${embeddingHitRate.toFixed(1)}% (${embeddingLookups.filter((lookup) => lookup.found).length}/${embeddingLookups.length})`,
      );

      // Step 10: Optional store search (for new user-controlled workflow)
      let storeSearchResult:
        | {
            storeFound: boolean;
            store?: {
              id: string;
              name: string;
              fullAddress?: string;
              confidence: number;
              matchMethod: string;
            };
            extractedMerchant: string;
            extractedAddress?: string;
            message: string;
            requiresUserConfirmation: boolean;
          }
        | undefined = undefined;

      if (includeStoreSearch) {
        try {
          const storeSearchStartTime = performance.now();
          console.log('🏪 Starting store search...');

          // Extract store information from OCR data
          const extractedMerchant = ocrResult.merchant || 'Unknown Store';
          const extractedAddress = ocrResult.store_address;

          // Search for store (NO auto-creation)
          const searchResult = await this.storeService.findStoreFromOcr({
            merchant: extractedMerchant,
            store_address: extractedAddress,
          });

          if (searchResult && searchResult.confidence >= 0.7) {
            // Store found with good confidence
            storeSearchResult = {
              storeFound: true,
              store: {
                id: searchResult.store.storeSk,
                name: searchResult.store.name,
                fullAddress: searchResult.store.fullAddress,
                confidence: searchResult.confidence,
                matchMethod: searchResult.matchMethod,
              },
              extractedMerchant,
              extractedAddress,
              message: `Found matching store: ${searchResult.store.name}`,
              requiresUserConfirmation: false,
            };
          } else {
            // Store not found or low confidence - user needs to search and confirm
            storeSearchResult = {
              storeFound: false,
              extractedMerchant,
              extractedAddress,
              message: searchResult
                ? `Found possible match with low confidence (${Math.round(searchResult.confidence * 100)}%). Please search and confirm the correct store.`
                : 'Store not found in database. Please search and select the correct store.',
              requiresUserConfirmation: true,
            };
          }

          const storeSearchDuration = performance.now() - storeSearchStartTime;
          console.log(
            `🏪 Store Search: ${storeSearchDuration.toFixed(1)}ms - ${storeSearchResult.storeFound ? 'Found' : 'Not found'}`,
          );
        } catch (storeError) {
          console.error('Error in store search:', storeError);
          // Continue without store search result - not critical for receipt processing
          storeSearchResult = {
            storeFound: false,
            extractedMerchant: ocrResult.merchant || 'Unknown Store',
            extractedAddress: ocrResult.store_address,
            message:
              'Store search failed. Please search and select the correct store manually.',
            requiresUserConfirmation: true,
          };
        }
      }

      const result: EnhancedOcrResult = {
        ...ocrResult,
        items: enhancedItems,
        normalization_summary: normalizationSummary,
      };

      if (storeSearchResult) {
        result.store_search = storeSearchResult;
      }

      return result;
    } catch (error) {
      throw new Error(
        `Error processing receipt with normalization: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Calculate normalization summary statistics
   */

  /**
   * Calculate enhanced normalization summary using original normalization results
   * and final enhanced items (accounts for filtered discount items)
   */
  private calculateEnhancedNormalizationSummaryFromResults(
    originalResults: NormalizationResult[],
    finalItems: EnhancedOcrItem[],
  ) {
    const totalItems = originalResults.length;
    const productItems = originalResults.filter(
      (result) => !result.isDiscount && !result.isAdjustment,
    ).length;
    const discountItems = originalResults.filter(
      (result) => result.isDiscount,
    ).length;
    const adjustmentItems = originalResults.filter(
      (result) => result.isAdjustment,
    ).length;

    const averageConfidence =
      totalItems > 0
        ? originalResults.reduce(
            (sum, result) => sum + result.confidenceScore,
            0,
          ) / totalItems
        : 0;

    // Calculate discount linking statistics from final items
    const productsWithDiscounts = finalItems.filter(
      (item) =>
        !item.is_discount &&
        item.linked_discounts &&
        item.linked_discounts.length > 0,
    ).length;

    const totalLinkedDiscounts = finalItems.reduce(
      (sum, item) => sum + (item.linked_discounts?.length || 0),
      0,
    );

    const totalDiscountAmount = finalItems.reduce((sum, item) => {
      if (item.linked_discounts) {
        return (
          sum +
          item.linked_discounts.reduce((discountSum, discount) => {
            // Only count actual discounts, not fees
            const isFee = discount.discount_description.match(
              /^(ECO\s*FEE|ENV(?:IRO)?\s*FEE|DEPOSIT|RECYCLING\s*FEE|BAG\s*FEE|SERVICE\s*FEE)/i,
            );
            return isFee ? discountSum : discountSum + discount.discount_amount;
          }, 0)
        );
      }
      return sum;
    }, 0);

    return {
      total_items: totalItems,
      product_items: productItems,
      discount_items: discountItems,
      adjustment_items: adjustmentItems,
      average_confidence: Math.round(averageConfidence * 1000) / 1000,
      linked_discounts: totalLinkedDiscounts,
      total_discount_amount: Math.round(totalDiscountAmount * 100) / 100,
      products_with_discounts: productsWithDiscounts,
    };
  }

  /**
   * Calculate enhanced normalization summary with discount linking statistics
   */

  /**
   * Perform embedding lookup for all receipt items before normalization
   * Uses batch processing for maximum performance with intelligent optimizations
   */
  private async performEmbeddingLookupForItems(
    items: OcrItem[],
    merchant: string,
  ): Promise<EmbeddingLookupResult[]> {
    const lookupStartTime = performance.now();

    // Early return if no items to process
    if (items.length === 0) {
      console.log('⚡ Early return: No items to process');
      return [];
    }

    // Prepare batch queries - filter out discount/adjustment items
    const queries: { index: number; queryText: string; options: any }[] = [];
    const results: EmbeddingLookupResult[] = new Array(items.length);

    // Track statistics for optimization insights
    let skippedItems = 0;

    // First pass: identify non-discount items for batch processing
    items.forEach((item, index) => {
      if (this.isLikelyDiscountOrAdjustment(item.name)) {
        results[index] = {
          found: false,
          method: 'no_match',
        };
        skippedItems++;
      } else {
        // Skip very short or generic names that are unlikely to have good matches
        if (item.name.trim().length < 3) {
          results[index] = {
            found: false,
            method: 'no_match',
          };
          skippedItems++;
        } else {
          queries.push({
            index,
            queryText: item.name,
            options: {
              queryText: item.name,
              merchant,
              // Use lower threshold for initial lookup, filter in post-processing
              similarityThreshold: 0.8, // Lower threshold for better recall
              limit: 1, // Only need the best match for performance
              includeDiscounts: false,
              includeAdjustments: false,
            },
          });
        }
      }
    });

    // If no items need embedding lookup, return early
    if (queries.length === 0) {
      const lookupDuration = performance.now() - lookupStartTime;
      console.log(
        `⚡ Early return: ${lookupDuration.toFixed(1)}ms - No items need embedding lookup (${skippedItems} skipped)`,
      );
      return results;
    }

    console.log(
      `🔍 Processing ${queries.length} items for embedding lookup (${skippedItems} skipped)`,
    );

    try {
      // Use batch processing for all embedding lookups with performance monitoring
      const batchCallStartTime = performance.now();
      const batchResults =
        await this.vectorEmbeddingService.batchFindSimilarProducts(
          queries.map((q) => ({ queryText: q.queryText, options: q.options })),
        );
      const batchCallDuration = performance.now() - batchCallStartTime;
      console.log(
        `🚀 Batch embedding call: ${batchCallDuration.toFixed(1)}ms for ${queries.length} queries`,
      );

      // Process batch results and fill in the results array
      const processStartTime = performance.now();
      let foundMatches = 0;

      queries.forEach((query, batchIndex) => {
        const similarProducts = batchResults[batchIndex];

        if (similarProducts && similarProducts.length > 0) {
          const bestMatch = similarProducts[0];
          results[query.index] = {
            found: true,
            normalized_name: bestMatch.normalizedProduct.normalizedName,
            brand: bestMatch.normalizedProduct.brand,
            category: bestMatch.normalizedProduct.category,
            confidence_score: bestMatch.normalizedProduct.confidenceScore,
            similarity_score: bestMatch.similarity,
            method: 'embedding_match',
            raw_name: bestMatch.normalizedProduct.rawName,
          };
          foundMatches++;
        } else {
          results[query.index] = {
            found: false,
            method: 'no_match',
          };
        }
      });

      const processDuration = performance.now() - processStartTime;
      console.log(
        `📋 Result processing: ${processDuration.toFixed(1)}ms - Found ${foundMatches}/${queries.length} matches`,
      );
    } catch (error) {
      // Log error and mark all remaining items as no_match
      console.warn('⚠️ Batch embedding lookup failed:', error);
      queries.forEach((query) => {
        results[query.index] = {
          found: false,
          method: 'no_match',
        };
      });
    }

    const totalLookupDuration = performance.now() - lookupStartTime;
    const hitRate =
      (results.filter((r) => r.found).length / Math.max(results.length, 1)) *
      100;
    console.log(
      `✨ Embedding lookup complete: ${totalLookupDuration.toFixed(1)}ms (${hitRate.toFixed(1)}% hit rate)`,
    );

    return results;
  }

  /**
   * Determine if we should use the embedding result over the normalization result
   * Uses intelligent scoring to balance precision and recall
   */
  private shouldUseEmbeddingResult(
    embeddingResult: EmbeddingLookupResult,
    normalizationResult: NormalizationResult,
  ): boolean {
    // Don't use embedding for discount/adjustment items
    if (normalizationResult.isDiscount || normalizationResult.isAdjustment) {
      return false;
    }

    const similarityScore = embeddingResult.similarity_score || 0;
    const normalizationConfidence = normalizationResult.confidenceScore;
    const normalizationMethod = normalizationResult.method;

    // Smart threshold adjustment based on normalization quality
    let requiredSimilarity = 0.85; // Default threshold

    // Lower threshold if normalization is low quality
    if (normalizationMethod === 'fallback' || normalizationConfidence < 0.6) {
      requiredSimilarity = 0.8;
    }

    // Higher threshold if normalization is high quality
    if (normalizationConfidence > 0.8 && normalizationMethod !== 'fallback') {
      requiredSimilarity = 0.9;
    }

    // Use embedding result if similarity meets the dynamic threshold
    if (similarityScore >= requiredSimilarity) {
      console.log(
        `🎯 Using embedding (${(similarityScore * 100).toFixed(1)}% similarity > ${(requiredSimilarity * 100).toFixed(1)}% threshold) for: ${embeddingResult.normalized_name}`,
      );
      return true;
    }

    return false;
  }

  /**
   * Check if an item should be excluded from normalization
   * This includes discounts, taxes, rewards, change, fees, and other non-product items
   */
  private shouldExcludeFromNormalization(itemName: string): boolean {
    const name = itemName.toLowerCase().trim();

    // Patterns for items that should not be normalized as products
    // Note: Be careful not to exclude discount items that should be linked to products
    const exclusionPatterns = [
      // Administrative discounts (not product-specific)
      /coupon/, // Contains coupon
      /adjustment/, // Contains adjustment
      /refund/, // Contains refund
      /credit/, // Contains credit

      // Note: TPD/, ECO FEE, and negative price patterns are now processed as discounts/fees
      // instead of being excluded, so they can be linked to products

      // Tax patterns
      /tax/, // Any tax reference
      /gst/, // GST tax
      /pst/, // PST tax
      /hst/, // HST tax
      /vat/, // VAT tax
      /\d+%/, // Contains percentage (likely tax rate)
      /^[ghpv]\s*\(.*\)/, // Tax codes like "G ( G)GST 5%"

      // Payment and change
      /change/, // Change amount
      /cash/, // Cash payments
      /card/, // Card payments
      /mastercard|visa|amex/, // Credit card names
      /debit/, // Debit payments

      // Rewards and membership
      /reward/, // Rewards
      /executive/, // Executive membership
      /member/, // Membership related
      /points/, // Loyalty points

      // Receipt metadata
      /subtotal/, // Subtotal
      /total/, // Total amounts
      /invoice/, // Invoice numbers
      /receipt/, // Receipt references
      /reference/, // Reference numbers
      /auth/, // Authorization codes
      /approved/, // Approval messages

      // Store operations
      /void/, // Voided items
      /return/, // Returns
      /exchange/, // Exchanges
      /balance/, // Account balance

      // Common non-product patterns
      /^[a-z]$/, // Single letters
      /^\d+$/, // Pure numbers
      /^[\W\d]+$/, // Only symbols and numbers
    ];

    return exclusionPatterns.some((pattern) => pattern.test(name));
  }

  /**
   * Quick check if an item name looks like a discount or adjustment
   */
  private isLikelyDiscountOrAdjustment(itemName: string): boolean {
    return this.shouldExcludeFromNormalization(itemName);
  }

  /**
   * Clean product name by removing item numbers and other non-product identifiers
   * Also extracts the item code if found
   * Handles patterns like "1628802 OPTIMUM" -> { cleanedName: "OPTIMUM", extractedItemCode: "1628802" }
   */
  private cleanProductNameAndExtractCode(itemName: string): {
    cleanedName: string;
    extractedItemCode: string | null;
  } {
    let cleanedName = itemName.trim();
    let extractedItemCode: string | null = null;

    // Extract leading item numbers (6-8 digits followed by space)
    // Common patterns: "1628802 OPTIMUM", "123456 PRODUCT NAME"
    let match = cleanedName.match(/^(\d{6,8})\s+(.+)$/);
    if (match) {
      extractedItemCode = match[1];
      cleanedName = match[2];
    } else {
      // Extract leading shorter item numbers (4-5 digits followed by space)
      // But be more conservative to avoid removing quantities
      match = cleanedName.match(/^(\d{4,5})\s+([A-Za-z].*)$/);
      if (match) {
        extractedItemCode = match[1];
        cleanedName = match[2];
      } else {
        // Extract leading 3-digit item codes (like "430 XL EGGS")
        // Be conservative: only match if followed by at least 3 letters/chars to avoid quantities
        match = cleanedName.match(/^(\d{3})\s+([A-Za-z].{2,}.*)$/);
        if (match) {
          extractedItemCode = match[1];
          cleanedName = match[2];
        } else {
          // Extract leading item codes with letters (like "ABC123 PRODUCT")
          match = cleanedName.match(/^([A-Z]{2,4}\d{3,6})\s+(.+)$/);
          if (match) {
            extractedItemCode = match[1];
            cleanedName = match[2];
          }
        }
      }
    }

    // Extract trailing item numbers or codes in parentheses
    if (!extractedItemCode) {
      match = cleanedName.match(/^(.+?)\s*\((\d+)\)$/);
      if (match) {
        extractedItemCode = match[2];
        cleanedName = match[1];
      } else {
        match = cleanedName.match(/^(.+?)\s*\(([A-Z0-9]+)\)$/);
        if (match) {
          extractedItemCode = match[2];
          cleanedName = match[1];
        }
      }
    }

    // Extract SKU patterns at the end
    if (!extractedItemCode) {
      match = cleanedName.match(/^(.+?)\s+SKU\s*(\d+)$/i);
      if (match) {
        extractedItemCode = match[2];
        cleanedName = match[1];
      } else {
        match = cleanedName.match(/^(.+?)\s+#(\d+)$/);
        if (match) {
          extractedItemCode = match[2];
          cleanedName = match[1];
        }
      }
    }

    // Remove extra whitespace
    cleanedName = cleanedName.replace(/\s+/g, ' ').trim();

    // If cleaning removed everything, return the original
    if (!cleanedName || cleanedName.length < 2) {
      return {
        cleanedName: itemName.trim(),
        extractedItemCode: null,
      };
    }

    return {
      cleanedName,
      extractedItemCode,
    };
  }

  /**
   * Convert EnhancedOcrResult to CleanOcrResult by removing unnecessary fields
   */
  public convertToCleanResult(
    enhancedResult: EnhancedOcrResult,
  ): CleanOcrResult {
    // Filter out items with confidence score 0 (fees, non-products)
    const validItems = enhancedResult.items.filter(
      (item) => item.confidence_score > 0,
    );

    const cleanItems: CleanOcrItem[] = validItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      item_number: item.item_number,
      normalized_name: item.normalized_name,
      brand: item.brand,
      category: item.category,
      confidence_score: item.confidence_score,
      normalized_product_sk: item.normalized_product_sk,
      linked_discounts: item.linked_discounts,
      applied_to_product_id: item.applied_to_product_id,
      original_price: item.original_price_numeric || 0,
      final_price: item.final_price || 0,
    }));

    return {
      ...enhancedResult,
      items: cleanItems,
    };
  }

  /**
   * Process receipt with product normalization and return clean response
   */
  async processReceiptEnhanced(
    buffer: Buffer,
    endpoint?: string,
    apiKey?: string,
  ): Promise<CleanOcrResult> {
    const enhancedResult = await this.processReceiptWithNormalization(
      buffer,
      endpoint,
      apiKey,
    );
    return this.convertToCleanResult(enhancedResult);
  }

  /**
   * Enhanced store resolution using StoreService's robust fuzzy matching
   * This method can be called after OCR to resolve stores with better accuracy
   */
  async resolveStoreFromOcrData(
    merchant: string,
    storeAddress?: string,
  ): Promise<Store | null> {
    try {
      if (!merchant || merchant.trim() === '') {
        console.warn('Cannot resolve store: merchant name is empty');
        return null;
      }

      console.log(
        `Attempting to resolve store: merchant="${merchant}", address="${storeAddress || 'N/A'}"`,
      );

      // Use StoreService's robust OCR store resolution
      // This handles:
      // - Store name normalization (e.g., "WALMART #1234" -> "Walmart")
      // - Fuzzy name matching with similarity scoring
      // - Address-based matching for chain stores
      // - Postal code and street-level matching
      // - Automatic store creation if no match found
      const resolvedStore = await this.storeService.findOrCreateStoreFromOcr({
        merchant,
        store_address: storeAddress,
      });

      if (resolvedStore) {
        console.log(
          `✅ Store resolved: ${resolvedStore.name} (${resolvedStore.storeSk})`,
        );

        // Log additional details if address was matched
        if (resolvedStore.fullAddress) {
          console.log(`   Address: ${resolvedStore.fullAddress}`);
        }
        if (resolvedStore.city && resolvedStore.province) {
          console.log(
            `   Location: ${resolvedStore.city}, ${resolvedStore.province}`,
          );
        }
      } else {
        console.warn(`⚠️ Could not resolve store for merchant: ${merchant}`);
      }

      return resolvedStore;
    } catch (error) {
      console.error(`Error resolving store for merchant "${merchant}":`, error);
      return null;
    }
  }

  /**
   * Enhanced OCR processing with automatic store resolution
   * This wraps the existing processReceiptWithNormalization to add store resolution
   */
  async processReceiptWithStoreResolution(
    buffer: Buffer,
    endpoint?: string,
    apiKey?: string,
  ): Promise<EnhancedOcrResult & { resolvedStore?: Store }> {
    // First, process the receipt normally
    const ocrResult = await this.processReceiptWithNormalization(
      buffer,
      endpoint,
      apiKey,
    );

    // Extract store address if available from OCR result
    const storeAddress = ocrResult.store_address;

    // Attempt to resolve the store using enhanced matching
    const resolvedStore = await this.resolveStoreFromOcrData(
      ocrResult.merchant,
      storeAddress,
    );

    // Return the enhanced result with resolved store
    return {
      ...ocrResult,
      resolvedStore: resolvedStore || undefined,
    };
  }

  /**
   * Batch process multiple receipts with store resolution
   * Useful for processing multiple receipts from the same shopping trip
   */
  async batchProcessReceiptsWithStoreResolution(
    receipts: Array<{ buffer: Buffer; metadata?: any }>,
    endpoint?: string,
    apiKey?: string,
  ): Promise<
    Array<{
      ocrResult: EnhancedOcrResult | null;
      resolvedStore?: Store | null;
      metadata?: any;
      error?: string;
    }>
  > {
    const results: Array<{
      ocrResult: EnhancedOcrResult | null;
      resolvedStore?: Store | null;
      metadata?: any;
      error?: string;
    }> = [];

    for (const receipt of receipts) {
      try {
        const result = await this.processReceiptWithStoreResolution(
          receipt.buffer,
          endpoint,
          apiKey,
        );

        results.push({
          ocrResult: result,
          resolvedStore: result.resolvedStore,
          metadata: receipt.metadata,
        });
      } catch (error) {
        console.error('Error processing receipt in batch:', error);
        // Continue processing other receipts even if one fails
        results.push({
          ocrResult: null,
          resolvedStore: null,
          metadata: receipt.metadata,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * NEW WORKFLOW: Process receipt with store search (no auto-creation)
   * Step 1: OCR processing
   * Step 2: Store search (no creation)
   * Step 3: Return result with store confirmation requirement if needed
   */
  async processReceiptWithStoreSearch(
    imageBuffer: Buffer,
    endpoint: string,
    apiKey: string,
  ): Promise<{
    storeFound: boolean;
    store?: {
      id: string;
      name: string;
      fullAddress?: string;
      confidence: number;
      matchMethod: string;
    };
    extractedMerchant: string;
    extractedAddress?: string;
    message: string;
    requiresUserConfirmation: boolean;
    receiptId?: string;
    ocrData?: any;
    itemsCount?: number;
  }> {
    try {
      // Step 1: Process OCR
      const ocrResult = await this.processReceipt(
        imageBuffer,
        endpoint,
        apiKey,
      );

      // Extract store information from OCR data
      const extractedMerchant = ocrResult.merchant || 'Unknown Store';
      const extractedAddress = ocrResult.store_address;

      // Step 2: Search for store (NO auto-creation)
      const storeSearchResult = await this.storeService.findStoreFromOcr({
        merchant: extractedMerchant,
        store_address: extractedAddress,
      });

      if (storeSearchResult && storeSearchResult.confidence >= 0.7) {
        // Store found with good confidence
        return {
          storeFound: true,
          store: {
            id: storeSearchResult.store.storeSk,
            name: storeSearchResult.store.name,
            fullAddress: storeSearchResult.store.fullAddress,
            confidence: storeSearchResult.confidence,
            matchMethod: storeSearchResult.matchMethod,
          },
          extractedMerchant,
          extractedAddress,
          message: `Found matching store: ${storeSearchResult.store.name}`,
          requiresUserConfirmation: false,
          ocrData: ocrResult,
          itemsCount: ocrResult.items?.length || 0,
        };
      } else {
        // Store not found - user needs to search and confirm
        return {
          storeFound: false,
          extractedMerchant,
          extractedAddress,
          message: storeSearchResult
            ? `Found possible match with low confidence (${Math.round(storeSearchResult.confidence * 100)}%). Please search and confirm the correct store.`
            : 'Store not found in database. Please search and select the correct store.',
          requiresUserConfirmation: true,
          ocrData: ocrResult,
          itemsCount: ocrResult.items?.length || 0,
        };
      }
    } catch (error) {
      console.error('Error in processReceiptWithStoreSearch:', error);
      throw new Error(
        `Receipt processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
