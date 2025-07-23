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

    // Create the normalized_products table
    await queryRunner.query(`
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
    `);

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

    console.log('normalized_products table created successfully.');
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
