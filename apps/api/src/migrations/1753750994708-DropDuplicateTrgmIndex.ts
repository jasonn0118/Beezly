import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropDuplicateTrgmIndex1753750994708 implements MigrationInterface {
  name = 'DropDuplicateTrgmIndex1753750994708';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop index safely (using IF EXISTS)
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_product_name_trgm"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if Product table exists before creating index
    const productTableExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Product'
      );
    `)) as [{ exists: boolean }];

    if (productTableExists[0]?.exists) {
      await queryRunner.query(
        `CREATE INDEX "idx_product_name_trgm" ON "Product" ("name") `,
      );
    } else {
      console.log('⚠️  Product table not found, skipping index recreation');
    }
  }
}
