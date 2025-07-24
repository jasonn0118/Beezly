import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDiscountFieldsToPrice1753161400000
  implements MigrationInterface
{
  name = 'AddDiscountFieldsToPrice1753161400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if Price table exists before trying to alter it
    const tableExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Price'
      );
    `)) as [{ exists: boolean }];

    if (!tableExists[0].exists) {
      console.log(
        'Price table does not exist. Skipping discount fields addition.',
      );
      return;
    }

    // Check if the discount type enum already exists
    const enumExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM pg_type 
        WHERE typname = 'Price_discount_type_enum'
      );
    `)) as [{ exists: boolean }];

    if (!enumExists[0].exists) {
      await queryRunner.query(
        `CREATE TYPE "public"."Price_discount_type_enum" AS ENUM('percentage', 'fixed_amount', 'coupon', 'adjustment')`,
      );
    }

    // Check if is_discount column already exists
    const isDiscountExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Price' 
        AND column_name = 'is_discount'
      );
    `)) as [{ exists: boolean }];

    if (!isDiscountExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "Price" ADD "is_discount" boolean NOT NULL DEFAULT false`,
      );
    }

    // Check if discount_type column already exists
    const discountTypeExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Price' 
        AND column_name = 'discount_type'
      );
    `)) as [{ exists: boolean }];

    if (!discountTypeExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "Price" ADD "discount_type" "public"."Price_discount_type_enum"`,
      );
    }

    // Check if original_price column already exists
    const originalPriceExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Price' 
        AND column_name = 'original_price'
      );
    `)) as [{ exists: boolean }];

    if (!originalPriceExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "Price" ADD "original_price" numeric`,
      );
    }

    // Check if discount_reason column already exists
    const discountReasonExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Price' 
        AND column_name = 'discount_reason'
      );
    `)) as [{ exists: boolean }];

    if (!discountReasonExists[0].exists) {
      await queryRunner.query(`ALTER TABLE "Price" ADD "discount_reason" text`);
    }

    console.log('Price discount fields added successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if Price table exists before trying to alter it
    const tableExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Price'
      );
    `)) as [{ exists: boolean }];

    if (!tableExists[0].exists) {
      console.log(
        'Price table does not exist. Skipping discount fields removal.',
      );
      return;
    }

    // Check and drop columns if they exist
    const discountReasonExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Price' 
        AND column_name = 'discount_reason'
      );
    `)) as [{ exists: boolean }];

    if (discountReasonExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "Price" DROP COLUMN "discount_reason"`,
      );
    }

    const originalPriceExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Price' 
        AND column_name = 'original_price'
      );
    `)) as [{ exists: boolean }];

    if (originalPriceExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "Price" DROP COLUMN "original_price"`,
      );
    }

    const discountTypeExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Price' 
        AND column_name = 'discount_type'
      );
    `)) as [{ exists: boolean }];

    if (discountTypeExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "Price" DROP COLUMN "discount_type"`,
      );
    }

    const isDiscountExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Price' 
        AND column_name = 'is_discount'
      );
    `)) as [{ exists: boolean }];

    if (isDiscountExists[0].exists) {
      await queryRunner.query(`ALTER TABLE "Price" DROP COLUMN "is_discount"`);
    }

    // Check if the enum type exists before trying to drop it
    const enumExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM pg_type 
        WHERE typname = 'Price_discount_type_enum'
      );
    `)) as [{ exists: boolean }];

    if (enumExists[0].exists) {
      await queryRunner.query(`DROP TYPE "public"."Price_discount_type_enum"`);
    }

    console.log('Price discount fields removed successfully.');
  }
}
