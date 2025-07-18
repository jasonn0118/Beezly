/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as sharp from 'sharp';
import * as heicConvert from 'heic-convert';

export interface OcrItem {
  name: string;
  price: string;
  quantity: string;
  unit_price?: string;
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
  raw_text: string;
  azure_confidence?: number;
  engine_used: string;
  uploaded_file_path?: string;
}

@Injectable()
export class OcrService {
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

    const brand = buffer.slice(ftypOffset + 4, ftypOffset + 8).toString();
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
   * Extract text using Azure Form Recognizer Receipt API v4.0
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

      // Azure Form Recognizer Receipt API v4.0 endpoint
      const analyzeUrl = `${endpoint}/formrecognizer/documentModels/prebuilt-receipt:analyze?api-version=2023-07-31`;

      const headers = {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/octet-stream',
      };

      // Submit image for analysis
      const response = await axios.post(analyzeUrl, finalBuffer, {
        headers,
      });

      if (response.status !== 202) {
        throw new Error(
          `Azure API error: ${response.status} - ${response.statusText}`,
        );
      }

      // Get operation location for polling
      const operationLocation = response.headers['operation-location'];
      if (!operationLocation) {
        throw new Error('Azure API error: No operation location received');
      }

      // Poll for results
      const getHeaders = { 'Ocp-Apim-Subscription-Key': apiKey };
      const maxRetries = 30;
      let retryCount = 0;

      while (retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

        const resultResponse = await axios.get(operationLocation, {
          headers: getHeaders,
        });

        if (resultResponse.status === 200) {
          const result = resultResponse.data;

          if (result.status === 'succeeded') {
            return this.parseAzureResponse(result);
          } else if (result.status === 'failed') {
            throw new Error(
              `Azure analysis failed: ${result.error || 'Unknown error'}`,
            );
          }
        }

        retryCount++;
      }

