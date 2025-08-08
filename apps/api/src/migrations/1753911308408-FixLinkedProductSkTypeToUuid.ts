import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixLinkedProductSkTypeToUuid1753911308408
  implements MigrationInterface
{
  name = 'FixLinkedProductSkTypeToUuid1753911308408';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First check if the table exists
    const tableExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'normalized_products'
      );
    `)) as [{ exists: boolean }];

    if (!tableExists[0].exists) {
      console.log(
        'normalized_products table does not exist. Skipping linked_product_sk type change.',
      );
      return;
    }

    // Check if the column exists and get its type
    const columnExists = (await queryRunner.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'normalized_products'
      AND column_name = 'linked_product_sk'
    `)) as { data_type: string }[];

    // If column doesn't exist or is already UUID, skip
    if (columnExists.length === 0) {
      console.log(
        'linked_product_sk column does not exist. Skipping type change.',
      );
      return;
    }

    if (columnExists[0].data_type === 'uuid') {
      console.log(
        'linked_product_sk column is already UUID type. No changes needed.',
      );
      return;
    }

    // Drop foreign key constraint first
    await queryRunner.query(
      `ALTER TABLE "normalized_products" DROP CONSTRAINT IF EXISTS "FK_8988cdcae12e54d0c88e196ad38"`,
    );

    // Drop and recreate the column with UUID type
    await queryRunner.query(
      `ALTER TABLE "normalized_products" DROP COLUMN "linked_product_sk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ADD "linked_product_sk" uuid`,
    );

    // Recreate foreign key constraint to Product.product_sk (UUID) - only if Product table exists
    const productTableExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Product'
      );
    `)) as [{ exists: boolean }];

    if (productTableExists[0]?.exists) {
      console.log('✅ Product table found, creating foreign key constraint...');
      await queryRunner.query(
        `ALTER TABLE "normalized_products" ADD CONSTRAINT "FK_8988cdcae12e54d0c88e196ad38" FOREIGN KEY ("linked_product_sk") REFERENCES "Product"("product_sk") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
    } else {
      console.log(
        '⚠️  Product table not found, skipping foreign key constraint creation',
      );
      console.log(
        'ℹ️   Foreign key constraint can be added later when Product table exists',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // First check if the table exists
    const tableExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'normalized_products'
      );
    `)) as [{ exists: boolean }];

    if (!tableExists[0].exists) {
      console.log(
        'normalized_products table does not exist. Skipping linked_product_sk type rollback.',
      );
      return;
    }

    // Drop foreign key constraint first (only if it exists)
    await queryRunner.query(
      `ALTER TABLE "normalized_products" DROP CONSTRAINT IF EXISTS "FK_8988cdcae12e54d0c88e196ad38"`,
    );

    // Drop and recreate the column with integer type
    await queryRunner.query(
      `ALTER TABLE "normalized_products" DROP COLUMN "linked_product_sk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ADD "linked_product_sk" integer`,
    );

    // Recreate foreign key constraint to Product.id (integer) - only if Product table exists
    const productTableExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Product'
      );
    `)) as [{ exists: boolean }];

    if (productTableExists[0]?.exists) {
      await queryRunner.query(
        `ALTER TABLE "normalized_products" ADD CONSTRAINT "FK_8988cdcae12e54d0c88e196ad38" FOREIGN KEY ("linked_product_sk") REFERENCES "Product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
    }
  }
}
