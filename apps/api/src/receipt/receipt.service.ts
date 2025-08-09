import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NormalizedProductDTO } from '../../../packages/types/dto/product';
import { ReceiptDTO } from '../../../packages/types/dto/receipt';
import { Category } from '../entities/category.entity';
import { ReceiptItem } from '../entities/receipt-item.entity';
import { Receipt } from '../entities/receipt.entity';
import { Store } from '../entities/store.entity';
import { ProductService } from '../product/product.service';
import { StoreService } from '../store/store.service';
import { UserService } from '../user/user.service';
import { ProductNormalizationService } from '../product/product-normalization.service';
import { EnhancedOcrResult, OcrResult } from '../ocr/ocr.service';
import {
  NormalizationTestResultDto,
  TestNormalizationRequestDto,
  TestNormalizationResponseDto,
} from './dto/test-normalization-response.dto';
import {
  DateValidationUtil,
  DateValidationResult,
} from '../utils/date-validation.util';

// Base OCR item interface
interface BaseOcrItem {
  name: string;
  price: string | number;
  quantity: string | number;
  item_number?: string;
}

// Enhanced item interface for type safety
interface EnhancedReceiptItem extends BaseOcrItem {
  normalized_name?: string;
  brand?: string;
  category?: string;
  confidence_score?: number;
  is_discount?: boolean;
  is_adjustment?: boolean;
  normalization_method?: string;
  embedding_lookup?: unknown;
  linked_discounts?: unknown;
  original_price_numeric?: number;
  final_price?: number;
  price_format_info?: {
    was_negative?: boolean;
    original_format?: string;
  };
}

export interface CreateReceiptRequest {
  userId?: string;
  storeName?: string;
  storeId?: string;
  imageUrl?: string;
  purchaseDate?: Date;
  items: {
    productName: string;
    barcode?: string;
    category?: string;
    price: number;
    quantity: number;
  }[];
  totalAmount?: number;
}

export type ReceiptStatus =
  | 'pending'
  | 'processing'
  | 'failed'
  | 'manual_review'
  | 'done';

export interface ReceiptSearchParams {
  userId?: string;
  storeId?: string;
  status?: ReceiptStatus;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
}

