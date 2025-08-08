/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import DocumentIntelligence from '@azure-rest/ai-document-intelligence';
import { AzureKeyCredential } from '@azure/core-auth';
import { Injectable } from '@nestjs/common';
import { OcrItem, OcrResult } from './ocr.service';

@Injectable()
export class OcrAzureService {
  /**
   * Azure Prebuilt Receipt AI - Specialized receipt processing
   * Uses the prebuilt receipt model for structured data extraction
   */
  async extractWithPrebuiltReceipt(
    buffer: Buffer,
    endpoint: string,
    apiKey: string,
  ): Promise<OcrResult> {
    if (!endpoint || !apiKey) {
      throw new Error('Azure API credentials not provided');
    }

    try {
      // Validate inputs before making API call
      const azureStartTime = performance.now();
      console.log('🚀 Starting Azure OCR processing:', {
        endpoint: endpoint?.slice(0, 50) + '...',
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length,
        bufferSize: buffer.length,
        bufferSizeMB: (buffer.length / (1024 * 1024)).toFixed(2),
      });

      // Validate endpoint format
      if (
        !endpoint.startsWith('https://') ||
        !endpoint.includes('.cognitiveservices.azure.com')
      ) {
        throw new Error(
          `Invalid Azure endpoint format. Expected: https://your-resource.cognitiveservices.azure.com\n` +
            `Received: ${endpoint}`,
        );
      }

      // Validate API key format (Azure keys are typically 32 or 64+ characters)
      if (!apiKey || apiKey.length < 32) {
        throw new Error(
          `Invalid Azure API key format. Expected at least 32-character key, got ${apiKey?.length || 0} characters.\n` +
            `Please check your Azure Document Intelligence API key.`,
        );
      }

      // Initialize Azure Document Intelligence client with timeout
      const client = DocumentIntelligence(
        endpoint,
        new AzureKeyCredential(apiKey),
        {
          // Add request timeout to prevent hanging
          additionalPolicies: [
            {
              policy: {
                name: 'RequestTimeoutPolicy',
                sendRequest: async (request, next) => {
                  // Set timeout for initial submission
                  const timeoutMs = 20000; // 20 seconds max for submission (increased from 10s)
                  const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(
                      () =>
                        reject(
                          new Error(`Request timeout after ${timeoutMs}ms`),
                        ),
                      timeoutMs,
                    );
                  });

                  return Promise.race([next(request), timeoutPromise]);
                },
              },
              position: 'perCall',
            },
          ],
        },
      );

      // Analyze document using prebuilt receipt model
      console.log('💷 Submitting document to Azure for analysis...');
      const submitStartTime = performance.now();
      const initialResponse = await client
        .path('/documentModels/{modelId}:analyze', 'prebuilt-receipt')
        .post({
          contentType: 'application/octet-stream',
          body: buffer,
        });
      const submitDuration = performance.now() - submitStartTime;
      console.log(`📫 Document submitted in ${submitDuration.toFixed(1)}ms`);

      if (initialResponse.status !== '202') {
        // Enhanced error logging for 403 and other authentication issues
        let errorDetails = 'Unknown error';
        try {
          if (
            initialResponse.body &&
            typeof initialResponse.body === 'object'
          ) {
            errorDetails = JSON.stringify(initialResponse.body, null, 2);
          } else {
            const bodyValue = initialResponse.body;
            if (
              typeof bodyValue === 'string' ||
              typeof bodyValue === 'number'
            ) {
              errorDetails = String(bodyValue);
            } else {
              errorDetails = 'No error details provided';
            }
          }
        } catch {
          errorDetails = 'Could not parse error response';
        }

        // Log additional details for debugging
        console.error('Azure API Error Details:', {
          status: initialResponse.status,
          statusText: initialResponse.status,
          headers: initialResponse.headers,
          body: initialResponse.body,
        });

        const errorMessage = `Azure API error: ${initialResponse.status} - ${errorDetails}`;

        // Provide specific guidance for common error codes
        if (initialResponse.status === '403') {
          throw new Error(
            `${errorMessage}\n\nThis is a 403 Forbidden error. Common causes:\n` +
              `1. Invalid API key\n` +
              `2. API key doesn't have permission for Document Intelligence\n` +
              `3. Endpoint URL is incorrect\n` +
              `4. Resource might be in a different region\n` +
              `5. API quota exceeded\n` +
              `6. Resource is paused or disabled\n\n` +
              `Please verify your Azure Document Intelligence credentials and permissions.`,
          );
        }

        throw new Error(errorMessage);
      }

      // Get operation location for polling
      const operationLocation = initialResponse.headers['operation-location'];
      if (!operationLocation) {
        throw new Error('Azure API error: No operation location received');
      }

      // Poll for results using the Azure SDK
      console.log('🔍 Starting polling for results...');
      const result = await this.pollForResultsWithSdk(
        client,
        operationLocation,
      );

