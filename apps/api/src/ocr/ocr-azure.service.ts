/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { Injectable } from '@nestjs/common';
import DocumentIntelligence from '@azure-rest/ai-document-intelligence';
import { AzureKeyCredential } from '@azure/core-auth';
import { OcrResult, OcrItem } from './ocr.service';

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
      // Initialize Azure Document Intelligence client
      const client = DocumentIntelligence(
        endpoint,
        new AzureKeyCredential(apiKey),
      );

      // Analyze document using prebuilt receipt model
      const initialResponse = await client
        .path('/documentModels/{modelId}:analyze', 'prebuilt-receipt')
        .post({
          contentType: 'application/octet-stream',
          body: buffer,
        });

      if (initialResponse.status !== '202') {
        throw new Error(
          `Azure API error: ${initialResponse.status} - ${String(initialResponse.body)}`,
        );
      }

      // Get operation location for polling
      const operationLocation = initialResponse.headers['operation-location'];
      if (!operationLocation) {
        throw new Error('Azure API error: No operation location received');
      }

      // Poll for results using the Azure SDK
      const result = await this.pollForResultsWithSdk(
        client,
        operationLocation,
      );

      // Parse the prebuilt receipt response
      return this.parsePrebuiltReceiptResponse(result);
    } catch (error) {
      throw new Error(
        `Azure Prebuilt Receipt error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Poll Azure API for analysis results using SDK
   */
  private async pollForResultsWithSdk(
    client: any,
    operationLocation: string,
  ): Promise<Record<string, any>> {
    const maxRetries = 30;
    const retryDelayMs = 1000;
    let retryCount = 0;

    // Extract operation ID from operation location
    const operationId = operationLocation.split('/').pop()?.split('?')[0];
    if (!operationId) {
      throw new Error('Could not extract operation ID from operation location');
    }

    while (retryCount < maxRetries) {
      try {
        const response = await client
          .path(
            '/documentModels/{modelId}/analyzeResults/{resultId}',
            'prebuilt-receipt',
            operationId,
          )
          .get();

        if (response.status === '200') {
          const result = response.body;
          if (result.status === 'succeeded') {
            return result as Record<string, any>;
          } else if (result.status === 'failed') {
            throw new Error(
              `Azure analysis failed: ${result.error || 'Unknown error'}`,
            );
          }
          // Status is still 'running' or 'notStarted', continue polling
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        retryCount++;
      } catch (error) {
        if (retryCount >= maxRetries - 1) {
          throw error;
        }
        // Continue polling for other errors
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        retryCount++;
      }
    }

    throw new Error('Azure API timeout: Analysis took too long');
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

      // Log basic info
      console.log('OCR Processing - Fields found:', Object.keys(fields));
      console.log('Items field exists:', !!fields.Items);

      // Extract structured data using Microsoft's official field names
      const merchant = this.extractFieldValue(fields.MerchantName);
      const date = this.extractDateField(fields);
      const time = this.extractTimeField(fields);
      const total = this.extractMoneyField(fields.Total);
      const subtotal = this.extractMoneyField(fields.Subtotal);
      const tax = this.extractMoneyField(fields.TotalTax);
      const storeAddress = this.extractAddressField(fields);
      const items = this.extractItemsField(fields.Items);

      // Extract raw text from all pages
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

      // Get confidence from the document
      const confidence = receipt.confidence || 0;

      return {
        merchant,
        date,
        total,
        items,
        item_count: items.length,
        raw_text: rawText,
        azure_confidence: confidence,
        engine_used: 'Azure Prebuilt Receipt AI',
        subtotal,
        tax,
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
      const currency = amount.currency_code || amount.currencyCode || 'USD';
      const value = amount.amount || 0;
      return currency === 'USD'
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
   * Extract date from various field names
   */
  private extractDateField(fields: Record<string, any>): string {
    const dateFieldNames = [
      'TransactionDate',
      'Date',
      'ReceiptDate',
      'PurchaseDate',
    ];

    for (const fieldName of dateFieldNames) {
      if (fields[fieldName]) {
        const value =
          (fields[fieldName].value_date as string) ||
          (fields[fieldName].valueDate as string) ||
          this.extractFieldValue(fields[fieldName] as Record<string, any>);
        if (value) return value;
      }
    }

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

    console.log(`Processing ${itemsArray.length} items from receipt`);

    const items: OcrItem[] = [];

    for (const item of itemsArray) {
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
        items.push({
          name,
          price,
          quantity,
          unit_price: unitPrice,
          item_number: itemNumber,
        });
      }
    }

    console.log(`Successfully extracted ${items.length} items`);
    return items;
  }
}
