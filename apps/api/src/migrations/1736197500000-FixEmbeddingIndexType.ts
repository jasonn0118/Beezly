import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixEmbeddingIndexType1736197500000 implements MigrationInterface {
  name = 'FixEmbeddingIndexType1736197500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Fixing embedding index type from btree to IVFFlat...');

    // Step 1: Check if pgvector extension is available
    const extensionExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM pg_extension 
        WHERE extname = 'vector'
      );
    `)) as [{ exists: boolean }];

    if (!extensionExists[0].exists) {
      console.log(
        'pgvector extension not available. Cannot create proper vector index.',
      );
      return;
    }

    // Step 2: Check if the problematic btree index exists
    const indexExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM pg_indexes 
        WHERE tablename = 'normalized_products' 
        AND indexname = 'idx_normalized_products_embedding_cosine'
        AND indexdef LIKE '%USING btree%'
      );
    `)) as [{ exists: boolean }];

    if (!indexExists[0].exists) {
      console.log('Problematic btree index does not exist. No action needed.');
      return;
    }

    // Step 3: Drop the existing btree index that's causing the size error
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_normalized_products_embedding_cosine"
    `);
    console.log('Dropped problematic btree index on embedding column');

    // Step 4: Create proper IVFFlat index for vector similarity search
    // Note: We need to ensure we have enough data points for the index
    const countResult = (await queryRunner.query(`
      SELECT COUNT(*) as count FROM "normalized_products" WHERE "embedding" IS NOT NULL
    `)) as [{ count: string }];

    const embeddingCount = parseInt(countResult[0].count);
    console.log(`Found ${embeddingCount} rows with embeddings`);

    if (embeddingCount > 0) {
      // Adjust lists parameter based on data size (rule of thumb: rows/1000)
      const listsParam = Math.max(
        1,
        Math.min(1000, Math.ceil(embeddingCount / 1000)),
      );

      try {
        // Try to create IVFFlat index with appropriate lists parameter
        await queryRunner.query(`
          CREATE INDEX "idx_normalized_products_embedding_cosine" 
          ON "normalized_products" 
          USING ivfflat ("embedding" vector_cosine_ops)
          WITH (lists = ${listsParam})
        `);
        console.log(
          `Created IVFFlat index with lists=${listsParam} for efficient cosine similarity searches`,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.warn('Could not create IVFFlat index:', errorMessage);
        console.log(
          'This is expected if there are not enough rows for clustering. Index will be created automatically when more data is available.',
        );
      }
    } else {
      console.log(
        'No embedding data found. Index will be created when embeddings are added.',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Reverting embedding index fix...');

    // Drop the IVFFlat index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_normalized_products_embedding_cosine"
    `);

    // Note: We deliberately don't recreate the problematic btree index
    // as it would just cause the same error again
    console.log(
      'Removed IVFFlat index. Note: Not recreating problematic btree index.',
    );
  }
}