      // Parse the prebuilt receipt response
      const totalAzureDuration = performance.now() - azureStartTime;
      console.log(
        `🏁 Total Azure OCR time: ${(totalAzureDuration / 1000).toFixed(1)}s`,
      );
      return this.parsePrebuiltReceiptResponse(result);
    } catch (error) {
      throw new Error(
        `Azure Prebuilt Receipt error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Poll Azure API for analysis results using SDK with optimized polling strategy
   */
  private async pollForResultsWithSdk(
    client: any,
    operationLocation: string,
  ): Promise<Record<string, any>> {
    const maxRetries = 60; // Increased for complex receipts
    const maxWaitTime = 45000; // Maximum 45 seconds total wait time (increased from 15s)
    let retryCount = 0;
    const startTime = performance.now();

    console.log(`🕰️ Starting Azure OCR polling with optimized strategy...`);

    // Extract operation ID from operation location
    const operationId = operationLocation.split('/').pop()?.split('?')[0];
    if (!operationId) {
      throw new Error('Could not extract operation ID from operation location');
    }

    while (retryCount < maxRetries) {
      const elapsed = performance.now() - startTime;

      // Progress indicator every 10 seconds
      if (
        retryCount > 0 &&
        Math.floor(elapsed / 10000) > Math.floor((elapsed - 1000) / 10000)
      ) {
        console.log(
          `⏳ Azure OCR still processing... ${(elapsed / 1000).toFixed(0)}s elapsed, ${retryCount} polls completed`,
        );
      }

      // Early timeout if taking too long
      if (elapsed > maxWaitTime) {
        console.error(
          `⏱️ Azure OCR timeout after ${(elapsed / 1000).toFixed(1)}s (max ${maxWaitTime / 1000}s)`,
        );
        console.error('📊 Timeout Analysis:', {
          totalElapsed: `${(elapsed / 1000).toFixed(1)}s`,
          maxAllowed: `${maxWaitTime / 1000}s`,
          retryCount,
          maxRetries,
          averageTimePerPoll: `${(elapsed / (retryCount || 1)).toFixed(0)}ms`,
        });

        throw new Error(
          `Azure OCR timeout: Processing exceeded ${maxWaitTime / 1000}s limit. ` +
            `This may indicate a complex receipt or Azure service delays. ` +
            `Try again with a simpler receipt or check Azure service status.`,
        );
      }

      try {
        const pollStartTime = performance.now();
        const response = await client
          .path(
            '/documentModels/{modelId}/analyzeResults/{resultId}',
            'prebuilt-receipt',
            operationId,
          )
          .get();
        const pollDuration = performance.now() - pollStartTime;

        if (response.status === '200') {
          const result = response.body;
          if (result.status === 'succeeded') {
            const totalDuration = performance.now() - startTime;
            console.log(
              `✅ Azure OCR completed in ${(totalDuration / 1000).toFixed(1)}s after ${retryCount + 1} polls`,
            );
            return result as Record<string, any>;
          } else if (result.status === 'failed') {
            throw new Error(
              `Azure analysis failed: ${result.error || 'Unknown error'}`,
            );
          }
          // Status is still 'running' or 'notStarted', continue polling
          console.log(
            `🔄 Poll ${retryCount + 1}: ${result.status} (${pollDuration.toFixed(1)}ms)`,
          );
        }

        // Dynamic delay based on retry count (faster initial checks, slower later)
        const dynamicDelay = Math.min(500 + retryCount * 100, 2000); // 500ms to 2s
        await new Promise((resolve) => setTimeout(resolve, dynamicDelay));
        retryCount++;
      } catch (error) {
        if (retryCount >= maxRetries - 1) {
          throw error;
        }
        console.warn(
          `⚠️ Poll ${retryCount + 1} failed, retrying:`,
          (error as Error).message,
        );
        // Continue polling for other errors with shorter delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        retryCount++;
      }
    }

    const totalDuration = performance.now() - startTime;
    console.error(
      `❌ Azure OCR failed after ${(totalDuration / 1000).toFixed(1)}s and ${retryCount} polls`,
    );
    console.error('📊 Final Analysis:', {
      totalDuration: `${(totalDuration / 1000).toFixed(1)}s`,
      retryCount,
      maxRetries,
      averageTimePerPoll: `${(totalDuration / retryCount).toFixed(0)}ms`,
      lastStatus: 'polling_exhausted',
    });

    throw new Error(
      `Azure OCR polling exhausted: Reached ${retryCount} retries over ${(totalDuration / 1000).toFixed(1)}s. ` +
        `Receipt may be too complex or Azure service is experiencing delays. ` +
        `Please try again or contact support if this persists.`,
    );
  }

  /**
   * Parse Prebuilt Receipt response - uses structured data from Azure's receipt model
   */
  private parsePrebuiltReceiptResponse(
    azureResult: Record<string, any>,
  ): OcrResult {
    try {
      const documents = azureResult.analyzeResult?.documents || [];

      if (!documents.length) {
        throw new Error('No receipt data found by Azure');
      }

      const receipt = documents[0];
      const fields = receipt.fields || {};

      // Extract structured data using Microsoft's official field names
      const merchant = this.extractFieldValue(fields.MerchantName);
      const date = this.extractDateField(fields);
      const time = this.extractTimeField(fields);
      const storeAddress = this.extractAddressField(fields);

      // Extract raw text from all pages first (needed for fallback)
      const pages = azureResult.analyzeResult?.pages || [];
      const allTextLines: string[] = [];
      for (const page of pages) {
        const lines = page.lines || [];
        const pageLines = lines.map(
          (line: Record<string, any>) => (line.content as string) || '',
        );
        allTextLines.push(...pageLines);
      }
      const rawText = allTextLines.join('\n');

      // Primary extraction from structured fields
      let items: OcrItem[] = [];

      // For Costco, always use custom parser for accurate sequential order
      if (merchant && merchant.toUpperCase().includes('COSTCO')) {
        console.log(
          '🏪 Using Costco-specific parser for accurate sequential order',
        );
        items = this.parseCostcoReceipt(rawText);
      } else {
        // For other merchants, use Azure's structured extraction
        items = this.extractItemsField(fields.Items);

        // Fallback: If structured extraction fails or produces incorrect results,
        // try to extract from raw text
        if (
          items.length === 0 ||
          this.shouldUseFallbackExtraction(items, rawText)
        ) {
          const fallbackItems = this.extractItemsFromRawText(rawText, merchant);
          if (fallbackItems.length > 0) {
            items = fallbackItems;
          }
        }
      }

      if (merchant && !merchant.toUpperCase().includes('COSTCO')) {
        // Use structured extraction results and process any marked fee items
        console.log(
          `✅ Using structured extraction with ${items.length} items`,
        );

        // Check if we have any fee items that need raw text price extraction
        const feeItemsNeedingPrices = items.filter((item) =>
          item.name.includes('[NEEDS_RAW_TEXT_PRICE]'),
        );

        if (feeItemsNeedingPrices.length > 0) {
          console.log(
            `🔍 Found ${feeItemsNeedingPrices.length} fee items needing price extraction from raw text`,
          );
          this.fillFeeItemPricesFromRawText(items, rawText, merchant);
        }

        // Also check for additional standalone fees that might have been missed
        const additionalFeesWithContext = this.findAdditionalFeesInRawText(
          items,
          rawText,
          merchant,
        );
        if (additionalFeesWithContext.length > 0) {
          console.log(
            `🆕 Found ${additionalFeesWithContext.length} additional fee items in raw text`,
          );
          // Insert fees at the correct position to maintain contextual relationships
          this.insertFeesWithCorrectPositioning(
            items,
            additionalFeesWithContext,
          );
        }
      }

      // Get confidence from the document
      const confidence = receipt.confidence || 0;

      return {
        merchant,
        date,
        total: this.extractMoneyValue(fields.Total),
        items,
        item_count: items.length,
        raw_text: rawText,
        azure_confidence: confidence,
        engine_used: 'Azure Prebuilt Receipt AI',
        subtotal: this.extractMoneyValue(fields.Subtotal),
        tax: this.extractMoneyValue(fields.TotalTax),
        store_address: storeAddress,
        time,
      };
    } catch (error) {
      throw new Error(
        `Error parsing Prebuilt Receipt response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Parse Costco receipt from raw text with exact sequential order
   */
  private parseCostcoReceipt(rawText: string): OcrItem[] {
    const lines = rawText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const items: OcrItem[] = [];

    // Patterns for identifying different line types
    const itemWithNumberPattern = /^(\d{4,7})\s+(.+)$/; // "555107 BLK FRST HAM"
    const pricePattern = /^(\d+\.\d{2})(?:\s+[A-Z]+)?$/; // "143.91" or "16.99 GP"
    const negPricePattern = /^(\d+\.\d{2})-(?:GP|[A-Z]*)?$/; // "2.00-" or "2.00-GP"
    const quantityPattern = /^(\d+)\s*@\s*(\d+\.\d{2})$/; // "9 @ 15.99"
    const feePattern = /^(ENVIRO FEE|DEPOSIT|ECO FEE|TPD\/\d+)/i;
    const skipPattern =
      /^(COSTCO|WHOLESALE|Bottom of Basket|\*{3,}|SUBTOTAL|TAX|TOTAL|Member|WN Member)/i;

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // Skip header/footer lines
      if (skipPattern.test(line)) {
        i++;
        continue;
      }

      // Check if this is a quantity line (e.g., "9 @ 15.99")
      const quantityMatch = line.match(quantityPattern);
      if (quantityMatch) {
        // Next line should be the item
        i++;
        if (i < lines.length) {
          const itemLine = lines[i];
          const itemMatch = itemLine.match(itemWithNumberPattern);
          if (itemMatch) {
            // Next line should be the total price
            i++;
            if (i < lines.length && pricePattern.test(lines[i])) {
              const priceMatch = lines[i].match(pricePattern);
              if (priceMatch) {
                items.push({
                  name: itemMatch[2].trim(),
                  price: priceMatch[1],
                  quantity: quantityMatch[1],
                  unit_price: quantityMatch[2],
                  item_number: itemMatch[1],
                });
                i++;
                continue;
              }
            }
          }
        }
      }

      // Check if this is an item with number (e.g., "555107 BLK FRST HAM")
      const itemMatch = line.match(itemWithNumberPattern);
      if (itemMatch) {
        // Next line should be the price
        i++;
        if (i < lines.length) {
          const priceLine = lines[i];
          const priceMatch =
            priceLine.match(pricePattern) || priceLine.match(negPricePattern);
          if (priceMatch) {
            const itemName = itemMatch[2].trim();
            const itemNumber = itemMatch[1];
            const price = priceMatch[1] + (priceLine.includes('-') ? '-' : '');

            items.push({
              name: itemName,
              price: price,
              quantity: '1',
              unit_price: '',
              item_number: itemNumber,
            });
            i++;
            continue;
          }
        }
      }

      // Check if this is a fee line without item number
      if (feePattern.test(line)) {
        // Next line should be the price
        i++;
        if (i < lines.length) {
          const priceLine = lines[i];
          const priceMatch =
            priceLine.match(pricePattern) || priceLine.match(negPricePattern);
          if (priceMatch) {
            const price = priceMatch[1] + (priceLine.includes('-') ? '-' : '');

            items.push({
              name: line,
              price: price,
              quantity: '1',
              unit_price: price,
            });
            i++;
            continue;
          }
        }
      }

      // Check if this is a standalone product name (no item number)
      // This handles edge cases where item number might be missing
      const isProductName =
        line.length >= 3 &&
        !pricePattern.test(line) &&
        !skipPattern.test(line) &&
        line.match(/[A-Z]/);

      if (isProductName) {
        // Check if next line is a price
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          const priceMatch =
            nextLine.match(pricePattern) || nextLine.match(negPricePattern);
          if (priceMatch) {
            const price = priceMatch[1] + (nextLine.includes('-') ? '-' : '');

            items.push({
              name: line,
              price: price,
              quantity: '1',
              unit_price: '',
            });
            i += 2;
            continue;
          }
        }
      }

      i++;
    }

    console.log(
      `✅ Costco parser extracted ${items.length} items in sequential order`,
    );
    return items;
  }

  /**
   * Extract field value from Azure field object
   */
  private extractFieldValue(field: Record<string, any>): string {
    if (!field) return '';

    // Try different value property names
    const value =
      field.value_string ||
      field.valueString ||
      field.value ||
      field.content ||
      '';

    return String(value).trim();
  }

  /**
   * Extract money field with proper formatting
   */
  private extractMoneyField(field: Record<string, any>): string {
    if (!field) return '';

    // Handle currency amount
    if (field.value_currency_amount || field.valueCurrencyAmount) {
      const amount = field.value_currency_amount || field.valueCurrencyAmount;
      const currency = amount.currency_code || amount.currencyCode || 'CAD';
      const value = amount.amount || 0;
      return currency === 'CAD'
        ? `$${value.toFixed(2)}`
        : `${value.toFixed(2)} ${currency}`;
    }

    // Handle numeric value
    if (field.value_number || field.valueNumber) {
      const value = field.valueNumber || field.value_number;
      return `$${value.toFixed(2)}`;
    }

    return this.extractFieldValue(field);
  }

  /**
   * Extract numeric value from money field
   */
  private extractMoneyValue(field: Record<string, any>): number {
    if (!field) return 0;

    // Handle currency amount
    if (field.value_currency_amount || field.valueCurrencyAmount) {
      const amount = field.value_currency_amount || field.valueCurrencyAmount;
      return Number(amount.amount) || 0;
    }

    // Handle numeric value
    if (field.value_number || field.valueNumber) {
      return Number(field.valueNumber || field.value_number) || 0;
    }

    // Parse from string value
    const stringValue = this.extractFieldValue(field);
    const numericMatch = stringValue.match(/\d+\.\d{2}/);
    return numericMatch ? parseFloat(numericMatch[0]) : 0;
  }

  /**
   * Extract date from various field names
   */
  private extractDateField(fields: Record<string, any>): string {
    const dateFieldNames = [
      'TransactionDate',
      'Date',
      'ReceiptDate',
      'PurchaseDate',
    ];

    // Debug logging for date field inspection
    console.log('🔍 OCR Date Extraction Debug:');
    console.log('Available fields:', Object.keys(fields));

    for (const fieldName of dateFieldNames) {
      if (fields[fieldName]) {
        const dateField = fields[fieldName];
        const value =
          (dateField.value_date as string) ||
          (dateField.valueDate as string) ||
          this.extractFieldValue(dateField as Record<string, any>);

        // Debug log each date field found
        console.log(`📅 Found date field "${fieldName}":`, {
          value_date: dateField.value_date,
          valueDate: dateField.valueDate,
          extractedValue: value,
          fullField: dateField,
        });

        if (value) {
          console.log(`✅ Using date from field "${fieldName}": "${value}"`);
          return value;
        }
      }
    }

    console.log('❌ No date found in any field');
    return '';
  }

  /**
   * Extract time from various field names
   */
  private extractTimeField(fields: Record<string, any>): string {
    const timeFieldNames = [
      'TransactionTime',
      'Time',
      'ReceiptTime',
      'PurchaseTime',
    ];

    for (const fieldName of timeFieldNames) {
      if (fields[fieldName]) {
        const value =
          (fields[fieldName].value_time as string) ||
          (fields[fieldName].valueTime as string) ||
          this.extractFieldValue(fields[fieldName] as Record<string, any>);
        if (value) return value;
      }
    }

    return '';
  }

  /**
   * Extract address from various field names
   */
  private extractAddressField(fields: Record<string, any>): string {
    const addressFieldNames = [
      'MerchantAddress',
      'VendorAddress',
      'Address',
      'MerchantPhysicalAddress',
      'StoreAddress',
    ];

    for (const fieldName of addressFieldNames) {
      if (fields[fieldName]) {
        const value = this.extractFieldValue(fields[fieldName]);
        if (value) return value;
      }
    }

    return '';
  }

  /**
   * Extract items from Azure receipt items field
   */
  private extractItemsField(itemsField: Record<string, any>): OcrItem[] {
    if (!itemsField) return [];

    // Extract items from the field

    // Try different possible structures for the items array
    let itemsArray: any[] = [];

    if (itemsField.valueArray) {
      itemsArray = itemsField.valueArray;
    } else if (itemsField.value_array) {
      itemsArray = itemsField.value_array;
    } else if (itemsField.value && Array.isArray(itemsField.value)) {
      itemsArray = itemsField.value;
    } else if (Array.isArray(itemsField)) {
      itemsArray = itemsField;
    }

    const items: OcrItem[] = [];

    for (let index = 0; index < itemsArray.length; index++) {
      const item = itemsArray[index];
      if (!item) continue;

      // Try different possible item structures
      let itemFields: any = {};

      if (item.valueObject) {
        itemFields = item.valueObject;
      } else if (item.value_object) {
        itemFields = item.value_object;
      } else if (item.value) {
        itemFields = item.value;
      } else {
        itemFields = item;
      }

      // Try different field names for description/name
      const name =
        this.extractFieldValue(itemFields.Description) ||
        this.extractFieldValue(itemFields.Name) ||
        this.extractFieldValue(itemFields.description) ||
        this.extractFieldValue(itemFields.name) ||
        this.extractFieldValue(itemFields.Item) ||
        this.extractFieldValue(itemFields.item);

      // Try different field names for price
      const price =
        this.extractMoneyField(itemFields.TotalPrice) ||
        this.extractMoneyField(itemFields.Price) ||
        this.extractMoneyField(itemFields.totalPrice) ||
        this.extractMoneyField(itemFields.price) ||
        this.extractMoneyField(itemFields.Amount) ||
        this.extractMoneyField(itemFields.amount);

      // Try different field names for quantity
      const quantity =
        this.extractFieldValue(itemFields.Quantity) ||
        this.extractFieldValue(itemFields.quantity) ||
        this.extractFieldValue(itemFields.Count) ||
        this.extractFieldValue(itemFields.count) ||
        '1';

      // Try different field names for unit price
      const unitPrice =
        this.extractMoneyField(itemFields.UnitPrice) ||
        this.extractMoneyField(itemFields.unitPrice) ||
        this.extractMoneyField(itemFields.unit_price);

      // Try different field names for item number/product code
      const itemNumber =
        this.extractFieldValue(itemFields.ProductCode) ||
        this.extractFieldValue(itemFields.productCode) ||
        this.extractFieldValue(itemFields.product_code) ||
        this.extractFieldValue(itemFields.ItemNumber) ||
        this.extractFieldValue(itemFields.itemNumber) ||
        this.extractFieldValue(itemFields.item_number) ||
        this.extractFieldValue(itemFields.SKU) ||
        this.extractFieldValue(itemFields.sku);

      if (name && price) {
        // Handle mixed product+fee lines (e.g., "LAC FREE 2%\nENVIRO FEE C")
        if (name.includes('\n')) {
          const nameParts = name
            .split('\n')
            .map((part) => part.trim())
            .filter((part) => part.length > 0);

          if (nameParts.length >= 2) {
            const productName = nameParts[0];
            const feePart = nameParts[1];

            // Check if the second part looks like a fee
            if (
              feePart.match(
                /^(ENVIRO?\s*FEE|ECO\s*FEE|DEPOSIT|BAG\s*FEE|SERVICE\s*FEE)/i,
              )
            ) {
              console.log(
                `🔧 Mixed product+fee detected: "${name}" -> Product: "${productName}", Fee: "${feePart}"`,
              );

              // Add the main product with the assigned price
              items.push({
                name: productName,
                price,
                quantity,
                unit_price: unitPrice,
                item_number: itemNumber,
              });

              // Mark that we need to extract the fee from raw text later
              // We'll set a flag or store the fee name for later processing
              items.push({
                name: `${feePart} [NEEDS_RAW_TEXT_PRICE]`,
                price: '0.00', // Placeholder - will be filled from raw text
                quantity: '1',
                unit_price: '0.00',
                item_number: undefined,
              });

              continue; // Skip the normal processing since we handled this item specially
            }
          }
        }

        // Normal processing for items without newlines or non-fee mixed items
        const cleanName = name.includes('\n')
          ? name.split('\n')[0].trim()
          : name;

        items.push({
          name: cleanName,
          price,
          quantity,
          unit_price: unitPrice,
          item_number: itemNumber,
        });
      }
    }

    return items;
  }

  /**
   * Determine if we should use fallback extraction based on known issues
   */
  private shouldUseFallbackExtraction(
    structuredItems: OcrItem[],
    rawText: string,
  ): boolean {
    // If we have no structured items, definitely use fallback
    if (structuredItems.length === 0) return true;

    // Temporarily disable newline detection to prevent fallback issues
    // const hasNewlineInItems = structuredItems.some((item) =>
    //   item.name.includes('\n'),
    // );
    // if (hasNewlineInItems) {
    //   return true;
    // }

    // Check for specific patterns that indicate Azure misunderstood the receipt
    const rawLines = rawText.split('\n').map((line) => line.trim());

    // Look for expected Costco items in raw text
    const expectedItems = [
      /OPTIMUM/i,
      /TPD.*BATTERY/i,
      /ECO\s*FEE\s*BAT/i,
      /AMBROSIA\s*APP/i,
      /TPD.*\d{7}/i, // TPD/1648955 pattern
    ];

    const foundInRaw = expectedItems.filter((pattern) =>
      rawLines.some((line) => pattern.test(line)),
    ).length;

    const foundInStructured = structuredItems.length;

    // If we found significantly more items in raw text than structured, use fallback
    if (foundInRaw > foundInStructured + 1) {
      return true;
    }

    // Check for specific missing items that should be present
    const hasAmbrosia = rawLines.some((line) => /AMBROSIA/i.test(line));
    const hasTpdNumber = rawLines.some((line) => /TPD.*\d{7}/i.test(line));

    const structuredNames = structuredItems.map((item) =>
      item.name.toUpperCase(),
    );
    const structuredHasAmbrosia = structuredNames.some((name) =>
      name.includes('AMBROSIA'),
    );
    const structuredHasTpdNumber = structuredNames.some((name) =>
      /TPD.*\d{7}/.test(name),
    );

    if (
      (hasAmbrosia && !structuredHasAmbrosia) ||
      (hasTpdNumber && !structuredHasTpdNumber)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Fill in prices for fee items that were marked during structured extraction
   */
  private fillFeeItemPricesFromRawText(
    items: OcrItem[],
    rawText: string,
    merchant: string,
  ): void {
    const lines = rawText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Costco-specific patterns for fee price extraction
    if (merchant.toLowerCase().includes('costco')) {
      for (const item of items) {
        if (item.name.includes('[NEEDS_RAW_TEXT_PRICE]')) {
          const feeName = item.name.replace(' [NEEDS_RAW_TEXT_PRICE]', '');
          console.log(`🔍 Looking for price for fee: "${feeName}"`);

          // Look for the fee name in raw text and find associated price
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Check if this line contains the fee name
            if (line.toUpperCase().includes(feeName.toUpperCase())) {
              console.log(`📋 Found fee line: "${line}"`);

              // Look for prices in the next few lines
              for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
                const nextLine = lines[j].trim();
                const priceMatch = nextLine.match(/^(\d+\.\d{2})$/);

                if (priceMatch) {
                  const feePrice = priceMatch[1];
                  console.log(
                    `💰 Found fee price: ${feePrice} for "${feeName}"`,
                  );

                  // Update the item with the found price
                  item.name = feeName; // Remove the marker
                  item.price = feePrice;
                  item.unit_price = feePrice;

                  break; // Found price, move to next fee item
                }
              }
              break; // Found the fee line, move to next fee item
            }
          }
        }
      }
    }
  }

  /**
   * Insert fees at the correct position in the items array based on their context in raw text
   */
  private insertFeesWithCorrectPositioning(
    items: OcrItem[],
    additionalFees: Array<{
      fee: OcrItem;
      context: { precedingProduct?: string; rawTextPosition: number };
    }>,
  ): void {
    for (const { fee, context } of additionalFees) {
      let insertPosition = items.length; // Default to end

      if (context.precedingProduct) {
        // Find the product that should precede this fee
        const productIndex = items.findIndex(
          (item) =>
            item.name
              .toUpperCase()
              .includes(context.precedingProduct!.toUpperCase()) ||
            context
              .precedingProduct!.toUpperCase()
              .includes(item.name.toUpperCase()),
        );

        if (productIndex !== -1) {
          // Insert after the found product, but before any subsequent products
          let insertAfter = productIndex;
          // Look for any existing fees already linked to this product
          for (let i = productIndex + 1; i < items.length; i++) {
            if (
              items[i].name.match(
                /^(ENVIRO?\s*FEE|ECO\s*FEE|DEPOSIT|BAG\s*FEE|SERVICE\s*FEE)/i,
              )
            ) {
              insertAfter = i;
            } else {
              break; // Stop when we hit the next product
            }
          }
          insertPosition = insertAfter + 1;
          console.log(
            `💡 Inserting "${fee.name}" after "${context.precedingProduct}" at position ${insertPosition}`,
          );
        }
      }

      // Insert the fee at the calculated position
      items.splice(insertPosition, 0, fee);
    }
  }

  /**
   * Find additional fee items in raw text that weren't captured by structured extraction
   */
  private findAdditionalFeesInRawText(
    existingItems: OcrItem[],
    rawText: string,
    merchant: string,
  ): Array<{
    fee: OcrItem;
    context: { precedingProduct?: string; rawTextPosition: number };
  }> {
    const lines = rawText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const additionalFees: Array<{
      fee: OcrItem;
      context: { precedingProduct?: string; rawTextPosition: number };
    }> = [];
    const existingFeeNames = existingItems
      .filter((item) =>
        item.name.match(
          /^(ENVIRO?\s*FEE|ECO\s*FEE|DEPOSIT|BAG\s*FEE|SERVICE\s*FEE)/i,
        ),
      )
      .map((item) => item.name.toUpperCase());

    // Costco-specific patterns for additional fee extraction
    if (merchant.toLowerCase().includes('costco')) {
      console.log(
        '🔍 Looking for additional fees that might have been missed...',
      );

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Look for standalone fee patterns that weren't already captured
        if (
          line.match(
            /^(ENVIRO?\s*FEE|ECO\s*FEE|DEPOSIT|BAG\s*FEE|SERVICE\s*FEE)/i,
          )
        ) {
          const feeNameUpper = line.toUpperCase();

          // Skip if we already have this fee
          if (
            existingFeeNames.some((existing) =>
              existing.includes(feeNameUpper.split(' ')[0]),
            )
          ) {
            console.log(`⏭️ Skipping already captured fee: "${line}"`);
            continue;
          }

          console.log(`📋 Found additional standalone fee line: "${line}"`);

          // Find the preceding product in raw text
          let precedingProduct: string | undefined;
          for (let k = i - 1; k >= Math.max(0, i - 5); k--) {
            const precedingLine = lines[k].trim();
            // Look for lines that look like product names (not prices, not headers)
            if (
              precedingLine.length >= 3 &&
              !precedingLine.match(/^\d+\.\d{2}$/) && // Not a price
              !precedingLine.match(
                /^(COSTCO|WHOLESALE|SUBTOTAL|TAX|TOTAL|AUTH|AMOUNT)/i,
              ) && // Not headers
              !precedingLine.match(/^\d{4,7}\s*$/) && // Not just item numbers
              precedingLine.match(/[A-Z]/) // Contains letters
            ) {
              // Clean up item number prefix if present
              const cleanProduct = precedingLine
                .replace(/^\d{4,7}\s+/, '')
                .trim();
              if (cleanProduct.length >= 3) {
                precedingProduct = cleanProduct;
                console.log(
                  `🔗 Found preceding product for "${line}": "${precedingProduct}"`,
                );
                break;
              }
            }
          }

          // Find the next price line
          for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
            const nextLine = lines[j].trim();
            console.log(`   Checking next line: "${nextLine}"`);
            const priceMatch = nextLine.match(/^(\d+\.\d{2})$/);
            if (priceMatch) {
              console.log(
                `💰 Found additional fee price: ${priceMatch[1]} for ${line}`,
              );
              additionalFees.push({
                fee: {
                  name: line,
                  price: priceMatch[1],
                  quantity: '1',
                  unit_price: priceMatch[1],
                  item_number: undefined,
                },
                context: {
                  precedingProduct,
                  rawTextPosition: i,
                },
              });
              break;
            }
          }
        }
      }
      console.log(
        `✅ Found ${additionalFees.length} additional fee items:`,
        additionalFees.map(
          (f) =>
            `${f.fee.name}: ${f.fee.price} (after: ${f.context.precedingProduct || 'unknown'})`,
        ),
      );
    }

    return additionalFees;
  }

  /**
   * Extract only fee items from raw text to supplement structured extraction
   */
  private extractFeeItemsFromRawText(
    rawText: string,
    merchant: string,
  ): OcrItem[] {
    const lines = rawText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const feeItems: OcrItem[] = [];

    // Costco-specific patterns for fee extraction
    if (merchant.toLowerCase().includes('costco')) {
      console.log('🔍 Looking for fee items in raw text...');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Look specifically for fee patterns
        if (
          line.match(
            /^(ENVIRO?\s*FEE|ECO\s*FEE|DEPOSIT|BAG\s*FEE|SERVICE\s*FEE)/i,
          )
        ) {
          console.log(`📋 Found potential fee line: "${line}"`);
          // Find the next price line
          for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
            const nextLine = lines[j].trim();
            console.log(`   Checking next line: "${nextLine}"`);
            const priceMatch = nextLine.match(/^(\d+\.\d{2})$/);
            if (priceMatch) {
              console.log(`💰 Found fee price: ${priceMatch[1]} for ${line}`);
              feeItems.push({
                name: line,
                price: priceMatch[1],
                quantity: '1',
                unit_price: priceMatch[1],
                item_number: undefined,
              });
              break;
            }
          }
        }
      }
      console.log(
        `✅ Extracted ${feeItems.length} fee items:`,
        feeItems.map((f) => `${f.name}: ${f.price}`),
      );
    }

    return feeItems;
  }

  /**
   * Extract items from raw text as fallback when structured extraction fails
   */
  private extractItemsFromRawText(
    rawText: string,
    merchant: string,
  ): OcrItem[] {
    const lines = rawText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Costco-specific patterns for item extraction
    if (merchant.toLowerCase().includes('costco')) {
      return this.extractCostcoItemsFromText(lines);
    }

    // Generic receipt pattern extraction
    return this.extractGenericItemsFromText(lines);
  }

  /**
   * Extract Costco items from raw text lines
   */
  private extractCostcoItemsFromText(lines: string[]): OcrItem[] {
    const items: OcrItem[] = [];
    const usedPriceIndices = new Set<number>();

    // Costco receipt multi-line format where items and prices are on separate lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines, header lines, and total/tax lines
      if (
        !line ||
        line.match(
          /^(COSTCO|WHOLESALE|Langley|SELF-CHECKOUT|LF\s*Member|Member|SUBTOTAL|TAX|\*+\s*TOTAL|REFERENCE|AUTH|AMOUNT|IMPORTANT|CUSTOMER|MasterCard|CHANGE|GST|PST|Whse|Items Sold|Thank You|Please Come|for your records|TOTAL NUMBER|TOTAL DISCOUNT|OP#|Name:|CTP|ACCT:|Invoice Number|Purchase|APPROVED|retain this copy)/i,
        )
      ) {
        continue;
      }

      // Look for item lines with item number: "1628802 OPTIMUM" or "4788 LAC FREE 2%"
      const itemMatch = line.match(/^(\d{4,7})\s+(.+)$/);
      if (itemMatch) {
        const itemNumber = itemMatch[1];
        const itemName = itemMatch[2].trim();

        // Skip if it looks like a price line
        if (itemName.match(/^\d+\.\d{2}(?:\s*GP)?$/)) {
          continue;
        }

        // Skip tax breakdown lines
        if (itemName.match(/^[A-Z]\s*\([A-Z\s)]*\)?\s*(GST|PST|HST|TAX)/i)) {
          continue;
        }

        // Find the price on the next line(s) that hasn't been used yet
        let price = '';
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          if (usedPriceIndices.has(j)) continue; // Skip already used prices

          const nextLine = lines[j].trim();

          // Look for price patterns (including negative prices like "3.00-GP")
          const priceMatch = nextLine.match(
            /^(\d+\.\d{2}(?:-(?:GP|[A-Z]*)?)?)\s*(?:GP)?$/,
          );
          if (priceMatch) {
            price = priceMatch[1];
            usedPriceIndices.add(j); // Mark this price as used
            break;
          }
        }

        if (price) {
          items.push({
            name: itemName,
            price: price,
            quantity: '1',
            unit_price: price,
            item_number: itemNumber,
          });
        }
        continue;
      }

      // Look for standalone items without item numbers: "ECO FEE BAT", "AMBROSIA APP"
      // But skip lines that are clearly not products
      if (
        !line.match(/^\d+\.\d{2}/) && // Not a price
        !line.match(/^[A-Z]\s*\([A-Z\s)]*\)?\s*(GST|PST|HST|TAX)/i) && // Not tax
        line.length >= 3 && // Not too short
        !line.match(/^\d{4}\/\d{2}\/\d{2}/) && // Not a date
        !line.match(/^[A-Z]\d+$/) && // Not codes like "A800"
        !line.match(/^X{10,}/) && // Not masked card numbers
        !line.match(/^\d{10,}/) // Not long numbers
      ) {
        // Special handling for certain patterns
        if (
          line.match(
            /^(ECO\s*FEE|ENV(?:IRO)?\s*FEE|TPD\/|AMBROSIA|DEPOSIT)/i,
          ) ||
          line.match(/^\d{4,7}\s+/) // Already handled above
        ) {
          // Check if this is a mixed product+fee line (e.g., "LAC FREE 2 ENVIRO FEE C")
          const mixedMatch = line.match(
            /^(.+?)\s+(ENV(?:IRO)?\s*FEE|ECO\s*FEE|DEPOSIT)(.*)$/i,
          );

          if (mixedMatch) {
            // Split into product and fee components
            const productName = mixedMatch[1].trim(); // "LAC FREE 2"
            const feeName = (mixedMatch[2] + (mixedMatch[3] || '')).trim(); // "ENVIRO FEE C"

            // Find prices for both components
            let productPrice = '';
            let feePrice = '';
            let pricesFound = 0;

            for (
              let j = i + 1;
              j < Math.min(i + 5, lines.length) && pricesFound < 2;
              j++
            ) {
              if (usedPriceIndices.has(j)) continue;

              const nextLine = lines[j].trim();
              const priceMatch = nextLine.match(
                /^(\d+\.\d{2}(?:-[A-Z]*)?)(?:\s+GP)?$/,
              );

              if (priceMatch) {
                if (!productPrice) {
                  productPrice = priceMatch[1];
                  usedPriceIndices.add(j);
                  pricesFound++;
                } else if (!feePrice) {
                  feePrice = priceMatch[1];
                  usedPriceIndices.add(j);
                  pricesFound++;
                }
              }
            }

            // Add product
            if (productPrice) {
              items.push({
                name: productName,
                price: productPrice,
                quantity: '1',
                unit_price: productPrice,
                item_number: undefined,
              });
            }

            // Add fee as separate item
            if (feePrice) {
              items.push({
                name: feeName,
                price: feePrice,
                quantity: '1',
                unit_price: feePrice,
                item_number: undefined,
              });
            }
          } else {
            // Regular standalone fee or item
            let price = '';
            for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
              if (usedPriceIndices.has(j)) continue;

              const nextLine = lines[j].trim();

              const priceMatch = nextLine.match(
                /^(\d+\.\d{2}(?:-[A-Z]*)?)(?:\s+GP)?$/,
              );
              if (priceMatch) {
                price = priceMatch[1];
                usedPriceIndices.add(j);
                break;
              }
            }

            if (price) {
              items.push({
                name: line,
                price: price,
                quantity: '1',
                unit_price: price,
                item_number: undefined,
              });
            }
          }
        }
      }
    }

    return items;
  }

  /**
   * Extract items from generic receipt format
   */
  private extractGenericItemsFromText(lines: string[]): OcrItem[] {
    const items: OcrItem[] = [];

    // Generic patterns for various receipt formats
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Pattern 1: Item name followed by price on same line
      const pattern1 = line.match(/^(.+?)\s+\$?(\d+\.\d{2}(?:-[A-Z]*)?)\s*$/);
      if (pattern1) {
        const name = pattern1[1].trim();
        const price = pattern1[2];

        if (
          name.length >= 3 &&
          !name.match(/^(TOTAL|TAX|SUBTOTAL|CASH|CHANGE)/i)
        ) {
          items.push({
            name,
            price,
            quantity: '1',
            unit_price: price,
            item_number: undefined,
          });
        }
        continue;
      }

      // Pattern 2: Item name on one line, price on next line
      if (i < lines.length - 1) {
        const nextLine = lines[i + 1];
        const priceMatch = nextLine.match(
          /^\s*\$?(\d+\.\d{2}(?:-[A-Z]*)?)\s*$/,
        );

        if (
          priceMatch &&
          line.length >= 3 &&
          !line.match(/^(TOTAL|TAX|SUBTOTAL|CASH|CHANGE)/i)
        ) {
          const name = line.trim();
          const price = priceMatch[1];

          items.push({
            name,
            price,
            quantity: '1',
            unit_price: price,
            item_number: undefined,
          });

          i++; // Skip the price line
        }
      }
    }

    return items;
  }
}
