import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateStoreAddressFieldsSafe1753476433949
  implements MigrationInterface
{
  name = 'UpdateStoreAddressFieldsSafe1753476433949';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 🛡️ SAFE MIGRATION: Add new columns first, THEN migrate data, THEN drop old column

    // Step 1: Add new address columns
    await queryRunner.query(
      `ALTER TABLE "Store" ADD "street_number" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "Store" ADD "road" character varying`);
    await queryRunner.query(
      `ALTER TABLE "Store" ADD "street_address" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "Store" ADD "full_address" character varying`,
    );

    // Step 2: Copy existing address data to full_address to preserve data
    await queryRunner.query(
      `UPDATE "Store" SET "full_address" = "address" WHERE "address" IS NOT NULL`,
    );

    // Step 3: Parse and populate street components from existing addresses
    // This is basic parsing - will be enhanced by the restoration script
    await queryRunner.query(`
      UPDATE "Store" 
      SET 
        "street_number" = CASE 
          WHEN "address" ~ '^[0-9]+' THEN SPLIT_PART("address", ' ', 1)
          ELSE NULL 
        END,
        "street_address" = CASE 
          WHEN "address" ~ '^[0-9]+' THEN SPLIT_PART("address", ',', 1)
          ELSE NULL 
        END
      WHERE "address" IS NOT NULL
    `);

    // Step 4: Only NOW drop the old address column (after data is preserved)
    await queryRunner.query(`ALTER TABLE "Store" DROP COLUMN "address"`);

    // ReceiptItem changes (unrelated to Store address)
    await queryRunner.query(
      `ALTER TABLE "ReceiptItem" ALTER COLUMN "raw_name" SET NOT NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "ReceiptItem"."raw_name" IS 'Raw item name from OCR'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "ReceiptItem"."item_code" IS 'Item code/SKU from receipt'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "ReceiptItem"."is_discount_line" IS 'Whether this line represents a discount'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "ReceiptItem"."is_adjustment_line" IS 'Whether this line represents an adjustment (tax, tip, etc.)'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "ReceiptItem"."ocr_confidence" IS 'OCR confidence for this line'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "ReceiptItem"."line_number" IS 'Line number on the receipt'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback ReceiptItem changes
    await queryRunner.query(
      `COMMENT ON COLUMN "ReceiptItem"."line_number" IS NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "ReceiptItem"."ocr_confidence" IS NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "ReceiptItem"."is_adjustment_line" IS NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "ReceiptItem"."is_discount_line" IS NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "ReceiptItem"."item_code" IS NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "ReceiptItem"."raw_name" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "ReceiptItem" ALTER COLUMN "raw_name" DROP NOT NULL`,
    );

    // Restore address column and preserve data
    await queryRunner.query(
      `ALTER TABLE "Store" ADD "address" character varying`,
    );

    // Copy data back from full_address to address
    await queryRunner.query(
      `UPDATE "Store" SET "address" = "full_address" WHERE "full_address" IS NOT NULL`,
    );

    // Drop new columns
    await queryRunner.query(`ALTER TABLE "Store" DROP COLUMN "full_address"`);
    await queryRunner.query(`ALTER TABLE "Store" DROP COLUMN "street_address"`);
    await queryRunner.query(`ALTER TABLE "Store" DROP COLUMN "road"`);
    await queryRunner.query(`ALTER TABLE "Store" DROP COLUMN "street_number"`);
  }
}