      throw new Error('Azure API timeout: Analysis took too long');
    } catch (error) {
      throw new Error(
        `Azure API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Parse Azure Form Recognizer response into structured data
   */
  private parseAzureResponse(azureResult: unknown): OcrResult {
    try {
      // Type guard for azureResult
      if (!azureResult || typeof azureResult !== 'object') {
        throw new Error('Invalid Azure response format');
      }

      const result = azureResult as {
        analyzeResult?: { documents?: unknown[]; pages?: unknown[] };
      };
      const documents = result.analyzeResult?.documents || [];
      if (!Array.isArray(documents) || !documents.length) {
        throw new Error('No receipt data found by Azure');
      }

      const receipt = documents[0] as {
        fields?: Record<string, any>;
        confidence?: number;
      };
      const fields = receipt.fields || {};

      // Debug: Log Azure response structure (remove in production)
      console.log('=== AZURE RESPONSE DEBUG ===');
      console.log('Available Azure fields:', Object.keys(fields));

      // Check for any address-related fields
      const addressFields = Object.keys(fields).filter(
        (key) =>
          key.toLowerCase().includes('address') ||
          key.toLowerCase().includes('merchant') ||
          key.toLowerCase().includes('vendor') ||
          key.toLowerCase().includes('location'),
      );
      console.log('Address-related fields found:', addressFields);

      // Log detailed structure for key fields
      if (fields.Total) {
        console.log(
          'Total field structure:',
          JSON.stringify(fields.Total, null, 2),
        );
      }
      if (fields.Subtotal) {
        console.log(
          'Subtotal field structure:',
          JSON.stringify(fields.Subtotal, null, 2),
        );
      }
      if (fields.TotalTax) {
        console.log(
          'TotalTax field structure:',
          JSON.stringify(fields.TotalTax, null, 2),
        );
      }
      if (fields.Items) {
        console.log(
          'Items field structure:',
          JSON.stringify(fields.Items, null, 2),
        );
      }
      if (fields.TransactionDate) {
        console.log(
          'TransactionDate field structure:',
          JSON.stringify(fields.TransactionDate, null, 2),
        );
      }

      // Check for any date-related fields
      const dateFields = Object.keys(fields).filter(
        (key) =>
          key.toLowerCase().includes('date') ||
          key.toLowerCase().includes('time'),
      );
      console.log('Date/Time-related fields found:', dateFields);

      // Log all date-related fields
      dateFields.forEach((fieldName) => {
        if (fields[fieldName]) {
          console.log(
            `${fieldName} field structure:`,
            JSON.stringify(fields[fieldName], null, 2),
          );
        }
      });
      if (fields.TransactionTime) {
        console.log(
          'TransactionTime field structure:',
          JSON.stringify(fields.TransactionTime, null, 2),
        );
      }
      if (fields.MerchantAddress) {
        console.log(
          'MerchantAddress field structure:',
          JSON.stringify(fields.MerchantAddress, null, 2),
        );
      }
      if (fields.VendorAddress) {
        console.log(
          'VendorAddress field structure:',
          JSON.stringify(fields.VendorAddress, null, 2),
        );
      }
      if (fields.Address) {
        console.log(
          'Address field structure:',
          JSON.stringify(fields.Address, null, 2),
        );
      }
      console.log('=== END DEBUG ===');

      // Get raw text for fallback parsing (move this up)
      const pages = result.analyzeResult?.pages || [];
      let rawLines: string[] = [];
      if (Array.isArray(pages) && pages.length > 0) {
        const page = pages[0] as { lines?: unknown[] };
        const lines = page.lines || [];
        if (Array.isArray(lines)) {
          rawLines = lines.map((line: unknown) => {
            const lineObj = line as { content?: string };
            return lineObj.content || '';
          });
        }
      }

      // Extract structured data using Microsoft's official field names
      let merchant = '';
      if (fields.MerchantName) {
        merchant =
          fields.MerchantName.value_string ||
          fields.MerchantName.valueString ||
          '';
      }

      let date = '';
      const dateFieldNames = [
        'TransactionDate',
        'Date',
        'ReceiptDate',
        'PurchaseDate',
      ];

      for (const fieldName of dateFieldNames) {
        if (fields[fieldName]) {
          const dateField = fields[fieldName];
          let extractedDate = '';

          // Try different field access patterns for date
          if (dateField.value_date) {
            extractedDate = dateField.value_date;
          } else if (dateField.valueDate) {
            extractedDate = dateField.valueDate;
          } else if (dateField.value_string) {
            extractedDate = dateField.value_string;
          } else if (dateField.valueString) {
            extractedDate = dateField.valueString;
          } else if (dateField.content) {
            extractedDate = dateField.content;
          }

          if (extractedDate) {
            console.log(`Date extracted from ${fieldName}:`, extractedDate);
            date = extractedDate;
            break;
          }
        }
      }

      // If no date found from structured data, try to extract from raw text
      if (!date && rawLines.length > 0) {
        date = this.extractDateFromText(rawLines);
        console.log('Date extracted from text parsing:', date);
      }

      // If we have a date from structured data, also try text parsing to compare
      if (date && rawLines.length > 0) {
        const textDate = this.extractDateFromText(rawLines);
        if (textDate && textDate !== date) {
          console.log('⚠️  DATE MISMATCH DETECTED:');
          console.log('  Structured date:', date);
          console.log('  Text parsed date:', textDate);
          console.log('  Using text parsed date for better accuracy');
          date = textDate; // Use text parsed date as it might be more accurate
        }
      }

      // Extract time
      let time = '';
      if (fields.TransactionTime) {
        const timeField = fields.TransactionTime;
        // Try different field access patterns for time
        if (timeField.value_time) {
          time = timeField.value_time;
        } else if (timeField.valueTime) {
          time = timeField.valueTime;
        } else if (timeField.value_string) {
          time = timeField.value_string;
        } else if (timeField.valueString) {
          time = timeField.valueString;
        } else if (timeField.content) {
          time = timeField.content;
        }
        console.log('Time extracted from structured data:', time);
      }

      // If no time found, try to extract from raw text
      if (!time && rawLines.length > 0) {
        time = this.extractTimeFromText(rawLines);
        console.log('Time extracted from text:', time);
      }

      let total = '';
      if (fields.Total) {
        const totalField = fields.Total;
        // Try different field access patterns
        if (totalField.value_currency) {
          const amount = totalField.value_currency.amount || '';
          const currency = totalField.value_currency.currency_symbol || '$';
          total = amount ? `${currency}${amount}` : String(amount);
        } else if (totalField.valueCurrency) {
          const amount = totalField.valueCurrency.amount || '';
          const currency = totalField.valueCurrency.currencySymbol || '$';
          total = amount ? `${currency}${amount}` : String(amount);
        } else if (totalField.valueString) {
          total = totalField.valueString;
        } else if (totalField.value_string) {
          total = totalField.value_string;
        } else if (totalField.valueNumber) {
          total = `$${totalField.valueNumber.toFixed(2)}`;
        } else if (totalField.value_number) {
          total = `$${totalField.value_number.toFixed(2)}`;
        }
        console.log('Total extracted:', total);
      }

      // Extract subtotal using Microsoft's exact field name
      let subtotal = '';
      if (fields.Subtotal) {
        const subtotalField = fields.Subtotal;
        // Try different field access patterns
        if (subtotalField.value_currency) {
          const amount = subtotalField.value_currency.amount || '';
          const currency = subtotalField.value_currency.currency_symbol || '$';
          subtotal = amount ? `${currency}${amount}` : String(amount);
        } else if (subtotalField.valueCurrency) {
          const amount = subtotalField.valueCurrency.amount || '';
          const currency = subtotalField.valueCurrency.currencySymbol || '$';
          subtotal = amount ? `${currency}${amount}` : String(amount);
        } else if (subtotalField.valueString) {
          subtotal = subtotalField.valueString;
        } else if (subtotalField.value_string) {
          subtotal = subtotalField.value_string;
        } else if (subtotalField.valueNumber) {
          subtotal = `$${subtotalField.valueNumber.toFixed(2)}`;
        } else if (subtotalField.value_number) {
          subtotal = `$${subtotalField.value_number.toFixed(2)}`;
        }
        console.log('Subtotal extracted:', subtotal);
      }

      // Extract tax using Microsoft's exact field name
      let tax = '';
      if (fields.TotalTax) {
        const taxField = fields.TotalTax;
        // Try different field access patterns
        if (taxField.value_currency) {
          const amount = taxField.value_currency.amount || '';
          const currency = taxField.value_currency.currency_symbol || '$';
          tax = amount ? `${currency}${amount}` : String(amount);
        } else if (taxField.valueCurrency) {
          const amount = taxField.valueCurrency.amount || '';
          const currency = taxField.valueCurrency.currencySymbol || '$';
          tax = amount ? `${currency}${amount}` : String(amount);
        } else if (taxField.valueString) {
          tax = taxField.valueString;
        } else if (taxField.value_string) {
          tax = taxField.value_string;
        } else if (taxField.valueNumber) {
          tax = `$${taxField.valueNumber.toFixed(2)}`;
        } else if (taxField.value_number) {
          tax = `$${taxField.value_number.toFixed(2)}`;
        }
        console.log('Tax extracted:', tax);
      }

      // Extract store address using various field names Azure might use
      let storeAddress = '';
      const addressFieldNames = [
        'MerchantAddress',
        'VendorAddress',
        'Address',
        'MerchantPhysicalAddress',
        'StoreAddress',
        'BusinessAddress',
        'Location',
      ];

      for (const fieldName of addressFieldNames) {
        if (fields[fieldName]) {
          const addressField = fields[fieldName];
          if (addressField.value_string) {
            storeAddress = addressField.value_string;
            break;
          } else if (addressField.valueString) {
            storeAddress = addressField.valueString;
            break;
          } else if (addressField.content) {
            storeAddress = addressField.content;
            break;
          }
        }
      }

      console.log('Store address from structured data:', storeAddress);

      // If no structured address found, try to extract from raw text
      if (!storeAddress && rawLines.length > 0) {
        storeAddress = this.extractAddressFromText(rawLines);
        console.log('Store address from text parsing:', storeAddress);
      }

      // If still no address, try a more aggressive text search
      if (!storeAddress && rawLines.length > 0) {
        storeAddress = this.extractAddressFromTextAggressive(rawLines);
        console.log(
          'Store address from aggressive text parsing:',
          storeAddress,
        );
      }

      // If no structured financial data found, try to extract from raw text
      if (!total && rawLines.length > 0) {
        total = this.extractFinancialFieldFromText(rawLines, 'total');
      }
      if (!subtotal && rawLines.length > 0) {
        subtotal = this.extractFinancialFieldFromText(rawLines, 'subtotal');
      }
      if (!tax && rawLines.length > 0) {
        tax = this.extractFinancialFieldFromText(rawLines, 'tax');
      }

      // Extract items
      const items: OcrItem[] = [];
      let itemsFound = false;

      // Method 1: Standard Items field - Following Microsoft's official pattern
      if (fields.Items?.value_array || fields.Items?.valueArray) {
        itemsFound = true;
        const itemsArray = fields.Items.value_array || fields.Items.valueArray;

        for (const item of itemsArray) {
          const itemFields = item.value_object || item.valueObject || {};

          // Extract item description using Microsoft's exact field name
          let itemName = '';
          if (itemFields.Description) {
            itemName =
              itemFields.Description.value_string ||
              itemFields.Description.valueString ||
              '';
          }

          // Extract item quantity using Microsoft's exact field name
          let quantity = '1';
          if (itemFields.Quantity) {
            quantity = (
              itemFields.Quantity.value_number ||
              itemFields.Quantity.valueNumber ||
              1
            ).toString();
          }

          // Extract individual item price using Microsoft's exact field name
          let unitPrice = '';
          if (itemFields.Price) {
            const priceField = itemFields.Price;
            if (priceField.value_currency) {
              const amount = priceField.value_currency.amount || '';
              const currency = priceField.value_currency.currency_symbol || '$';
              unitPrice = amount ? `${currency}${amount}` : '';
            } else if (priceField.valueCurrency) {
              const amount = priceField.valueCurrency.amount || '';
              const currency = priceField.valueCurrency.currencySymbol || '$';
              unitPrice = amount ? `${currency}${amount}` : '';
            } else if (priceField.valueString) {
              unitPrice = priceField.valueString;
            } else if (priceField.value_string) {
              unitPrice = priceField.value_string;
            } else if (priceField.valueNumber) {
              unitPrice = `$${priceField.valueNumber.toFixed(2)}`;
            } else if (priceField.value_number) {
              unitPrice = `$${priceField.value_number.toFixed(2)}`;
            }
            console.log('Unit price extracted:', unitPrice);
          }

          // Extract total item price using Microsoft's exact field name
          let itemPrice = '';
          if (itemFields.TotalPrice) {
            const totalPriceField = itemFields.TotalPrice;
            if (totalPriceField.value_currency) {
              const amount = totalPriceField.value_currency.amount || '';
              const currency =
                totalPriceField.value_currency.currency_symbol || '$';
              itemPrice = amount ? `${currency}${amount}` : '';
            } else if (totalPriceField.valueCurrency) {
              const amount = totalPriceField.valueCurrency.amount || '';
              const currency =
                totalPriceField.valueCurrency.currencySymbol || '$';
              itemPrice = amount ? `${currency}${amount}` : '';
            } else if (totalPriceField.valueString) {
              itemPrice = totalPriceField.valueString;
            } else if (totalPriceField.value_string) {
              itemPrice = totalPriceField.value_string;
            } else if (totalPriceField.valueNumber) {
              itemPrice = `$${totalPriceField.valueNumber.toFixed(2)}`;
            } else if (totalPriceField.value_number) {
              itemPrice = `$${totalPriceField.value_number.toFixed(2)}`;
            }
            console.log('Item price extracted:', itemPrice);
          }

          // If no total price, use unit price
          if (!itemPrice && unitPrice) {
            itemPrice = unitPrice;
          }

          // Create item entry
          if (itemName || itemPrice) {
            const itemData: OcrItem = {
              name: itemName,
              price: itemPrice,
              quantity: quantity,
            };
            if (unitPrice && itemPrice !== unitPrice) {
              itemData.unit_price = unitPrice;
            }
            items.push(itemData);
          }
        }
      }

      // Method 2: Fallback - Parse from raw text if no structured items found
      if (!itemsFound || items.length === 0) {
        if (rawLines.length > 0) {
          const fallbackItems = this.extractItemsFromTextFallback(rawLines);
          items.push(...fallbackItems);
        }
      }

      // Create raw text from rawLines
      const rawText = rawLines.join('\n');

      const ocrResult: OcrResult = {
        merchant,
        date,
        total,
        items,
        raw_text: rawText,
        azure_confidence: receipt.confidence || 0,
        engine_used: 'Azure Form Recognizer v4.0',
      };

      // Add optional fields if available
      if (subtotal) ocrResult.subtotal = subtotal;
      if (tax) ocrResult.tax = tax;
      if (storeAddress) ocrResult.store_address = storeAddress;
      if (time) ocrResult.time = time;

      return ocrResult;
    } catch (error) {
      throw new Error(
        `Error parsing Azure response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Fallback method to extract items from raw text when Azure doesn't provide structured data
   */
  private extractItemsFromTextFallback(textLines: string[]): OcrItem[] {
    const items: OcrItem[] = [];

    // Enhanced patterns for item lines
    const itemPatterns = [
      /^(.+?)\s+(\$?[\d,]+\.\d{2})\s*$/, // Item name followed by price with cents
      /^(.+?)\s+(\$?[\d,]+)\s*$/, // Item name followed by price without cents
      /^(.+?)\s+([\d,]+\.\d{2})\s*$/, // Item name followed by price (no $)
      /^(.+?)\s+(\d+)\s*x\s*(\$?[\d,]+\.?\d{0,2})\s*=?\s*(\$?[\d,]+\.?\d{0,2})\s*$/, // Qty x unit price = total
      /^(\d+)\s+(.+?)\s+(\$?[\d,]+\.?\d{0,2})\s*$/, // Qty item price
    ];

    const skipKeywords = [
      'total',
      'subtotal',
      'tax',
      'discount',
      'change',
      'cash',
      'credit',
      'visa',
      'mastercard',
      'amex',
      'payment',
      'balance',
      'receipt',
      'thank',
      'visit',
      'store',
      'phone',
      'address',
      'date',
      'time',
      'welcome',
      'customer',
      'service',
      'order',
      'number',
    ];

    for (const line of textLines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.length < 3) continue;

      // Skip header/footer lines
      const lineLower = trimmedLine.toLowerCase();
      if (skipKeywords.some((keyword) => lineLower.includes(keyword))) continue;

      // Skip lines that are mostly numbers/symbols or too short
      if (/^[\d\s$.\-,]+$/.test(trimmedLine) || trimmedLine.length < 4)
        continue;

      // Try to match item patterns
      for (const [i, pattern] of itemPatterns.entries()) {
        const match = trimmedLine.match(pattern);
        if (match) {
          const groups = match.slice(1);

          if (i === 0 || i === 1 || i === 2) {
            // Simple item + price patterns
            const itemName = groups[0].trim();
            const price = groups[1].trim();

            // Clean up item name (remove leading numbers/codes)
            const cleanItemName = itemName.replace(/^\d+\s*/, '').trim();

            if (
              cleanItemName &&
              cleanItemName.length > 1 &&
              !/^\d+$/.test(cleanItemName)
            ) {
              items.push({
                name: cleanItemName,
                price: price,
                quantity: '1',
              });
            }
          } else if (i === 3) {
            // Qty x unit price = total pattern
            const itemName = groups[1].trim();
            const quantity = groups[0].trim();
            const unitPrice = groups[2].trim();
            const totalPrice = groups[3].trim();

            if (itemName && itemName.length > 1) {
              items.push({
                name: itemName,
                price: totalPrice,
                quantity: quantity,
                unit_price: unitPrice,
              });
            }
          } else if (i === 4) {
            // Qty item price pattern
            const quantity = groups[0].trim();
            const itemName = groups[1].trim();
            const price = groups[2].trim();

            if (itemName && itemName.length > 1) {
              items.push({
                name: itemName,
                price: price,
                quantity: quantity,
              });
            }
          }
          break;
        }
      }
    }

    return items;
  }

  /**
   * Extract date from raw text lines
   */
  private extractDateFromText(textLines: string[]): string {
    const datePatterns = [
      // MM/DD/YYYY format
      /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/,
      // MM-DD-YYYY format
      /\b(\d{1,2}-\d{1,2}-\d{4})\b/,
      // YYYY/MM/DD format
      /\b(\d{4}\/\d{1,2}\/\d{1,2})\b/,
      // YYYY-MM-DD format
      /\b(\d{4}-\d{1,2}-\d{1,2})\b/,
      // Month DD, YYYY format
      /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/i,
      // DD Month YYYY format
      /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/i,
      // MM/DD/YY format
      /\b(\d{1,2}\/\d{1,2}\/\d{2})\b/,
    ];

    const foundDates: string[] = [];

    // Look for dates in the first 30% of the receipt (most likely to be transaction date)
    const searchLimit = Math.floor(textLines.length * 0.3);

    for (let i = 0; i < Math.min(searchLimit, textLines.length); i++) {
      const line = textLines[i].trim();
      if (!line) continue;

      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const dateStr = match[1];

          // Validate the date makes sense
          if (this.isValidDate(dateStr)) {
            foundDates.push(dateStr);
            console.log(`Found date in line ${i + 1}: "${line}" -> ${dateStr}`);
          }
        }
      }
    }

    // If we found multiple dates, prefer the first one (most likely to be transaction date)
    if (foundDates.length > 0) {
      if (foundDates.length > 1) {
        console.log('Multiple dates found, using first:', foundDates);
      }
      return foundDates[0];
    }

    // If no dates found in first 30%, search the entire text
    for (const line of textLines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      for (const pattern of datePatterns) {
        const match = trimmedLine.match(pattern);
        if (match && match[1]) {
          const dateStr = match[1];
          if (this.isValidDate(dateStr)) {
            return dateStr;
          }
        }
      }
    }

    return '';
  }

  /**
   * Validate if a date string represents a reasonable date
   */
  private isValidDate(dateStr: string): boolean {
    try {
      const date = new Date(dateStr);

      // Check if it's a valid date
      if (isNaN(date.getTime())) {
        return false;
      }

      // Check if it's within reasonable range (not too far in past or future)
      const now = new Date();
      const yearAgo = new Date(
        now.getFullYear() - 1,
        now.getMonth(),
        now.getDate(),
      );
      const yearFromNow = new Date(
        now.getFullYear() + 1,
        now.getMonth(),
        now.getDate(),
      );

      return date >= yearAgo && date <= yearFromNow;
    } catch {
      return false;
    }
  }

  /**
   * Extract time from raw text lines
   */
  private extractTimeFromText(textLines: string[]): string {
    const timePatterns = [
      // HH:MM AM/PM format
      /\b(\d{1,2}:\d{2}\s*(?:AM|PM))\b/i,
      // HH:MM:SS AM/PM format
      /\b(\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM))\b/i,
      // 24-hour format HH:MM
      /\b(\d{1,2}:\d{2})\b/,
      // 24-hour format HH:MM:SS
      /\b(\d{1,2}:\d{2}:\d{2})\b/,
    ];

    for (const line of textLines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      for (const pattern of timePatterns) {
        const match = trimmedLine.match(pattern);
        if (match && match[1]) {
          // Validate that it's a reasonable time
          const timeStr = match[1];
          const timeParts = timeStr.split(':');
          const hours = parseInt(timeParts[0]);
          const minutes = parseInt(timeParts[1]);

          if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            return timeStr;
          }
        }
      }
    }

    return '';
  }

  /**
   * Extract financial fields (total, subtotal, tax) from raw text lines
   */
  private extractFinancialFieldFromText(
    textLines: string[],
    fieldType: 'total' | 'subtotal' | 'tax',
  ): string {
    const patterns = {
      total: [
        /(?:^|\s)(?:total|amount due|balance|grand total)[\s:]*\$?(\d+(?:\.\d{2})?)/i,
        /(?:^|\s)(?:total)[\s:]*(\d+\.\d{2})/i,
        /(?:^|\s)\$?(\d+\.\d{2})\s*(?:total|amount due|balance)/i,
      ],
      subtotal: [
        /(?:^|\s)(?:subtotal|sub total|sub-total)[\s:]*\$?(\d+(?:\.\d{2})?)/i,
        /(?:^|\s)(?:subtotal)[\s:]*(\d+\.\d{2})/i,
        /(?:^|\s)\$?(\d+\.\d{2})\s*(?:subtotal|sub total)/i,
      ],
      tax: [
        /(?:^|\s)(?:tax|sales tax|total tax)[\s:]*\$?(\d+(?:\.\d{2})?)/i,
        /(?:^|\s)(?:tax)[\s:]*(\d+\.\d{2})/i,
        /(?:^|\s)\$?(\d+\.\d{2})\s*(?:tax|sales tax)/i,
      ],
    };

    const fieldPatterns = patterns[fieldType];

    for (const line of textLines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      for (const pattern of fieldPatterns) {
        const match = trimmedLine.match(pattern);
        if (match && match[1]) {
          const amount = parseFloat(match[1]);
          if (!isNaN(amount) && amount > 0) {
            return `$${amount.toFixed(2)}`;
          }
        }
      }
    }

    return '';
  }

  /**
   * More aggressive address extraction for cases where structured data isn't available
   */
  private extractAddressFromTextAggressive(textLines: string[]): string {
    const addressComponents: string[] = [];

    // Look for any line that looks like an address in the first half of the receipt
    const searchLimit = Math.floor(textLines.length * 0.5);

    for (let i = 0; i < searchLimit; i++) {
      const line = textLines[i].trim();
      if (!line || line.length < 3) continue;

      // Skip obvious non-address lines
      if (/^\$|total|subtotal|tax|thank|item|product|qty|quantity/i.test(line))
        continue;

      // Look for street address patterns
      if (
        /\d+\s+\w+.*(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|pl|place|way|pkwy|parkway|circle|cir)/i.test(
          line,
        )
      ) {
        addressComponents.push(line);
      }
      // Look for city, state, zip patterns
      else if (/^[a-zA-Z\s]+,\s*[A-Z]{2}\s+\d{5}/.test(line)) {
        addressComponents.push(line);
      }
      // Look for just ZIP codes
      else if (/^\d{5}(?:-\d{4})?$/.test(line)) {
        addressComponents.push(line);
      }
      // Look for lines that might be cities (after we've found some address components)
      else if (
        addressComponents.length > 0 &&
        /^[a-zA-Z\s]{3,20}$/.test(line) &&
        !/^(?:total|subtotal|tax|item|product|qty|quantity|price|amount|thank|welcome|store|shop|market|receipt|order|transaction|purchase|cash|credit|visa|mastercard|amex|discover)$/i.test(
          line,
        )
      ) {
        addressComponents.push(line);
      }

      // Stop if we have enough components
      if (addressComponents.length >= 3) break;
    }

    return addressComponents.join(', ');
  }

  /**
   * Extract store address from raw text lines
   */
  private extractAddressFromText(textLines: string[]): string {
    // Common patterns for addresses
    const addressPatterns = [
      // Street address with number (e.g., "123 Main St")
      /^\d+\s+[A-Za-z\s]+(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|pl|place|way|pkwy|parkway)\.?\s*$/i,
      // City, State ZIP (e.g., "New York, NY 10001")
      /^[A-Za-z\s]+,\s*[A-Za-z]{2}\s+\d{5}(?:-\d{4})?$/,
      // ZIP code only
      /^\d{5}(?:-\d{4})?$/,
    ];

    const addressLines: string[] = [];
    const skipPatterns = [
      /total|subtotal|tax|discount|change|payment|visa|mastercard|amex|cash|credit/i,
      /thank|visit|receipt|order|transaction|purchase/i,
      /^\$?\d+\.?\d*$/, // Skip pure monetary amounts
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, // Skip dates
      /^\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?$/i, // Skip times
      /\b\d+\s*x\s*\$?\d+/i, // Skip quantity x price patterns
      /\$\d+\.\d{2}/, // Skip explicit price patterns
      /item|product|qty|quantity|price|amount|unit/i, // Skip item-related keywords
      /ultra|breasts|always|wings|chicken|beef|pork|salmon|tuna|milk|bread|eggs/i, // Skip common product names
    ];

    // Look only in the first 30% of the receipt for address info
    const searchLimit = Math.floor(textLines.length * 0.3);
    let merchantFound = false;
    let addressStartIndex = -1;

    // First, find the merchant name to know where to start looking for address
    for (let i = 0; i < Math.min(10, textLines.length); i++) {
      const line = textLines[i].trim();
      if (
        line.length > 3 &&
        !skipPatterns.some((pattern) => pattern.test(line))
      ) {
        // This is likely the merchant name
        merchantFound = true;
        addressStartIndex = i + 1;
        break;
      }
    }

    if (!merchantFound) {
      addressStartIndex = 0;
    }

    // Look for address components right after merchant name
    for (
      let i = addressStartIndex;
      i < Math.min(addressStartIndex + 8, searchLimit);
      i++
    ) {
      const line = textLines[i].trim();
      if (!line || line.length < 5) continue;

      // Skip common receipt content and items
      if (skipPatterns.some((pattern) => pattern.test(line))) continue;

      // Check if line matches address patterns
      const isAddress = addressPatterns.some((pattern) => pattern.test(line));

      if (isAddress) {
        addressLines.push(line);
      } else {
        // Check for street names with numbers (more restrictive)
        if (
          /^\d+\s+[A-Za-z\s]+(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|pl|place|way|pkwy|parkway)/i.test(
            line,
          )
        ) {
          addressLines.push(line);
        }
      }

      // Stop if we've found enough address components or hit item-like content
      if (addressLines.length >= 2 || /^\d+\s+[A-Z\s]+\$/.test(line)) {
        break;
      }
    }

    // Clean up and join address lines
    if (addressLines.length > 0) {
      return addressLines
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join(', ');
    }

    return '';
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
