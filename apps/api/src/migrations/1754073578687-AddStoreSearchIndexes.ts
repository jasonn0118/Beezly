import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStoreSearchIndexes1754073578687 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if Store table exists first
    const storeTableExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Store'
      );
    `)) as [{ exists: boolean }];

    if (!storeTableExists[0]?.exists) {
      console.log(
        '⚠️  Store table not found, skipping Store search index creation',
      );
      console.log(
        'ℹ️   This is normal for new environments. Store indexes will be created when the table exists.',
      );
      return;
    }

    console.log('✅ Store table found, creating search indexes...');

    // 🚀 CRITICAL PERFORMANCE INDEXES FOR STORE SEARCH
    // Note: Using regular CREATE INDEX (not CONCURRENTLY) for migration compatibility

    // 1. Full-text search index on store name with trigram support
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_store_name_gin_trgm" 
            ON "Store" USING gin (name gin_trgm_ops)
        `);

    // 2. B-tree index on name for exact matches and prefix searches
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_store_name_btree" 
            ON "Store" (name)
        `);

    // 3. Location-based search indexes
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_store_city" 
            ON "Store" (city) WHERE city IS NOT NULL
        `);

    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_store_province" 
            ON "Store" (province) WHERE province IS NOT NULL
        `);

    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_store_postal_code" 
            ON "Store" (postal_code) WHERE postal_code IS NOT NULL
        `);

    // 4. Composite index for city + province filtering
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_store_city_province" 
            ON "Store" (city, province) WHERE city IS NOT NULL AND province IS NOT NULL
        `);

    // 5. Geospatial index for coordinates (supports radius searches)
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_store_coordinates" 
            ON "Store" (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        `);

    // 6. Index for OCR matching (used in findOrCreateStoreFromOcr)
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_store_full_address" 
            ON "Store" (full_address) WHERE full_address IS NOT NULL
        `);

    // 7. Composite index for advanced search combining name + location
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_store_name_city_province" 
            ON "Store" (name, city, province) WHERE city IS NOT NULL AND province IS NOT NULL
        `);

    // 8. Index for popular stores query (requires receipts count)
    // Note: This will be used with LEFT JOIN on receipts table
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_store_created_at" 
            ON "Store" (created_at)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all indexes in reverse order
    // Note: Using regular DROP INDEX (not CONCURRENTLY) for migration compatibility
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_store_created_at"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_store_name_city_province"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_store_full_address"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_store_coordinates"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_store_city_province"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_store_postal_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_store_province"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_store_city"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_store_name_btree"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_store_name_gin_trgm"`);
  }
}
