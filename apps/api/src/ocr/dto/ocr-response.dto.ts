import { ApiProperty } from '@nestjs/swagger';

export class StoreSearchResultDto {
  @ApiProperty({ description: 'Store ID if found' })
  id?: string;

  @ApiProperty({ description: 'Store name' })
  name: string;

  @ApiProperty({ description: 'Full store address' })
  fullAddress?: string;

  @ApiProperty({ description: 'City' })
  city?: string;

  @ApiProperty({ description: 'Province/State' })
  province?: string;

  @ApiProperty({ description: 'Postal code' })
  postalCode?: string;

  @ApiProperty({ description: 'Confidence score for the match (0.0-1.0)' })
  confidence: number;

  @ApiProperty({
    description:
      'How the store was matched (exact_address, postal_code_name, etc.)',
  })
  matchMethod: string;
}

export class OcrStoreResultDto {
  @ApiProperty({ description: 'Whether a store was found in the database' })
  storeFound: boolean;

  @ApiProperty({
    description: 'Store details if found',
    type: StoreSearchResultDto,
    required: false,
  })
  store?: StoreSearchResultDto;

  @ApiProperty({ description: 'OCR extracted merchant name' })
  extractedMerchant: string;

  @ApiProperty({ description: 'OCR extracted store address', required: false })
  extractedAddress?: string;

  @ApiProperty({ description: 'Message for user about next steps' })
  message: string;

  @ApiProperty({
    description: 'Whether user needs to search and confirm store',
  })
  requiresUserConfirmation: boolean;
}

export class ProcessReceiptEnhancedResponseDto {
  @ApiProperty({ description: 'Receipt processing status' })
  status: 'success' | 'store_not_found' | 'error';

  @ApiProperty({ description: 'Receipt ID' })
  receiptId?: string;

  @ApiProperty({ description: 'Store search result', type: OcrStoreResultDto })
  storeResult: OcrStoreResultDto;

  @ApiProperty({ description: 'Number of items processed' })
  itemsProcessed?: number;

  @ApiProperty({ description: 'Any error messages', type: [String] })
  errors?: string[];
}

export class ConfirmStoreForReceiptDto {
  @ApiProperty({ description: 'Receipt ID to link the store to' })
  receiptId: string;

  @ApiProperty({ description: 'Store ID from user selection' })
  storeId: string;

  @ApiProperty({
    description: 'Whether to continue processing the receipt items',
  })
  continueProcessing?: boolean;
}
