import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBarcodeTypeToProduct1752867138250
  implements MigrationInterface
{
  name = 'AddBarcodeTypeToProduct1752867138250';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if Product table exists before trying to alter it
    const tableExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Product'
      );
    `)) as [{ exists: boolean }];

    if (!tableExists[0].exists) {
      console.log(
        'Product table does not exist. Skipping barcode_type column addition.',
      );
      return;
    }

    // Check if the enum type already exists
    const enumExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM pg_type 
        WHERE typname = 'Product_barcode_type_enum'
      );
    `)) as [{ exists: boolean }];

    if (!enumExists[0].exists) {
      await queryRunner.query(
        `CREATE TYPE "public"."Product_barcode_type_enum" AS ENUM('code39', 'ean8', 'ean13', 'codabar', 'itf14', 'code128', 'upc_a', 'upc_e')`,
      );
    }

    // Check if the column already exists
    const columnExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Product' 
        AND column_name = 'barcode_type'
      );
    `)) as [{ exists: boolean }];

    if (!columnExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "Product" ADD "barcode_type" "public"."Product_barcode_type_enum"`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if Product table exists before trying to alter it
    const tableExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Product'
      );
    `)) as [{ exists: boolean }];

    if (!tableExists[0].exists) {
      console.log(
        'Product table does not exist. Skipping barcode_type column removal.',
      );
      return;
    }

    // Check if the column exists before trying to drop it
    const columnExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Product' 
        AND column_name = 'barcode_type'
      );
    `)) as [{ exists: boolean }];

    if (columnExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "Product" DROP COLUMN "barcode_type"`,
      );
    }

    // Check if the enum type exists before trying to drop it
    const enumExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM pg_type 
        WHERE typname = 'Product_barcode_type_enum'
      );
    `)) as [{ exists: boolean }];

    if (enumExists[0].exists) {
      await queryRunner.query(`DROP TYPE "public"."Product_barcode_type_enum"`);
    }
  }
}
