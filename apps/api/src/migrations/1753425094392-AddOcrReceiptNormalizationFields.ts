import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOcrReceiptNormalizationFields1753425094392
  implements MigrationInterface
{
  name = 'AddOcrReceiptNormalizationFields1753425094392';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add OCR normalization fields to ReceiptItem (with conditional checks)
    await this.addColumnIfNotExists(
      queryRunner,
      'ReceiptItem',
      'raw_name',
      'character varying(255)',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'ReceiptItem',
      'normalized_name',
      'character varying(255)',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'ReceiptItem',
      'brand',
      'character varying(100)',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'ReceiptItem',
      'category',
      'character varying(100)',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'ReceiptItem',
      'confidence_score',
      'numeric(5,4)',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'ReceiptItem',
      'is_discount',
      'boolean NOT NULL DEFAULT false',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'ReceiptItem',
      'is_adjustment',
      'boolean NOT NULL DEFAULT false',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'ReceiptItem',
      'normalization_method',
      'character varying(50)',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'ReceiptItem',
      'embedding_data',
      'jsonb',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'ReceiptItem',
      'linked_discounts',
      'jsonb',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'ReceiptItem',
      'original_price',
      'numeric(10,2)',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'ReceiptItem',
      'final_price',
      'numeric(10,2)',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'ReceiptItem',
      'price_format_info',
      'jsonb',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'ReceiptItem',
      'item_code',
      'character varying(50)',
    );

    // Add OCR metadata fields to Receipt (with conditional checks)
    await this.addColumnIfNotExists(
      queryRunner,
      'Receipt',
      'raw_text',
      'jsonb',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'Receipt',
      'ocr_confidence',
      'numeric(5,4)',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'Receipt',
      'engine_used',
      'character varying(50)',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'Receipt',
      'ocr_data',
      'jsonb',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'Receipt',
      'normalization_summary',
      'jsonb',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'Receipt',
      'receipt_date',
      'TIMESTAMP',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'Receipt',
      'receipt_time',
      'character varying(10)',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'Receipt',
      'subtotal',
      'numeric(10,2)',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'Receipt',
      'tax',
      'numeric(10,2)',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'Receipt',
      'total',
      'numeric(10,2)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove OCR metadata fields from Receipt (with conditional checks)
    await this.dropColumnIfExists(queryRunner, 'Receipt', 'total');
    await this.dropColumnIfExists(queryRunner, 'Receipt', 'tax');
    await this.dropColumnIfExists(queryRunner, 'Receipt', 'subtotal');
    await this.dropColumnIfExists(queryRunner, 'Receipt', 'receipt_time');
    await this.dropColumnIfExists(queryRunner, 'Receipt', 'receipt_date');
    await this.dropColumnIfExists(
      queryRunner,
      'Receipt',
      'normalization_summary',
    );
    await this.dropColumnIfExists(queryRunner, 'Receipt', 'ocr_data');
    await this.dropColumnIfExists(queryRunner, 'Receipt', 'engine_used');
    await this.dropColumnIfExists(queryRunner, 'Receipt', 'ocr_confidence');
    await this.dropColumnIfExists(queryRunner, 'Receipt', 'raw_text');

    // Remove OCR normalization fields from ReceiptItem (with conditional checks)
    await this.dropColumnIfExists(queryRunner, 'ReceiptItem', 'item_code');
    await this.dropColumnIfExists(
      queryRunner,
      'ReceiptItem',
      'price_format_info',
    );
    await this.dropColumnIfExists(queryRunner, 'ReceiptItem', 'final_price');
    await this.dropColumnIfExists(queryRunner, 'ReceiptItem', 'original_price');
    await this.dropColumnIfExists(
      queryRunner,
      'ReceiptItem',
      'linked_discounts',
    );
    await this.dropColumnIfExists(queryRunner, 'ReceiptItem', 'embedding_data');
    await this.dropColumnIfExists(
      queryRunner,
      'ReceiptItem',
      'normalization_method',
    );
    await this.dropColumnIfExists(queryRunner, 'ReceiptItem', 'is_adjustment');
    await this.dropColumnIfExists(queryRunner, 'ReceiptItem', 'is_discount');
    await this.dropColumnIfExists(
      queryRunner,
      'ReceiptItem',
      'confidence_score',
    );
    await this.dropColumnIfExists(queryRunner, 'ReceiptItem', 'category');
    await this.dropColumnIfExists(queryRunner, 'ReceiptItem', 'brand');
    await this.dropColumnIfExists(
      queryRunner,
      'ReceiptItem',
      'normalized_name',
    );
    await this.dropColumnIfExists(queryRunner, 'ReceiptItem', 'raw_name');
  }

  /**
   * Helper method to add column only if it doesn't exist
   */
  private async addColumnIfNotExists(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
    columnDefinition: string,
  ): Promise<void> {
    // First check if the table exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '${tableName}'
      );
    `);

    if (!tableExists[0].exists) {
      console.log(
        `⚠️  Table ${tableName} does not exist. Skipping column ${columnName} addition.`,
      );
      return;
    }

    // Check if column already exists
    const columnExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = '${tableName}' AND column_name = '${columnName}'
    `);

    if (columnExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "${tableName}" ADD "${columnName}" ${columnDefinition}`,
      );
      console.log(`✅ Added column ${columnName} to ${tableName}`);
    } else {
      console.log(
        `ℹ️  Column ${columnName} already exists in ${tableName}, skipping`,
      );
    }
  }

  /**
   * Helper method to drop column only if it exists
   */
  private async dropColumnIfExists(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
  ): Promise<void> {
    // First check if the table exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '${tableName}'
      );
    `);

    if (!tableExists[0].exists) {
      console.log(
        `⚠️  Table ${tableName} does not exist. Skipping column ${columnName} removal.`,
      );
      return;
    }

    // Check if column exists
    const columnExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = '${tableName}' AND column_name = '${columnName}'
    `);

    if (columnExists.length > 0) {
      await queryRunner.query(
        `ALTER TABLE "${tableName}" DROP COLUMN "${columnName}"`,
      );
      console.log(`✅ Dropped column ${columnName} from ${tableName}`);
    } else {
      console.log(
        `ℹ️  Column ${columnName} doesn't exist in ${tableName}, skipping`,
      );
    }
  }
}
