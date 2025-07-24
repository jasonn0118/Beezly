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
}

@Injectable()
export class OcrService {
  constructor(
    private readonly ocrAzureService: OcrAzureService,
    private readonly productNormalizationService: ProductNormalizationService,
    private readonly vectorEmbeddingService: VectorEmbeddingService,
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

  /**
   * Process receipt with product normalization
   */
  async processReceiptWithNormalization(
    buffer: Buffer,
    endpoint?: string,
    apiKey?: string,
  ): Promise<EnhancedOcrResult> {
    try {
      // Step 1: Get OCR results
      const ocrResult = await this.processReceipt(buffer, endpoint, apiKey);

      // Step 2: Perform embedding lookup for all items first
      const embeddingLookups = await this.performEmbeddingLookupForItems(
        ocrResult.items,
        ocrResult.merchant,
      );

      // Step 3: Prepare items for discount linking
      const itemsWithIndex = ocrResult.items.map((item, index) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        itemCode: item.item_number,
        index: index,
      }));

      // Step 4: Normalize items with discount linking
      const normalizedResults =
        await this.productNormalizationService.normalizeReceiptWithDiscountLinking(
          itemsWithIndex,
          ocrResult.merchant,
        );

      // Step 5: Convert to EnhancedOcrItem format and filter out linked discounts
      const enhancedItems: EnhancedOcrItem[] = ocrResult.items
        .map((originalItem, index): EnhancedOcrItem | null => {
          const normalization = normalizedResults[index];
          const embeddingLookup = embeddingLookups[index];

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
            (finalNormalization.isDiscount || finalNormalization.isFee) &&
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

      // Step 5: Calculate enhanced normalization summary using original results
      // (before filtering out linked discounts)
      const normalizationSummary =
        this.calculateEnhancedNormalizationSummaryFromResults(
          normalizedResults,
          enhancedItems,
        );

      // Step 6: Return enhanced result
      return {
        ...ocrResult,
        items: enhancedItems,
        normalization_summary: normalizationSummary,
      };
    } catch (error) {
      throw new Error(
        `Error processing receipt with normalization: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Calculate normalization summary statistics
   */
  private calculateNormalizationSummary(items: EnhancedOcrItem[]) {
    const totalItems = items.length;
    const productItems = items.filter(
      (item) => !item.is_discount && !item.is_adjustment,
    ).length;
    const discountItems = items.filter((item) => item.is_discount).length;
    const adjustmentItems = items.filter((item) => item.is_adjustment).length;

    const averageConfidence =
      totalItems > 0
        ? items.reduce((sum, item) => sum + item.confidence_score, 0) /
          totalItems
        : 0;

    return {
      total_items: totalItems,
      product_items: productItems,
      discount_items: discountItems,
      adjustment_items: adjustmentItems,
      average_confidence: Math.round(averageConfidence * 1000) / 1000, // Round to 3 decimal places
    };
  }

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
  private calculateEnhancedNormalizationSummary(items: EnhancedOcrItem[]) {
    const totalItems = items.length;
    const productItems = items.filter(
      (item) => !item.is_discount && !item.is_adjustment,
    ).length;
    const discountItems = items.filter((item) => item.is_discount).length;
    const adjustmentItems = items.filter((item) => item.is_adjustment).length;

    const averageConfidence =
      totalItems > 0
        ? items.reduce((sum, item) => sum + item.confidence_score, 0) /
          totalItems
        : 0;

    // Calculate discount linking statistics
    const productsWithDiscounts = items.filter(
      (item) =>
        !item.is_discount &&
        item.linked_discounts &&
        item.linked_discounts.length > 0,
    ).length;

    const totalLinkedDiscounts = items.reduce(
      (sum, item) => sum + (item.linked_discounts?.length || 0),
      0,
    );

    const totalDiscountAmount = items.reduce((sum, item) => {
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
      total_discount_amount: Math.round(totalDiscountAmount * 100) / 100, // Round to 2 decimal places
      products_with_discounts: productsWithDiscounts,
    };
  }

  /**
   * Perform embedding lookup for all receipt items before normalization
   */
  private async performEmbeddingLookupForItems(
    items: OcrItem[],
    merchant: string,
  ): Promise<EmbeddingLookupResult[]> {
    const lookupResults: EmbeddingLookupResult[] = [];

    for (const item of items) {
      try {
        // Skip obvious discount/adjustment items to avoid unnecessary lookups
        if (this.isLikelyDiscountOrAdjustment(item.name)) {
          lookupResults.push({
            found: false,
            method: 'no_match',
          });
          continue;
        }

        // Search for similar products using embeddings
        const similarProducts =
          await this.vectorEmbeddingService.findSimilarProductsEnhanced({
            queryText: item.name,
            merchant,
            similarityThreshold: 0.85, // High threshold for confidence
            limit: 1, // We only need the best match
            includeDiscounts: false,
            includeAdjustments: false,
          });

        if (similarProducts.length > 0) {
          const bestMatch = similarProducts[0];
          lookupResults.push({
            found: true,
            normalized_name: bestMatch.normalizedProduct.normalizedName,
            brand: bestMatch.normalizedProduct.brand,
            category: bestMatch.normalizedProduct.category,
            confidence_score: bestMatch.normalizedProduct.confidenceScore,
            similarity_score: bestMatch.similarity,
            method: 'embedding_match',
            raw_name: bestMatch.normalizedProduct.rawName,
          });
        } else {
          lookupResults.push({
            found: false,
            method: 'no_match',
          });
        }
      } catch (error) {
        // Log error but continue processing
        console.warn(`Embedding lookup failed for item "${item.name}":`, error);
        lookupResults.push({
          found: false,
          method: 'no_match',
        });
      }
    }

    return lookupResults;
  }

  /**
   * Determine if we should use the embedding result over the normalization result
   */
  private shouldUseEmbeddingResult(
    embeddingResult: EmbeddingLookupResult,
    normalizationResult: NormalizationResult,
  ): boolean {
    // Don't use embedding for discount/adjustment items
    if (normalizationResult.isDiscount || normalizationResult.isAdjustment) {
      return false;
    }

    // Use embedding result if:
    // 1. Similarity score is very high (>= 0.9)
    // 2. OR similarity score is high (>= 0.85) AND normalization confidence is low (< 0.7)
    // 3. OR normalization method is fallback and similarity is decent (>= 0.8)

    const similarityScore = embeddingResult.similarity_score || 0;
    const normalizationConfidence = normalizationResult.confidenceScore;
    const normalizationMethod = normalizationResult.method;

    // Very high similarity - always use embedding
    if (similarityScore >= 0.9) {
      return true;
    }

    // High similarity with low normalization confidence
    if (similarityScore >= 0.85 && normalizationConfidence < 0.7) {
      return true;
    }

    // Fallback method with decent similarity
    if (normalizationMethod === 'fallback' && similarityScore >= 0.8) {
      return true;
    }

    return false;
  }

  /**
   * Quick check if an item name looks like a discount or adjustment
   */
  private isLikelyDiscountOrAdjustment(itemName: string): boolean {
    const name = itemName.toLowerCase();

    // Common discount/adjustment patterns
    const patterns = [
      /^tpd\//, // TPD/ pattern
      /discount/, // Contains discount
      /coupon/, // Contains coupon
      /adjustment/, // Contains adjustment
      /refund/, // Contains refund
      /credit/, // Contains credit
      /tax\s*(adj|adjustment)/, // Tax adjustment
      /^-/, // Starts with minus sign
      /-\s*[a-z]*$/, // Ends with dash and letters
    ];

    return patterns.some((pattern) => pattern.test(name));
  }
}
