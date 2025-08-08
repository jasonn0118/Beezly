import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorReceiptItemNormalization1753435000000
  implements MigrationInterface
{
  name = 'RefactorReceiptItemNormalization1753435000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if ReceiptItem table exists, if not, create it first
    await this.ensureReceiptItemTableExists(queryRunner);

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
      REFERENCES "ReceiptItem"("receiptitem_sk") 
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
      FROM "ReceiptItem" ri
      INNER JOIN "Receipt" r ON ri."receipt_sk" = r."receipt_sk"
      INNER JOIN "Store" s ON r."store_sk" = s."store_sk"
      INNER JOIN "normalized_products" np ON 
        ri."raw_name" = np."raw_name" AND 
        s."name" = np."merchant"
      WHERE ri."normalized_name" IS NOT NULL
        AND ri."raw_name" IS NOT NULL
    `);

    // Step 3: Add new columns to ReceiptItem
    await this.addColumnIfNotExists(
      queryRunner,
      'ReceiptItem',
      'is_discount_line',
      'boolean NOT NULL DEFAULT false',
    );

    await this.addColumnIfNotExists(
      queryRunner,
      'ReceiptItem',
      'is_adjustment_line',
      'boolean NOT NULL DEFAULT false',
    );

    await this.addColumnIfNotExists(
      queryRunner,
      'ReceiptItem',
      'ocr_confidence',
      'decimal(5,4)',
    );

    await this.addColumnIfNotExists(
      queryRunner,
      'ReceiptItem',
      'line_number',
      'integer',
    );

    // Step 4: Update boolean flags based on existing data
    await queryRunner.query(`
      UPDATE "ReceiptItem" 
      SET "is_discount_line" = "is_discount"
      WHERE "is_discount" = true
    `);

    await queryRunner.query(`
      UPDATE "ReceiptItem" 
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
      await this.dropColumnIfExists(queryRunner, 'ReceiptItem', column);
    }

    console.log(
      '✅ Successfully refactored receipt item normalization structure',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Re-add normalization columns to ReceiptItem
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
      'decimal(5,4)',
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
      'decimal(10,2)',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'ReceiptItem',
      'final_price',
      'decimal(10,2)',
    );
    await this.addColumnIfNotExists(
      queryRunner,
      'ReceiptItem',
      'price_format_info',
      'jsonb',
    );

    // Step 2: Restore data from receipt_item_normalizations
    await queryRunner.query(`
      UPDATE "ReceiptItem" ri
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
      'ReceiptItem',
      'is_discount_line',
    );
    await this.dropColumnIfExists(
      queryRunner,
      'ReceiptItem',
      'is_adjustment_line',
    );
    await this.dropColumnIfExists(queryRunner, 'ReceiptItem', 'ocr_confidence');
    await this.dropColumnIfExists(queryRunner, 'ReceiptItem', 'line_number');

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
   * Helper method to ensure ReceiptItem table exists
   * Creates it if it doesn't exist (for new environments)
   */
  private async ensureReceiptItemTableExists(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const tableExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ReceiptItem'
      )
    `)) as [{ exists: boolean }];

    if (!tableExists[0]?.exists) {
      console.log('⚠️  ReceiptItem table not found, creating it...');

      // Create UUID extension if it doesn't exist
      await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

      // Create ReceiptItem table (from InitialSchema)
      await queryRunner.query(`
        INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") 
        VALUES (current_database(), 'public', 'ReceiptItem', 'GENERATED_COLUMN', 'line_total', '"price" * "quantity"')
      `);

      await queryRunner.query(`
        CREATE TABLE "ReceiptItem" (
          "id" SERIAL NOT NULL, 
          "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(), 
          "receiptitem_sk" uuid NOT NULL DEFAULT uuid_generate_v4(), 
          "receipt_sk" uuid, 
          "product_sk" uuid, 
          "price" numeric NOT NULL, 
          "quantity" integer NOT NULL DEFAULT '1', 
          "line_total" numeric GENERATED ALWAYS AS ("price" * "quantity") STORED NOT NULL, 
          "raw_name" character varying(255),
          "item_code" character varying(50),
          CONSTRAINT "UQ_ccaa04aaef141c8c0706bba5f33" UNIQUE ("receiptitem_sk"), 
          CONSTRAINT "PK_63dbeaf2451849f0f8b492ea3e5" PRIMARY KEY ("id")
        )
      `);

      console.log('✅ Created ReceiptItem table');
    } else {
      console.log('✅ ReceiptItem table already exists');
    }
  }
}
