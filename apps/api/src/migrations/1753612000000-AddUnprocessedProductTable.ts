import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnprocessedProductTable1753612000000
  implements MigrationInterface
{
  name = 'AddUnprocessedProductTable1753612000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types first
    await queryRunner.query(`
      CREATE TYPE "unprocessed_product_status_enum" AS ENUM (
        'pending_review',
        'under_review', 
        'approved_for_creation',
        'rejected',
        'processed'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "unprocessed_product_reason_enum" AS ENUM (
        'no_barcode_match',
        'no_embedding_match',
        'low_similarity_score',
        'multiple_matches_found',
        'user_created_new_item'
      )
    `);

    // Create the unprocessed_products table
    await queryRunner.query(`
      CREATE TABLE "unprocessed_products" (
        "unprocessed_product_sk" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "normalized_product_sk" uuid NOT NULL,
        "raw_name" text NOT NULL,
        "normalized_name" text NOT NULL,
        "brand" text,
        "category" text,
        "merchant" text NOT NULL,
        "confidence_score" numeric(5,4) NOT NULL,
        "status" "unprocessed_product_status_enum" NOT NULL DEFAULT 'pending_review',
        "reason" "unprocessed_product_reason_enum" NOT NULL,
        "item_code" text,
        "suggested_barcode" text,
        "review_notes" text,
        "reviewer_id" uuid,
        "reviewed_at" TIMESTAMP WITH TIME ZONE,
        "created_product_sk" uuid,
        "occurrence_count" integer NOT NULL DEFAULT 1,
        "priority_score" numeric(5,2) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_unprocessed_product_sk" PRIMARY KEY ("unprocessed_product_sk")
      )
    `);

    // Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX "IDX_unprocessed_product_status_created" 
      ON "unprocessed_products" ("status", "created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_unprocessed_product_reason_status" 
      ON "unprocessed_products" ("reason", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_unprocessed_product_merchant" 
      ON "unprocessed_products" ("merchant")
    `);

    // Add foreign key constraint to normalized_products
    await queryRunner.query(`
      ALTER TABLE "unprocessed_products" 
      ADD CONSTRAINT "FK_unprocessed_product_normalized_product" 
      FOREIGN KEY ("normalized_product_sk") 
      REFERENCES "normalized_products"("normalized_product_sk") 
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the table and constraints
    await queryRunner.query(`DROP TABLE "unprocessed_products"`);

    // Drop the enum types
    await queryRunner.query(`DROP TYPE "unprocessed_product_status_enum"`);
    await queryRunner.query(`DROP TYPE "unprocessed_product_reason_enum"`);
  }
}
