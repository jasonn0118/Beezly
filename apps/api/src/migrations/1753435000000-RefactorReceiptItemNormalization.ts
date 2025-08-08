import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorReceiptItemNormalization1753435000000
  implements MigrationInterface
{
  name = 'RefactorReceiptItemNormalization1753435000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get the actual ReceiptItem table name (case-sensitive check)
    const receiptItemTableName =
      await this.getReceiptItemTableName(queryRunner);
    console.log(`✅ Found ReceiptItem table as: ${receiptItemTableName}`);

    // Step 1: Create the receipt_item_normalizations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "receipt_item_normalizations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "receipt_item_sk" uuid NOT NULL,
        "normalized_product_sk" uuid NOT NULL,
        "confidence_score" decimal(5,4) NOT NULL,
        "normalization_method" varchar(50) NOT NULL,
        "is_selected" boolean NOT NULL DEFAULT false,
        "similarity_score" decimal(5,4),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_receipt_item_normalizations" PRIMARY KEY ("id")
      )
    `);

    // Add indexes
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_receipt_item_normalization_unique" 
      ON "receipt_item_normalizations" ("receipt_item_sk", "normalized_product_sk")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_receipt_item_normalization_item" 
      ON "receipt_item_normalizations" ("receipt_item_sk")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_receipt_item_normalization_product" 
      ON "receipt_item_normalizations" ("normalized_product_sk")
    `);

    // Add foreign keys
    await queryRunner.query(`
      ALTER TABLE "receipt_item_normalizations" 
      ADD CONSTRAINT "FK_receipt_item_normalization_item" 
      FOREIGN KEY ("receipt_item_sk") 
      REFERENCES ${receiptItemTableName}("receiptitem_sk") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "receipt_item_normalizations" 
      ADD CONSTRAINT "FK_receipt_item_normalization_product" 
      FOREIGN KEY ("normalized_product_sk") 
      REFERENCES "normalized_products"("normalized_product_sk") 
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // Step 2: Migrate existing normalized data from ReceiptItem to receipt_item_normalizations
    // Only migrate items that have normalized data
    await queryRunner.query(`
      INSERT INTO "receipt_item_normalizations" (
        "receipt_item_sk",
        "normalized_product_sk",
        "confidence_score",
        "normalization_method",
        "is_selected",
        "similarity_score"
      )
      SELECT DISTINCT ON (ri."receiptitem_sk", np."normalized_product_sk")
        ri."receiptitem_sk",
        np."normalized_product_sk",
        COALESCE(ri."confidence_score", np."confidence_score", 0.5),
        COALESCE(ri."normalization_method", 'migration'),
        true, -- Mark migrated items as selected
        NULL
      FROM ${receiptItemTableName} ri
      INNER JOIN "Receipt" r ON ri."receipt_sk" = r."receipt_sk"
      INNER JOIN "Store" s ON r."store_sk" = s."store_sk"
      INNER JOIN "normalized_products" np ON 
        ri."raw_name" = np."raw_name" AND 
        s."name" = np."merchant"
      WHERE ri."normalized_name" IS NOT NULL
        AND ri."raw_name" IS NOT NULL
    `);

    // Step 3: Add new columns to ReceiptItem
    const receiptItemTableNameOnly = receiptItemTableName.replace(/"/g, '');
    await this.addColumnIfNotExists(
      queryRunner,
      receiptItemTableNameOnly,
      'is_discount_line',
      'boolean NOT NULL DEFAULT false',
    );

    await this.addColumnIfNotExists(
      queryRunner,
      receiptItemTableNameOnly,
      'is_adjustment_line',
      'boolean NOT NULL DEFAULT false',
    );

    await this.addColumnIfNotExists(
      queryRunner,
      receiptItemTableNameOnly,
      'ocr_confidence',
      'decimal(5,4)',
    );

    await this.addColumnIfNotExists(
      queryRunner,
      receiptItemTableNameOnly,
      'line_number',
      'integer',
    );

    // Step 4: Update boolean flags based on existing data
    await queryRunner.query(`
      UPDATE ${receiptItemTableName} 
      SET "is_discount_line" = "is_discount"
      WHERE "is_discount" = true
    `);

    await queryRunner.query(`
      UPDATE ${receiptItemTableName} 
      SET "is_adjustment_line" = "is_adjustment"
      WHERE "is_adjustment" = true
    `);

    // Step 5: Drop normalization-related columns from ReceiptItem
    // Keep raw_name and item_code as they're OCR data
    const columnsToDrop = [
      'normalized_name',
      'brand',
      'category',
      'confidence_score',
      'is_discount',
      'is_adjustment',
      'normalization_method',
      'embedding_data',
      'linked_discounts',
      'original_price',
      'final_price',
      'price_format_info',
    ];

    for (const column of columnsToDrop) {
      await this.dropColumnIfExists(
        queryRunner,
        receiptItemTableNameOnly,
        column,
      );
    }

    console.log(
      '✅ Successfully refactored receipt item normalization structure',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Get the actual ReceiptItem table name (case-sensitive check)
    const receiptItemTableName =
      await this.getReceiptItemTableName(queryRunner);
    const receiptItemTableNameOnly = receiptItemTableName.replace(/"/g, '');

    // Step 1: Re-add normalization columns to ReceiptItem
    await this.addColumnIfNotExists(
      queryRunner,
      receiptItemTableNameOnly,
      'normalized_name',
      'character varying(255)',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      receiptItemTableNameOnly,
      'brand',
      'character varying(100)',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      receiptItemTableNameOnly,
      'category',
      'character varying(100)',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      receiptItemTableNameOnly,
      'confidence_score',
      'decimal(5,4)',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      receiptItemTableNameOnly,
      'is_discount',
      'boolean NOT NULL DEFAULT false',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      receiptItemTableNameOnly,
      'is_adjustment',
      'boolean NOT NULL DEFAULT false',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      receiptItemTableNameOnly,
      'normalization_method',
      'character varying(50)',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      receiptItemTableNameOnly,
      'embedding_data',
      'jsonb',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      receiptItemTableNameOnly,
      'linked_discounts',
      'jsonb',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      receiptItemTableNameOnly,
      'original_price',
      'decimal(10,2)',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      receiptItemTableNameOnly,
      'final_price',
      'decimal(10,2)',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      receiptItemTableNameOnly,
      'price_format_info',
      'jsonb',
    );

    // Step 2: Restore data from receipt_item_normalizations
    await queryRunner.query(`
      UPDATE ${receiptItemTableName} ri
      SET 
        "normalized_name" = np."normalized_name",
        "brand" = np."brand",
        "category" = np."category",
        "confidence_score" = rin."confidence_score",
        "is_discount" = np."is_discount",
        "is_adjustment" = np."is_adjustment",
        "normalization_method" = rin."normalization_method"
      FROM "receipt_item_normalizations" rin
      INNER JOIN "normalized_products" np ON rin."normalized_product_sk" = np."normalized_product_sk"
      WHERE ri."receiptitem_sk" = rin."receipt_item_sk"
        AND rin."is_selected" = true
    `);

    // Step 3: Drop new columns
    await this.dropColumnIfExists(
      queryRunner,
      receiptItemTableNameOnly,
      'is_discount_line',
    );
    await this.dropColumnIfExists(
      queryRunner,
      receiptItemTableNameOnly,
      'is_adjustment_line',
    );
    await this.dropColumnIfExists(
      queryRunner,
      receiptItemTableNameOnly,
      'ocr_confidence',
    );
    await this.dropColumnIfExists(
      queryRunner,
      receiptItemTableNameOnly,
      'line_number',
    );

    // Step 4: Drop the receipt_item_normalizations table
    await queryRunner.query(
      `DROP TABLE IF EXISTS "receipt_item_normalizations"`,
    );
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
    const tableExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '${tableName}'
      );
    `)) as [{ exists: boolean }];

    if (!tableExists[0].exists) {
      console.log(
        `⚠️  Table ${tableName} does not exist. Skipping column ${columnName} addition.`,
      );
      return;
    }

    // Check if column already exists
    const columnExists = (await queryRunner.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = '${tableName}' AND column_name = '${columnName}'
    `)) as Array<{ '?column?': number }>;

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
    const tableExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '${tableName}'
      );
    `)) as [{ exists: boolean }];

    if (!tableExists[0].exists) {
      console.log(
        `⚠️  Table ${tableName} does not exist. Skipping column ${columnName} removal.`,
      );
      return;
    }

    // Check if column exists
    const columnExists = (await queryRunner.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = '${tableName}' AND column_name = '${columnName}'
    `)) as Array<{ '?column?': number }>;

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

  /**
   * Helper method to find the actual ReceiptItem table name
   * Handles different casing that might exist in different environments
   */
  private async getReceiptItemTableName(
    queryRunner: QueryRunner,
  ): Promise<string> {
    // Check possible table name variants (most common first)
    const variants = ['ReceiptItem', 'receiptitem', 'receipt_item'];

    for (const variant of variants) {
      const result = (await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${variant}'
        )
      `)) as [{ exists: boolean }];

      if (result[0]?.exists) {
        return `"${variant}"`;
      }
    }

    throw new Error(
      `ReceiptItem table not found with any expected name variant. ` +
        `Checked: ${variants.join(', ')}. ` +
        `Please verify the table exists in the database.`,
    );
  }
}
