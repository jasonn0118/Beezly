import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductNormalizationFields1753160046810
  implements MigrationInterface
{
  name = 'AddProductNormalizationFields1753160046810';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if normalized_products table already exists
    const tableExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'normalized_products'
      );
    `)) as [{ exists: boolean }];

    if (tableExists[0].exists) {
      console.log(
        'normalized_products table already exists. Skipping creation.',
      );
      return;
    }

    // Try to enable vector extension if available using transaction isolation
    let hasVectorSupport = false;

    // Check if user has privileges to create extensions
    try {
      const userPrivileges = (await queryRunner.query(`
        SELECT rolsuper FROM pg_roles WHERE rolname = current_user;
      `)) as [{ rolsuper: boolean }];

      const isSuperUser = userPrivileges?.[0]?.rolsuper === true;

      if (!isSuperUser) {
        console.log(
          'User does not have superuser privileges. Skipping vector extension creation.',
        );
        hasVectorSupport = false;
      } else {
        // Use a savepoint to isolate the extension creation
        await queryRunner.query(`SAVEPOINT vector_extension_attempt;`);

        try {
          await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
          await queryRunner.query(
            `RELEASE SAVEPOINT vector_extension_attempt;`,
          );
          hasVectorSupport = true;
          console.log('pgvector extension enabled successfully.');
        } catch (extensionError) {
          // Rollback to savepoint to clean up transaction state
          await queryRunner.query(
            `ROLLBACK TO SAVEPOINT vector_extension_attempt;`,
          );
          await queryRunner.query(
            `RELEASE SAVEPOINT vector_extension_attempt;`,
          );

          console.warn(
            'pgvector extension not available. Creating table without vector column:',
            (extensionError as Error).message,
          );
          hasVectorSupport = false;
        }
      }
    } catch (privilegeError) {
      console.warn(
        'Could not check user privileges. Assuming no vector support:',
        (privilegeError as Error).message,
      );
      hasVectorSupport = false;
    }

    // Create the normalized_products table with conditional vector column
    const createTableQuery = hasVectorSupport
      ? `
        CREATE TABLE "normalized_products" (
          "normalized_product_sk" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "raw_name" text NOT NULL,
          "merchant" text NOT NULL,
          "item_code" text,
          "normalized_name" text NOT NULL,
          "brand" text,
          "category" text,
          "confidence_score" decimal(3,2) NOT NULL,
          "embedding" vector(1536),
          "is_discount" boolean NOT NULL DEFAULT false,
          "is_adjustment" boolean NOT NULL DEFAULT false,
          "match_count" integer NOT NULL DEFAULT 1,
          "last_matched_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
          "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
          "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "CHK_confidence_score_range" CHECK ("confidence_score" >= 0 AND "confidence_score" <= 1),
          CONSTRAINT "UQ_raw_name_merchant" UNIQUE ("raw_name", "merchant")
        );
      `
      : `
        CREATE TABLE "normalized_products" (
          "normalized_product_sk" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "raw_name" text NOT NULL,
          "merchant" text NOT NULL,
          "item_code" text,
          "normalized_name" text NOT NULL,
          "brand" text,
          "category" text,
          "confidence_score" decimal(3,2) NOT NULL,
          "embedding" text,
          "is_discount" boolean NOT NULL DEFAULT false,
          "is_adjustment" boolean NOT NULL DEFAULT false,
          "match_count" integer NOT NULL DEFAULT 1,
          "last_matched_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
          "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
          "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "CHK_confidence_score_range" CHECK ("confidence_score" >= 0 AND "confidence_score" <= 1),
          CONSTRAINT "UQ_raw_name_merchant" UNIQUE ("raw_name", "merchant")
        );
      `;

    await queryRunner.query(createTableQuery);

    // Create indexes for better performance
    await queryRunner.query(`
      CREATE INDEX "IDX_normalized_products_raw_name" ON "normalized_products" ("raw_name");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_normalized_products_merchant" ON "normalized_products" ("merchant");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_normalized_products_normalized_name" ON "normalized_products" ("normalized_name");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_normalized_products_confidence_score" ON "normalized_products" ("confidence_score");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_normalized_products_is_discount" ON "normalized_products" ("is_discount");
    `);

    // Create vector index only if vector support is available
    if (hasVectorSupport) {
      // Use savepoint for vector index creation to avoid transaction issues
      await queryRunner.query(`SAVEPOINT vector_index_attempt;`);

      try {
        // Create index for vector similarity search using IVFFlat
        // Note: This index type is optimal for datasets with more than 1000 vectors
        await queryRunner.query(`
          CREATE INDEX "IDX_normalized_products_embedding" 
          ON "normalized_products" 
          USING ivfflat (embedding vector_cosine_ops)
          WITH (lists = 100);
        `);
        await queryRunner.query(`RELEASE SAVEPOINT vector_index_attempt;`);
        console.log('Vector similarity index created successfully.');
      } catch (indexError) {
        // Rollback to savepoint and create text index as fallback
        await queryRunner.query(`ROLLBACK TO SAVEPOINT vector_index_attempt;`);
        await queryRunner.query(`RELEASE SAVEPOINT vector_index_attempt;`);

        console.warn(
          'Failed to create vector index. Will use regular text index:',
          (indexError as Error).message,
        );

        // Create a regular text index as fallback
        await queryRunner.query(`
          CREATE INDEX "IDX_normalized_products_embedding_text" ON "normalized_products" ("embedding");
        `);
        console.log('Created text index as fallback for embedding column.');
      }
    } else {
      // Create a regular text index for the embedding column
      await queryRunner.query(`
        CREATE INDEX "IDX_normalized_products_embedding_text" ON "normalized_products" ("embedding");
      `);
      console.log(
        'Created text index for embedding column (vector not available).',
      );
    }

    const setupType = hasVectorSupport
      ? 'with vector support'
      : 'with text-based embedding';
    console.log(`normalized_products table created successfully ${setupType}.`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if normalized_products table exists before trying to drop it
    const tableExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'normalized_products'
      );
    `)) as [{ exists: boolean }];

    if (!tableExists[0].exists) {
      console.log(
        'normalized_products table does not exist. Skipping removal.',
      );
      return;
    }

    // Drop the table (indexes will be dropped automatically)
    await queryRunner.query(`DROP TABLE "normalized_products"`);

    console.log('normalized_products table dropped successfully.');
  }
}
