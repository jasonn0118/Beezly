import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPgTrgmExtension1753713000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create pg_trgm extension for fuzzy string matching
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

    // Check if Product table exists before creating index
    const productTableExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Product'
      );
    `)) as [{ exists: boolean }];

    if (productTableExists[0]?.exists) {
      console.log('✅ Product table found, creating trigram index...');
      // Create an index on the Product.name column for better performance
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_product_name_trgm 
        ON "Product" USING gin (name gin_trgm_ops);
      `);
    } else {
      console.log(
        '⚠️  Product table not found, skipping trigram index creation',
      );
      console.log(
        'ℹ️   Trigram index can be created later when Product table exists',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index first
    await queryRunner.query('DROP INDEX IF EXISTS idx_product_name_trgm;');

    // Note: We don't drop the extension as it might be used by other tables
    // If you really need to drop it, uncomment the line below
    // await queryRunner.query('DROP EXTENSION IF EXISTS pg_trgm;');
  }
}