@Injectable()
export class ReceiptService {
  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    private readonly userService: UserService,
    private readonly storeService: StoreService,
    private readonly productService: ProductService,
    private readonly productNormalizationService: ProductNormalizationService,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async getAllReceipts(limit: number = 50): Promise<ReceiptDTO[]> {
    const receipts = await this.receiptRepository.find({
      relations: ['user', 'store', 'items', 'items.product'],
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      receipts.map((receipt) => this.mapReceiptToDTO(receipt)),
    );
  }

  async getReceiptById(id: string): Promise<ReceiptDTO | null> {
    // Try to find by receiptSk (UUID) first, then by id (integer)
    let receipt = await this.receiptRepository.findOne({
      where: { receiptSk: id },
      relations: ['user', 'store', 'items', 'items.product'],
    });

    // If not found by receiptSk, try by integer id
    if (!receipt && !isNaN(Number(id))) {
      receipt = await this.receiptRepository.findOne({
        where: { id: Number(id) },
        relations: ['user', 'store', 'items', 'items.product'],
      });
    }

    return receipt ? this.mapReceiptToDTO(receipt) : null;
  }

  async getReceiptsByUserId(
    userId: string,
    limit: number = 50,
  ): Promise<ReceiptDTO[]> {
    const receipts = await this.receiptRepository.find({
      where: { userSk: userId },
      relations: ['user', 'store', 'items', 'items.product'],
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      receipts.map((receipt) => this.mapReceiptToDTO(receipt)),
    );
  }

  async getReceiptsByStoreId(
    storeId: string,
    limit: number = 50,
  ): Promise<ReceiptDTO[]> {
    const receipts = await this.receiptRepository.find({
      where: { storeSk: storeId },
      relations: ['user', 'store', 'items', 'items.product'],
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      receipts.map((receipt) => this.mapReceiptToDTO(receipt)),
    );
  }

  async createReceipt(receiptData: CreateReceiptRequest): Promise<ReceiptDTO> {
    return this.receiptRepository.manager.transaction(async (manager) => {
      let userSk: string | undefined;
      if (receiptData.userId) {
        const user = await this.userService.getUserById(receiptData.userId);
        if (user) userSk = user.id;
      }

      let storeSk: string | undefined;
      if (receiptData.storeId) {
        const store = await this.storeService.getStoreById(receiptData.storeId);
        if (store) storeSk = store.id; // store.id contains the storeSk (UUID)
      } else if (receiptData.storeName) {
        const existingStore = await this.storeRepository.findOne({
          where: { name: receiptData.storeName },
        });
        if (existingStore) storeSk = existingStore.storeSk;
      }

      const receipt = manager.create(Receipt, {
        userSk,
        storeSk,
        imageUrl: receiptData.imageUrl,
        status: 'pending',
        parsedData: { items: receiptData.items },
        purchaseDate: receiptData.purchaseDate || new Date(),
      });

      const savedReceipt = await manager.save(receipt);

      await Promise.all(
        receiptData.items.map(async (itemData) => {
          let product = await this.productService.getProductByBarcode(
            itemData.barcode || '',
          );

          if (!product) {
            let categoryId: number | undefined;

            if (itemData.category) {
              let category = await this.categoryRepository.findOne({
                where: [
                  { category1: itemData.category },
                  { category2: itemData.category },
                  { category3: itemData.category },
                ],
              });

              if (!category) {
                category = this.categoryRepository.create({
                  category1: itemData.category,
                  category2: itemData.category,
                  category3: itemData.category,
                });
                category = await this.categoryRepository.save(category);
              }

              categoryId = category.id;
            }

            product = await this.productService.createProduct({
              name: itemData.productName,
              barcode: itemData.barcode,
              category: categoryId,
            });
          }

          const receiptItem = manager.create(ReceiptItem, {
            receiptSk: savedReceipt.receiptSk,
            productSk: product.product_sk,
            price: itemData.price,
            quantity: itemData.quantity,
            lineTotal: itemData.price * itemData.quantity,
          });

          return manager.save(receiptItem);
        }),
      );

      savedReceipt.status = 'done';
      await manager.save(savedReceipt);

      const completeReceipt = await manager.findOne(Receipt, {
        where: { id: savedReceipt.id },
        relations: [
          'user',
          'store',
          'items',
          'items.product',
          'items.product.categoryEntity',
        ],
      });

      return this.mapReceiptToDTO(completeReceipt!);
    });
  }

  /**
   * Create a receipt from OCR processing result
   * Handles both enhanced and regular OCR results with store linking
   */
  async createReceiptFromOcrResult(
    ocrResult: EnhancedOcrResult | OcrResult,
    userId?: string,
    uploadedFilePath?: string,
  ): Promise<Receipt> {
    return this.receiptRepository.manager.transaction(async (manager) => {
      // Sanitize userId: convert empty string to undefined and validate UUID format
      let sanitizedUserId: string | undefined;

      if (userId && typeof userId === 'string' && userId.trim() !== '') {
        const trimmedUserId = userId.trim();
        // Reject common invalid values
        if (
          trimmedUserId === 'string' ||
          trimmedUserId === 'undefined' ||
          trimmedUserId === 'null'
        ) {
          console.warn(`⚠️ Rejected invalid userId value: ${trimmedUserId}`);
          sanitizedUserId = undefined;
        } else {
          // Check if it's a valid UUID format (basic check)
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(trimmedUserId)) {
            sanitizedUserId = trimmedUserId;
          } else {
            console.warn(`⚠️ Invalid UUID format for userId: ${trimmedUserId}`);
            sanitizedUserId = undefined;
          }
        }
      } else {
        sanitizedUserId = undefined;
      }

      // Step 1: Handle store search from OCR result
      let storeSk: string | undefined;

      // Check if OCR result includes store search information
      const enhancedResult = ocrResult as EnhancedOcrResult;
      if (enhancedResult.store_search) {
        if (
          enhancedResult.store_search.storeFound &&
          enhancedResult.store_search.store
        ) {
          // Use the found store ID
          storeSk = enhancedResult.store_search.store.id;
          console.log(
            `✅ Using found store: ${storeSk} (${enhancedResult.store_search.store.name})`,
          );
        } else {
          // Store not found with good confidence - skip store assignment
          console.log(
            `⚠️ Store not found with confidence. User confirmation required.`,
          );
          console.log(
            `   Extracted merchant: ${enhancedResult.store_search.extractedMerchant}`,
          );
          console.log(
            `   Extracted address: ${enhancedResult.store_search.extractedAddress}`,
          );
          // Store will remain undefined, receipt created without store
        }
      } else {
        // Fallback: Try to find store without creating (legacy support)
        const searchResult = await this.storeService.findStoreFromOcr({
          merchant: ocrResult.merchant,
          store_address: ocrResult.store_address,
        });

        if (searchResult && searchResult.confidence >= 0.85) {
          storeSk = searchResult.store.storeSk;
          console.log(
            `✅ Found store via fallback: ${storeSk} (confidence: ${searchResult.confidence})`,
          );
        } else {
          console.log(
            `⚠️ Store not found via fallback (confidence < 0.85). Receipt will be created without store.`,
          );
        }
      }

      // Step 2: Parse and validate receipt date
      let receiptDate: Date | undefined;
      let receiptTime: string | undefined;
      let dateValidationResult: DateValidationResult | undefined;

      console.log('📅 Receipt Date Processing:');
      console.log('  Raw OCR date:', ocrResult.date);
      console.log('  Raw OCR time:', ocrResult.time);

      if (ocrResult.date) {
        // Validate the date using our utility
        dateValidationResult = DateValidationUtil.validateReceiptDate(
          ocrResult.date,
        );

        // Log validation results for debugging
        DateValidationUtil.logValidationResult(dateValidationResult);

        if (dateValidationResult.isValid) {
          receiptDate = dateValidationResult.parsedDate;
          receiptTime = ocrResult.time;
          console.log(
            '✅ Using validated receipt date:',
            receiptDate?.toISOString(),
          );
        } else if (dateValidationResult.suggestedDate) {
          // Use suggested date but mark for user confirmation
          receiptDate = dateValidationResult.suggestedDate;
          receiptTime = ocrResult.time;
          console.log(
            '⚠️ Using suggested date (requires user confirmation):',
            receiptDate?.toISOString(),
          );
        } else {
          // Fall back to current date if no valid date can be determined
          receiptDate = new Date();
          receiptTime = undefined;
          console.log(
            '❌ Using current date as fallback:',
            receiptDate.toISOString(),
          );
        }
      } else {
        console.log('❌ No date extracted from OCR, using current date');
        receiptDate = new Date();
        dateValidationResult = DateValidationUtil.validateReceiptDate('');
        DateValidationUtil.logValidationResult(dateValidationResult);
      }

      // Step 3: Create the receipt record (with or without store)
      const receipt = manager.create(Receipt, {
        userSk: sanitizedUserId,
        storeSk: storeSk, // May be undefined if store not found
        imageUrl: uploadedFilePath,
        status: 'processing',

        // OCR metadata
        rawText: ocrResult.raw_text,
        ocrConfidence: ocrResult.azure_confidence,
        engineUsed: ocrResult.engine_used,
        ocrData: {
          ...ocrResult,
          // Add date validation results to OCR data for debugging and user confirmation
          dateValidation: dateValidationResult,
        },

        // Enhanced normalization data (if available)
        normalizationSummary: this.isEnhancedResult(ocrResult)
          ? ocrResult.normalization_summary
          : undefined,

        // Receipt financial data
        receiptDate,
        receiptTime,
        subtotal: ocrResult.subtotal,
        tax: ocrResult.tax,
        total: ocrResult.total,
        purchaseDate: receiptDate || new Date(),
      });

      console.log('💾 Receipt Save Debug:');
      console.log(
        '  receiptDate (DB field):',
        receipt.receiptDate?.toISOString(),
      );
      console.log(
        '  purchaseDate (DB field):',
        receipt.purchaseDate?.toISOString(),
      );
      console.log(
        '  Date requires user confirmation:',
        dateValidationResult?.requiresUserConfirmation,
      );

      const savedReceipt = await manager.save(receipt);

      console.log('✅ Receipt saved successfully:');
      console.log('  Receipt ID:', savedReceipt.receiptSk);
      console.log(
        '  Saved receiptDate:',
        savedReceipt.receiptDate?.toISOString(),
      );
      console.log(
        '  Saved purchaseDate:',
        savedReceipt.purchaseDate?.toISOString(),
      );

      // Step 4: Create receipt items
      await Promise.all(
        ocrResult.items.map(async (item) => {
          // Validate item structure first
          if (!this.isBaseOcrItem(item)) {
            console.warn('Invalid item structure, skipping:', item);
            return;
          }

          // Use type guard to safely check for enhanced properties
          const enhancedItem = this.isEnhancedItem(item) ? item : null;

          // DO NOT create products during receipt processing
          // Products should only be linked through the normalization/confirmation flow
          const productSk: string | undefined = undefined;

          // Parse price (handle string prices from OCR)
          const price =
            typeof item.price === 'string'
              ? parseFloat(item.price.replace(/[^0-9.-]/g, '')) || 0
              : Number(item.price) || 0;

          const quantity =
            typeof item.quantity === 'string'
              ? parseInt(item.quantity, 10) || 1
              : Number(item.quantity) || 1;

          // Create the receipt item with only OCR data
          const receiptItem = manager.create(ReceiptItem, {
            receiptSk: savedReceipt.receiptSk,
            productSk,
            price,
            quantity,

            // Core OCR data only
            rawName: item.name || 'Unknown Item', // Ensure rawName is never undefined
            itemCode: enhancedItem?.item_number || item.item_number,

            // OCR flags (determined from raw text, not from normalization)
            isDiscountLine: enhancedItem?.is_discount || false,
            isAdjustmentLine: enhancedItem?.is_adjustment || false,
          });

          return manager.save(receiptItem);
        }),
      );

      // Step 5: Update receipt status to done
      savedReceipt.status = 'done';
      await manager.save(savedReceipt);

      // Step 6: Load complete receipt with relationships
      const completeReceipt = await manager.findOne(Receipt, {
        where: { id: savedReceipt.id },
        relations: ['user', 'store', 'items', 'items.product'],
      });

      return completeReceipt!;
    });
  }

  async updateReceipt(
    id: string,
    receiptData: Partial<ReceiptDTO>,
  ): Promise<ReceiptDTO> {
    const receipt = await this.getReceiptEntityById(id);
    if (!receipt) {
      throw new NotFoundException(`Receipt with ID ${id} not found`);
    }

    // Update fields
    if (receiptData.status) {
      receipt.status = receiptData.status;
    }
    if (receiptData.purchaseDate) {
      receipt.purchaseDate = new Date(receiptData.purchaseDate);
    }

    const updatedReceipt = await this.receiptRepository.save(receipt);

    // Reload with relations
    const completeReceipt = await this.receiptRepository.findOne({
      where: { id: updatedReceipt.id },
      relations: ['user', 'store', 'items', 'items.product'],
    });

    return this.mapReceiptToDTO(completeReceipt!);
  }

  async deleteReceipt(id: string): Promise<void> {
    const receipt = await this.getReceiptEntityById(id);
    if (!receipt) {
      throw new NotFoundException(`Receipt with ID ${id} not found`);
    }

    await this.receiptRepository.remove(receipt);
  }

  // 🔐 USER-SCOPED METHODS (with ownership verification)

  /**
   * Get receipt by ID with user ownership verification
   */
  async getReceiptByIdForUser(
    id: string,
    userId: string,
  ): Promise<ReceiptDTO | null> {
    // Try to find by receiptSk (UUID) first, then by id (integer)
    let receipt = await this.receiptRepository.findOne({
      where: { receiptSk: id, userSk: userId },
      relations: ['user', 'store', 'items', 'items.product'],
    });

    // If not found by receiptSk, try by integer id
    if (!receipt && !isNaN(Number(id))) {
      receipt = await this.receiptRepository.findOne({
        where: { id: Number(id), userSk: userId },
        relations: ['user', 'store', 'items', 'items.product'],
      });
    }

    return receipt ? this.mapReceiptToDTO(receipt) : null;
  }

  /**
   * Update receipt with user ownership verification
   */
  async updateReceiptForUser(
    id: string,
    receiptData: Partial<ReceiptDTO>,
    userId: string,
  ): Promise<ReceiptDTO> {
    // First verify user ownership
    const existingReceipt = await this.getReceiptByIdForUser(id, userId);
    if (!existingReceipt) {
      throw new NotFoundException(
        `Receipt with ID ${id} not found or access denied`,
      );
    }

    // Get the actual entity for updating
    const receipt = await this.getReceiptEntityById(id);
    if (!receipt) {
      throw new NotFoundException(`Receipt with ID ${id} not found`);
    }

    // Update fields
    if (receiptData.status) {
      receipt.status = receiptData.status;
    }
    if (receiptData.purchaseDate) {
      receipt.purchaseDate = new Date(receiptData.purchaseDate);
    }

    const updatedReceipt = await this.receiptRepository.save(receipt);

    // Reload with relations
    const completeReceipt = await this.receiptRepository.findOne({
      where: { id: updatedReceipt.id },
      relations: ['user', 'store', 'items', 'items.product'],
    });

    return this.mapReceiptToDTO(completeReceipt!);
  }

  /**
   * Delete receipt with user ownership verification
   */
  async deleteReceiptForUser(id: string, userId: string): Promise<void> {
    // First verify user ownership
    const existingReceipt = await this.getReceiptByIdForUser(id, userId);
    if (!existingReceipt) {
      throw new NotFoundException(
        `Receipt with ID ${id} not found or access denied`,
      );
    }

    // Get the actual entity for deletion
    const receipt = await this.getReceiptEntityById(id);
    if (!receipt) {
      throw new NotFoundException(`Receipt with ID ${id} not found`);
    }

    await this.receiptRepository.remove(receipt);
  }

  /**
   * Update the purchase date for a receipt
   * This is used when users confirm/correct the date after OCR processing
   */
  async updateReceiptDate(
    receiptId: string,
    confirmedDate: string,
    confirmedTime?: string,
  ): Promise<ReceiptDTO> {
    // Verify the receipt exists
    let receipt = await this.receiptRepository.findOne({
      where: { receiptSk: receiptId },
    });

    // If not found by receiptSk, try by integer id
    if (!receipt && !isNaN(Number(receiptId))) {
      receipt = await this.receiptRepository.findOne({
        where: { id: Number(receiptId) },
      });
    }

    if (!receipt) {
      throw new NotFoundException(`Receipt with ID ${receiptId} not found`);
    }

    // Validate the new date - but be permissive for user confirmations
    const dateValidation =
      DateValidationUtil.validateReceiptDate(confirmedDate);
    DateValidationUtil.logValidationResult(dateValidation);

    // For user confirmations, we're more permissive - just ensure the date parses correctly
    let newDate: Date;
    try {
      newDate = new Date(confirmedDate);
      if (isNaN(newDate.getTime())) {
        throw new BadRequestException(
          `Invalid date format provided: ${confirmedDate}. Please use YYYY-MM-DD format.`,
        );
      }
    } catch {
      throw new BadRequestException(
        `Failed to parse date: ${confirmedDate}. Please use YYYY-MM-DD format.`,
      );
    }

    // If validation failed but user is explicitly confirming, accept it with a warning
    if (!dateValidation.isValid) {
      console.warn('⚠️ User confirmed date despite validation warnings:', {
        originalDate: confirmedDate,
        warnings: dateValidation.warnings,
        validationRules: dateValidation.validationRules,
      });
    }

    console.log('📅 Receipt Date Update:');
    console.log(`  Receipt ID: ${receiptId}`);

    // Safely handle existing dates - ensure they are Date objects before calling toISOString
    const oldReceiptDate = receipt.receiptDate
      ? receipt.receiptDate instanceof Date
        ? receipt.receiptDate
        : new Date(receipt.receiptDate)
      : null;
    const oldPurchaseDate = receipt.purchaseDate
      ? receipt.purchaseDate instanceof Date
        ? receipt.purchaseDate
        : new Date(receipt.purchaseDate)
      : null;

    console.log(
      `  Old receiptDate: ${oldReceiptDate?.toISOString() || 'null'}`,
    );
    console.log(
      `  Old purchaseDate: ${oldPurchaseDate?.toISOString() || 'null'}`,
    );
    console.log(`  New date: ${newDate.toISOString()}`);
    console.log(`  Confirmed time: ${confirmedTime || 'none'}`);

    // Update both receiptDate and purchaseDate
    receipt.receiptDate = newDate;
    receipt.purchaseDate = newDate;
    receipt.receiptTime = confirmedTime;

    // Update the OCR data to include the user's confirmation
    if (receipt.ocrData) {
      const updatedOcrData = {
        ...(receipt.ocrData as Record<string, unknown>),
        date: confirmedDate,
        time: confirmedTime,
        dateValidation: {
          ...dateValidation,
          userConfirmed: true,
          confirmedBy: 'user',
          confirmedAt: new Date().toISOString(),
        },
      };
      receipt.ocrData = updatedOcrData;
    }

    const updatedReceipt = await this.receiptRepository.save(receipt);

    console.log('✅ Receipt date updated successfully:');
    console.log(
      `  New receiptDate: ${updatedReceipt.receiptDate?.toISOString()}`,
    );
    console.log(
      `  New purchaseDate: ${updatedReceipt.purchaseDate?.toISOString()}`,
    );

    // Reload with relations
    const completeReceipt = await this.receiptRepository.findOne({
      where: { receiptSk: updatedReceipt.receiptSk },
      relations: ['user', 'store', 'items', 'items.product'],
      cache: false,
    });

    return this.mapReceiptToDTO(completeReceipt!);
  }

  /**
   * Update the store associated with a receipt
   * This is used when users edit/select the correct store during receipt processing
   */
  async updateReceiptStore(
    receiptId: string,
    storeId: string,
  ): Promise<ReceiptDTO> {
    // Verify the receipt exists - fetch WITHOUT relations to avoid cached store data
    let receipt = await this.receiptRepository.findOne({
      where: { receiptSk: receiptId },
    });

    // If not found by receiptSk, try by integer id
    if (!receipt && !isNaN(Number(receiptId))) {
      receipt = await this.receiptRepository.findOne({
        where: { id: Number(receiptId) },
      });
    }

    if (!receipt) {
      throw new NotFoundException(`Receipt with ID ${receiptId} not found`);
    }

    // Verify the store exists
    const store = await this.storeService.getStoreById(storeId);
    if (!store) {
      throw new NotFoundException(`Store with ID ${storeId} not found`);
    }

    // Update the store relationship
    console.log(`🔄 Before update - Receipt storeSk: ${receipt.storeSk}`);
    console.log(`🔄 Updating to store ID: ${store.id} (${store.name})`);

    receipt.storeSk = store.id; // store.id contains the storeSk (UUID)

    // Let's also try using the repository manager to force a fresh transaction
    const updatedReceipt = await this.receiptRepository.manager.transaction(
      async (manager) => {
        const result = await manager.save(Receipt, receipt);
        console.log(`💾 Transaction save result - storeSk: ${result.storeSk}`);

        // Verify in database immediately
        const dbCheck = await manager.findOne(Receipt, {
          where: { receiptSk: result.receiptSk },
        });
        console.log(`🔍 Database verification - storeSk: ${dbCheck?.storeSk}`);

        return result;
      },
    );

    console.log(
      `💾 After transaction - Receipt storeSk: ${updatedReceipt.storeSk}`,
    );

    // Additional verification with raw SQL query
    try {
      const rawResult: unknown = await this.receiptRepository.query(
        'SELECT receipt_sk, store_sk FROM "Receipt" WHERE receipt_sk = $1',
        [updatedReceipt.receiptSk],
      );

      if (Array.isArray(rawResult) && rawResult.length > 0) {
        console.log(
          `🗄️  Raw SQL result:`,
          rawResult[0] as { receipt_sk: string; store_sk: string },
        );
      } else {
        console.log(`🗄️  No raw SQL results found`);
      }
    } catch (sqlError) {
      console.log(`❌ SQL query error:`, sqlError);
    }

    // Clear any potential cache and reload with fresh relations
    await this.receiptRepository.manager.connection.queryResultCache?.clear();

    // Force a fresh query by using the storeSk field we just updated
    const completeReceipt = await this.receiptRepository.findOne({
      where: { receiptSk: updatedReceipt.receiptSk },
      relations: ['user', 'store', 'items', 'items.product'],
      cache: false, // Disable cache for this query
    });

    console.log(
      `📋 Reloaded receipt store: ${completeReceipt?.store?.name || 'No store'} (${completeReceipt?.storeSk})`,
    );

    // Additional verification - check if storeSk matches
    if (completeReceipt?.storeSk === store.id) {
      console.log(`✅ Store update verified - storeSk matches: ${store.id}`);
    } else {
      console.log(
        `❌ Store update failed - storeSk mismatch: ${completeReceipt?.storeSk} vs ${store.id}`,
      );
    }

    console.log(
      `✅ Updated receipt ${receiptId} store to: ${store.id} (${store.name})`,
    );

    return this.mapReceiptToDTO(completeReceipt!);
  }

  // 📊 ANALYTICS AND SEARCH METHODS

  /**
   * Search receipts with multiple criteria
   */
  async searchReceipts(params: ReceiptSearchParams): Promise<ReceiptDTO[]> {
    const {
      userId,
      storeId,
      status,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      limit = 50,
    } = params;

    let query = this.receiptRepository
      .createQueryBuilder('receipt')
      .leftJoinAndSelect('receipt.user', 'user')
      .leftJoinAndSelect('receipt.store', 'store')
      .leftJoinAndSelect('receipt.items', 'items')
      .leftJoinAndSelect('items.product', 'product');

    // Add filters
    if (userId) {
      query = query.andWhere('receipt.userSk = :userId', { userId });
    }

    if (storeId) {
      query = query.andWhere('receipt.storeSk = :storeId', { storeId });
    }

    if (status) {
      query = query.andWhere('receipt.status = :status', { status });
    }

    if (startDate) {
      query = query.andWhere('receipt.purchaseDate >= :startDate', {
        startDate,
      });
    }

    if (endDate) {
      query = query.andWhere('receipt.purchaseDate <= :endDate', { endDate });
    }

    // Calculate total amount from items and apply filters
    if (minAmount !== undefined || maxAmount !== undefined) {
      query = query.having('SUM(items.lineTotal) IS NOT NULL');

      if (minAmount !== undefined) {
        query = query.andHaving('SUM(items.lineTotal) >= :minAmount', {
          minAmount,
        });
      }

      if (maxAmount !== undefined) {
        query = query.andHaving('SUM(items.lineTotal) <= :maxAmount', {
          maxAmount,
        });
      }
    }

    const receipts = await query
      .groupBy('receipt.id')
      .addGroupBy('user.id')
      .addGroupBy('store.id')
      .orderBy('receipt.createdAt', 'DESC')
      .limit(limit)
      .getMany();

    return Promise.all(
      receipts.map((receipt) => this.mapReceiptToDTO(receipt)),
    );
  }

  /**
   * Get receipt statistics for a user
   */
  async getUserReceiptStats(userId: string): Promise<{
    totalReceipts: number;
    totalSpent: number;
    averageSpent: number;
    topStores: { storeName: string; count: number; totalSpent: number }[];
  }> {
    const receipts = await this.receiptRepository
      .createQueryBuilder('receipt')
      .leftJoinAndSelect('receipt.store', 'store')
      .leftJoinAndSelect('receipt.items', 'items')
      .where('receipt.userSk = :userId', { userId })
      .andWhere('receipt.status = :status', { status: 'done' })
      .getMany();

    const totalReceipts = receipts.length;
    const totalSpent = receipts.reduce(
      (sum, receipt) =>
        sum +
        receipt.items.reduce(
          (itemSum, item) => itemSum + Number(item.lineTotal),
          0,
        ),
      0,
    );
    const averageSpent = totalReceipts > 0 ? totalSpent / totalReceipts : 0;

    // Calculate top stores
    const storeStats = new Map<string, { count: number; totalSpent: number }>();
    receipts.forEach((receipt) => {
      const storeName = receipt.store?.name || 'Unknown Store';
      const receiptTotal = receipt.items.reduce(
        (sum, item) => sum + Number(item.lineTotal),
        0,
      );

      if (storeStats.has(storeName)) {
        const stats = storeStats.get(storeName)!;
        stats.count += 1;
        stats.totalSpent += receiptTotal;
      } else {
        storeStats.set(storeName, { count: 1, totalSpent: receiptTotal });
      }
    });

    const topStores = Array.from(storeStats.entries())
      .map(([storeName, stats]) => ({ storeName, ...stats }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    return {
      totalReceipts,
      totalSpent,
      averageSpent,
      topStores,
    };
  }

  /**
   * Get receipts by status
   */
  async getReceiptsByStatus(
    status: ReceiptStatus,
    limit: number = 50,
  ): Promise<ReceiptDTO[]> {
    const receipts = await this.receiptRepository.find({
      where: { status },
      relations: ['user', 'store', 'items', 'items.product'],
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      receipts.map((receipt) => this.mapReceiptToDTO(receipt)),
    );
  }

  /**
   * Update receipt status (for processing pipeline)
   */
  async updateReceiptStatus(
    id: string,
    status: ReceiptStatus,
  ): Promise<ReceiptDTO> {
    const receipt = await this.getReceiptEntityById(id);
    if (!receipt) {
      throw new NotFoundException(`Receipt with ID ${id} not found`);
    }

    receipt.status = status;
    await this.receiptRepository.save(receipt);

    const completeReceipt = await this.receiptRepository.findOne({
      where: { id: receipt.id },
      relations: ['user', 'store', 'items', 'items.product'],
    });

    return this.mapReceiptToDTO(completeReceipt!);
  }

  /**
   * Test product normalization on receipt items
   * Demonstrates how raw receipt items are normalized, categorized, and matched
   */
  async testNormalization(
    request: TestNormalizationRequestDto,
  ): Promise<TestNormalizationResponseDto> {
    const { storeName, items } = request;
    const processedAt = new Date().toISOString();

    // Process each item through the normalization service
    const normalizationResults: NormalizationTestResultDto[] =
      await Promise.all(
        items.map(async (item) => {
          // Normalize the product
          const normalizationResult =
            await this.productNormalizationService.normalizeProduct({
              merchant: storeName,
              rawName: item.productName,
              itemCode: item.barcode,
              useAI: true, // Enable AI for comprehensive testing
            });

          // Calculate line total
          const lineTotal = item.price * item.quantity;

          // Build the test result
          const testResult: NormalizationTestResultDto = {
            originalName: item.productName,
            normalizedName: normalizationResult.normalizedName,
            brand: normalizationResult.brand,
            category: normalizationResult.category,
            confidenceScore: normalizationResult.confidenceScore,
            isDiscount: normalizationResult.isDiscount,
            isAdjustment: normalizationResult.isAdjustment,
            itemCode: item.barcode,
            normalizationMethod: normalizationResult.method || 'fallback',
            price: item.price,
            quantity: item.quantity,
            lineTotal,
          };

          // Add similar products if found
          if (
            normalizationResult.similarProducts &&
            normalizationResult.similarProducts.length > 0
          ) {
            testResult.similarProducts =
              normalizationResult.similarProducts.map((similar) => ({
                productId: similar.productId,
                similarity: similar.similarity,
                normalizedName: similar.normalizedName,
                merchant: similar.merchant,
              }));
          }

          return testResult;
        }),
      );

    // Calculate summary statistics
    const totalItems = normalizationResults.length;
    const productItems = normalizationResults.filter(
      (r) => !r.isDiscount && !r.isAdjustment,
    ).length;
    const discountItems = normalizationResults.filter(
      (r) => r.isDiscount,
    ).length;
    const adjustmentItems = normalizationResults.filter(
      (r) => r.isAdjustment,
    ).length;

    // Calculate average confidence (excluding discounts/adjustments)
    const productConfidenceScores = normalizationResults
      .filter((r) => !r.isDiscount && !r.isAdjustment)
      .map((r) => r.confidenceScore);
    const averageConfidence =
      productConfidenceScores.length > 0
        ? productConfidenceScores.reduce((sum, score) => sum + score, 0) /
          productConfidenceScores.length
        : 0;

    // Calculate total receipt amount
    const totalAmount = normalizationResults.reduce(
      (sum, result) => sum + result.lineTotal,
      0,
    );

    return {
      storeName,
      totalItems,
      productItems,
      discountItems,
      adjustmentItems,
      averageConfidence: Math.round(averageConfidence * 100) / 100, // Round to 2 decimal places
      totalAmount: Math.round(totalAmount * 100) / 100, // Round to 2 decimal places
      items: normalizationResults,
      processedAt,
    };
  }

  // PRIVATE HELPER METHODS

  private async getReceiptEntityById(id: string): Promise<Receipt | null> {
    // Try to find by receiptSk (UUID) first, then by id (integer)
    let receipt = await this.receiptRepository.findOne({
      where: { receiptSk: id },
      relations: ['user', 'store', 'items', 'items.product'],
    });

    // If not found by receiptSk, try by integer id
    if (!receipt && !isNaN(Number(id))) {
      receipt = await this.receiptRepository.findOne({
        where: { id: Number(id) },
        relations: ['user', 'store', 'items', 'items.product'],
      });
    }

    return receipt;
  }

  private async mapReceiptToDTO(receipt: Receipt): Promise<ReceiptDTO> {
    // If storeSk exists but store relation is missing/stale, fetch the store directly
    let storeName = 'Unknown Store';
    if (receipt.storeSk) {
      if (receipt.store && receipt.store.storeSk === receipt.storeSk) {
        // Store relationship is correct
        storeName = receipt.store.name;
      } else {
        // Store relationship might be stale, fetch fresh store data
        console.log(
          `🔄 Fetching fresh store data for storeSk: ${receipt.storeSk}`,
        );
        const freshStore = await this.storeService.getStoreById(
          receipt.storeSk,
        );
        storeName = freshStore?.name || 'Unknown Store';
        console.log(`🏪 Fresh store name: ${storeName}`);
      }
    }

    // Safely convert purchase date to ISO string
    const safeToISOString = (
      date: Date | string | null | undefined,
    ): string => {
      if (!date) return new Date().toISOString();
      if (date instanceof Date) return date.toISOString();
      try {
        const parsedDate = new Date(date);
        return isNaN(parsedDate.getTime())
          ? new Date().toISOString()
          : parsedDate.toISOString();
      } catch {
        return new Date().toISOString();
      }
    };
    // Convert receipt items to product DTOs
    const items: NormalizedProductDTO[] = await Promise.all(
      receipt.items.map(async (item) => {
        const product = item.product
          ? await this.productService.getProductById(item.product.productSk)
          : null;
        return {
          product_sk: item.productSk || 'unknown',
          name: product?.name || 'Unknown Product',
          barcode: product?.barcode,
          category:
            typeof product?.category === 'number'
              ? product.category
              : undefined,
          price: Number(item.price),
          image_url: product?.image_url,
          quantity: item.quantity,
          created_at: safeToISOString(item.createdAt),
          updated_at: safeToISOString(item.updatedAt),
          credit_score: product?.credit_score ?? 0,
          verified_count: product?.verified_count ?? 0,
          flagged_count: product?.flagged_count ?? 0,
        };
      }),
    );

    return {
      id: receipt.receiptSk, // Use UUID as the public ID
      userId: receipt.userSk,
      storeName: storeName, // Use the fresh store name we fetched
      purchaseDate: safeToISOString(receipt.purchaseDate),
      status: receipt.status,
      totalAmount: receipt.items.reduce(
        (sum, item) => sum + Number(item.lineTotal),
        0,
      ),
      items,
      createdAt: safeToISOString(receipt.createdAt),
      updatedAt: safeToISOString(receipt.updatedAt),
    };
  }

  /**
   * Helper method to check if OCR result is enhanced (has normalization data)
   */
  private isEnhancedResult(
    ocrResult: EnhancedOcrResult | OcrResult,
  ): ocrResult is EnhancedOcrResult {
    return 'normalization_summary' in ocrResult;
  }

  /**
   * Type guard to check if an item has enhanced normalization data
   */
  private isEnhancedItem(item: unknown): item is EnhancedReceiptItem {
    return (
      item !== null &&
      typeof item === 'object' &&
      item !== undefined &&
      'name' in item &&
      ('normalized_name' in item ||
        'brand' in item ||
        'category' in item ||
        'confidence_score' in item)
    );
  }

  /**
   * Type guard to check if an item is at least a base OCR item
   */
  private isBaseOcrItem(item: unknown): item is BaseOcrItem {
    return (
      item !== null &&
      typeof item === 'object' &&
      item !== undefined &&
      'name' in item &&
      'price' in item &&
      'quantity' in item
    );
  }
}
