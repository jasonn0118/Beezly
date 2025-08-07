import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixEmbeddingColumnType1753912800000 implements MigrationInterface {
  name = 'FixEmbeddingColumnType1753912800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if pgvector extension is available
    const extensionExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM pg_extension 
        WHERE extname = 'vector'
      );
    `)) as [{ exists: boolean }];

    if (!extensionExists[0].exists) {
      console.log(
        'pgvector extension not available. Keeping text-based embedding storage.',
      );
      return;
    }

    // Step 1: Check if the column is already vector type
    const columnInfo = (await queryRunner.query(`
      SELECT data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'normalized_products' 
        AND column_name = 'embedding'
    `)) as [{ data_type: string; udt_name: string }];

    if (columnInfo[0]?.udt_name === 'vector') {
      console.log(
        'Embedding column is already vector type. No changes needed.',
      );
      return;
    }

    console.log('Converting embedding column from text to vector(1536)...');

    // Step 2: Add a temporary vector column
    await queryRunner.query(`
      ALTER TABLE "normalized_products" 
      ADD COLUMN "embedding_vector_temp" vector(1536)
    `);

    // Step 3: Convert existing text data to vector format
    // Handle both JSON array format and PostgreSQL vector format
    await queryRunner.query(`
      UPDATE "normalized_products" 
      SET "embedding_vector_temp" = CASE
        -- Handle JSON array format: [0.1,0.2,0.3,...]
        WHEN "embedding" IS NOT NULL AND "embedding" ~ '^\\[.*\\]$' THEN
          ("embedding"::text)::vector
        -- Handle PostgreSQL vector format: already in correct format
        WHEN "embedding" IS NOT NULL AND "embedding" ~ '^\\(.*\\)$' THEN
          ("embedding"::text)::vector
        -- Handle malformed or empty data
        ELSE NULL
      END
      WHERE "embedding" IS NOT NULL
    `);

    // Step 4: Drop the old text column
    await queryRunner.query(`
      ALTER TABLE "normalized_products" 
      DROP COLUMN "embedding"
    `);

    // Step 5: Rename the temporary column to the original name
    await queryRunner.query(`
      ALTER TABLE "normalized_products" 
      RENAME COLUMN "embedding_vector_temp" TO "embedding"
    `);

    // Step 6: Create a basic index for efficient similarity searches
    // Note: We use a simple index since CONCURRENTLY and HNSW can't be used in transactions
    try {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_normalized_products_embedding_cosine" 
        ON "normalized_products" 
        USING ivfflat ("embedding" vector_cosine_ops)
        WITH (lists = 100)
      `);
      console.log('Created IVFFlat index for embedding similarity searches');
    } catch (error) {
      console.warn(
        'Could not create IVFFlat index, pgvector may not be fully configured:',
        error,
      );
    }

    console.log('Successfully converted embedding column to vector(1536) type');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Reverting embedding column from vector back to text...');

    // Step 1: Add temporary text column
    await queryRunner.query(`
      ALTER TABLE "normalized_products" 
      ADD COLUMN "embedding_text_temp" text
    `);

    // Step 2: Convert vector data back to text format
    await queryRunner.query(`
      UPDATE "normalized_products" 
      SET "embedding_text_temp" = CASE
        WHEN "embedding" IS NOT NULL THEN
          '[' || array_to_string("embedding"::real[], ',') || ']'
        ELSE NULL
      END
      WHERE "embedding" IS NOT NULL
    `);

    // Step 3: Drop vector column and indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_normalized_products_embedding_cosine"
    `);
    await queryRunner.query(`
      ALTER TABLE "normalized_products" 
      DROP COLUMN "embedding"
    `);

    // Step 4: Rename temporary column back
    await queryRunner.query(`
      ALTER TABLE "normalized_products" 
      RENAME COLUMN "embedding_text_temp" TO "embedding"
    `);

    console.log('Successfully reverted embedding column to text type');
  }
}
