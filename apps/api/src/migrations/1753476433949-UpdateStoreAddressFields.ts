import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateStoreAddressFieldsSafe1753476433949
  implements MigrationInterface
{
  name = 'UpdateStoreAddressFieldsSafe1753476433949';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if Store table exists first
    await this.ensureStoreTableExists(queryRunner);

    // 🛡️ SAFE MIGRATION: Add new columns first, THEN migrate data, THEN drop old column
    // 🔄 IDEMPOTENT: Check if columns exist before adding them
    // 🚀 CI/CD SAFE: Handles cases where columns already exist in staging/production

    // Check if Store table exists before operating on it
    const storeTableExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Store'
      );
    `)) as [{ exists: boolean }];

    if (storeTableExists[0]?.exists) {
      console.log(
        '✅ Store table found, proceeding with address field updates...',
      );

      // Step 1: Add new address columns (only if they don't exist)
      await this.addColumnIfNotExists(
        queryRunner,
        'Store',
        'street_number',
        'character varying',
      );
      await this.addColumnIfNotExists(
        queryRunner,
        'Store',
        'road',
        'character varying',
      );
      await this.addColumnIfNotExists(
        queryRunner,
        'Store',
        'street_address',
        'character varying',
      );
      await this.addColumnIfNotExists(
        queryRunner,
        'Store',
        'full_address',
        'character varying',
      );

      // Step 2: Copy existing address data to full_address to preserve data (only if address column exists)
      if (await this.columnExists(queryRunner, 'Store', 'address')) {
        await queryRunner.query(
          `UPDATE "Store" SET "full_address" = "address" WHERE "address" IS NOT NULL AND ("full_address" IS NULL OR "full_address" = '')`,
        );

        // Step 3: Parse and populate street components from existing addresses
        // This is basic parsing - will be enhanced by the restoration script
        await queryRunner.query(`
          UPDATE "Store" 
          SET 
            "street_number" = CASE 
              WHEN "address" ~ '^[0-9]+' THEN SPLIT_PART("address", ' ', 1)
              ELSE "street_number"
            END,
            "street_address" = CASE 
              WHEN "address" ~ '^[0-9]+' THEN SPLIT_PART("address", ',', 1)
              ELSE "street_address"
            END
          WHERE "address" IS NOT NULL 
            AND ("street_number" IS NULL OR "street_address" IS NULL)
        `);

        // Step 4: Only NOW drop the old address column (after data is preserved)
        await this.dropColumnIfExists(queryRunner, 'Store', 'address');
      }
    } else {
      console.log(
        '⚠️  Store table not found, skipping Store address field updates',
      );
      console.log(
        'ℹ️   This is normal for new environments. Store table will be created when needed.',
      );
    }

    // ReceiptItem changes (unrelated to Store address) - only if table exists
    const receiptItemTableExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ReceiptItem'
      );
    `)) as [{ exists: boolean }];

    if (receiptItemTableExists[0]?.exists) {
      console.log('✅ ReceiptItem table found, updating raw_name column...');

      if (await this.columnExists(queryRunner, 'ReceiptItem', 'raw_name')) {
        const rawNameNullable = (await queryRunner.query(`
          SELECT is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'ReceiptItem' AND column_name = 'raw_name'
        `)) as Array<{ is_nullable: string }>;

        if (
          rawNameNullable.length > 0 &&
          rawNameNullable[0].is_nullable === 'YES'
        ) {
          await queryRunner.query(
            `ALTER TABLE "ReceiptItem" ALTER COLUMN "raw_name" SET NOT NULL`,
          );
        }

        // Add comments for columns that exist
        await queryRunner.query(
          `COMMENT ON COLUMN "ReceiptItem"."raw_name" IS 'Raw item name from OCR'`,
        );
      }

      // Add comments for other columns only if they exist
      if (await this.columnExists(queryRunner, 'ReceiptItem', 'item_code')) {
        await queryRunner.query(
          `COMMENT ON COLUMN "ReceiptItem"."item_code" IS 'Item code/SKU from receipt'`,
        );
      }
      if (
        await this.columnExists(queryRunner, 'ReceiptItem', 'is_discount_line')
      ) {
        await queryRunner.query(
          `COMMENT ON COLUMN "ReceiptItem"."is_discount_line" IS 'Whether this line represents a discount'`,
        );
      }
      if (
        await this.columnExists(
          queryRunner,
          'ReceiptItem',
          'is_adjustment_line',
        )
      ) {
        await queryRunner.query(
          `COMMENT ON COLUMN "ReceiptItem"."is_adjustment_line" IS 'Whether this line represents an adjustment (tax, tip, etc.)'`,
        );
      }
      if (
        await this.columnExists(queryRunner, 'ReceiptItem', 'ocr_confidence')
      ) {
        await queryRunner.query(
          `COMMENT ON COLUMN "ReceiptItem"."ocr_confidence" IS 'OCR confidence for this line'`,
        );
      }
      if (await this.columnExists(queryRunner, 'ReceiptItem', 'line_number')) {
        await queryRunner.query(
          `COMMENT ON COLUMN "ReceiptItem"."line_number" IS 'Line number on the receipt'`,
        );
      }
    } else {
      console.log(
        '⚠️  ReceiptItem table not found, skipping ReceiptItem updates',
      );
      console.log(
        'ℹ️   This is normal for new environments. ReceiptItem table will be created when needed.',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback ReceiptItem changes - only if table exists
    const receiptItemTableExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ReceiptItem'
      );
    `)) as [{ exists: boolean }];

    if (receiptItemTableExists[0]?.exists) {
      // Remove comments only for columns that exist
      if (await this.columnExists(queryRunner, 'ReceiptItem', 'line_number')) {
        await queryRunner.query(
          `COMMENT ON COLUMN "ReceiptItem"."line_number" IS NULL`,
        );
      }
      if (
        await this.columnExists(queryRunner, 'ReceiptItem', 'ocr_confidence')
      ) {
        await queryRunner.query(
          `COMMENT ON COLUMN "ReceiptItem"."ocr_confidence" IS NULL`,
        );
      }
      if (
        await this.columnExists(
          queryRunner,
          'ReceiptItem',
          'is_adjustment_line',
        )
      ) {
        await queryRunner.query(
          `COMMENT ON COLUMN "ReceiptItem"."is_adjustment_line" IS NULL`,
        );
      }
      if (
        await this.columnExists(queryRunner, 'ReceiptItem', 'is_discount_line')
      ) {
        await queryRunner.query(
          `COMMENT ON COLUMN "ReceiptItem"."is_discount_line" IS NULL`,
        );
      }
      if (await this.columnExists(queryRunner, 'ReceiptItem', 'item_code')) {
        await queryRunner.query(
          `COMMENT ON COLUMN "ReceiptItem"."item_code" IS NULL`,
        );
      }
      if (await this.columnExists(queryRunner, 'ReceiptItem', 'raw_name')) {
        await queryRunner.query(
          `COMMENT ON COLUMN "ReceiptItem"."raw_name" IS NULL`,
        );
        await queryRunner.query(
          `ALTER TABLE "ReceiptItem" ALTER COLUMN "raw_name" DROP NOT NULL`,
        );
      }
    }

    // Rollback Store changes - only if table exists
    const storeTableExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Store'
      );
    `)) as [{ exists: boolean }];

    if (storeTableExists[0]?.exists) {
      // Restore address column and preserve data (only if it doesn't exist)
      if (!(await this.columnExists(queryRunner, 'Store', 'address'))) {
        await this.addColumnIfNotExists(
          queryRunner,
          'Store',
          'address',
          'character varying',
        );

        // Copy data back from full_address to address
        await queryRunner.query(
          `UPDATE "Store" SET "address" = "full_address" WHERE "full_address" IS NOT NULL`,
        );
      }

      // Drop new columns (safely)
      await this.dropColumnIfExists(queryRunner, 'Store', 'full_address');
      await this.dropColumnIfExists(queryRunner, 'Store', 'street_address');
      await this.dropColumnIfExists(queryRunner, 'Store', 'road');
      await this.dropColumnIfExists(queryRunner, 'Store', 'street_number');
    }
  }

  /**
   * Helper method to ensure Store table exists
   * Creates it if it doesn't exist (for new environments)
   */
  private async ensureStoreTableExists(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const tableExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Store'
      )
    `)) as [{ exists: boolean }];

    if (!tableExists[0]?.exists) {
      console.log('⚠️  Store table not found, creating it...');

      // Create UUID extension if it doesn't exist
      await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

      // Create Store table (from InitialSchema)
      await queryRunner.query(`
        CREATE TABLE "Store" (
          "id" SERIAL NOT NULL, 
          "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(), 
          "store_sk" uuid NOT NULL DEFAULT uuid_generate_v4(), 
          "name" character varying NOT NULL, 
          "address" character varying, 
          "city" character varying, 
          "province" character varying, 
          "postal_code" character varying, 
          "latitude" double precision, 
          "longitude" double precision, 
          "place_id" character varying, 
          CONSTRAINT "UQ_c87d6d368ad70873403dc0417a1" UNIQUE ("store_sk"), 
          CONSTRAINT "UQ_f1c45a7e5a9c58bbe2402dc86a0" UNIQUE ("place_id"), 
          CONSTRAINT "PK_f20e3845680debc547e49355a89" PRIMARY KEY ("id")
        )
      `);

      console.log('✅ Created Store table');
    } else {
      console.log('✅ Store table already exists');
    }
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
   * Helper method to check if a column exists in a table
   */
  private async columnExists(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
  ): Promise<boolean> {
    const result = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = '${tableName}' 
        AND column_name = '${columnName}'
      )
    `)) as [{ exists: boolean }];

    return result[0]?.exists || false;
  }
}
