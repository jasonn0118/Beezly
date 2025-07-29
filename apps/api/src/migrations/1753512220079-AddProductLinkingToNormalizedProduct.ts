import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductLinkingToNormalizedProduct1753512220079
  implements MigrationInterface
{
  name = 'AddProductLinkingToNormalizedProduct1753512220079';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add product linking columns to normalized_products table
    await queryRunner.query(`
            ALTER TABLE "normalized_products" 
            ADD COLUMN "linked_product_sk" uuid,
            ADD COLUMN "linking_confidence" decimal(5,4),
            ADD COLUMN "linking_method" varchar(50),
            ADD COLUMN "linked_at" timestamp with time zone
        `);

    // Add foreign key constraint
    await queryRunner.query(`
            ALTER TABLE "normalized_products" 
            ADD CONSTRAINT "FK_normalized_products_linked_product" 
            FOREIGN KEY ("linked_product_sk") REFERENCES "Product"("product_sk") ON DELETE SET NULL
        `);

    // Add comments to columns
    await queryRunner.query(`
            COMMENT ON COLUMN "normalized_products"."linking_confidence" IS 'Confidence score for the product link (0-1)';
            COMMENT ON COLUMN "normalized_products"."linking_method" IS 'Method used for linking (barcode_match, embedding_similarity, etc.)';
            COMMENT ON COLUMN "normalized_products"."linked_at" IS 'When the product was linked';
        `);

    // Add index for efficient querying by linked product
    await queryRunner.query(`
            CREATE INDEX "IDX_normalized_products_linked_product_sk" 
            ON "normalized_products" ("linked_product_sk")
        `);

    // Add index for querying unlinked high-confidence products
    // BUSINESS RULE: Only products with confidence_score >= 0.8 are eligible for linking
    await queryRunner.query(`
            CREATE INDEX "IDX_normalized_products_confidence_unlinked" 
            ON "normalized_products" ("confidence_score", "linked_product_sk") 
            WHERE "linked_product_sk" IS NULL AND "confidence_score" >= 0.80
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_normalized_products_confidence_unlinked"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_normalized_products_linked_product_sk"`,
    );

    // Drop foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "normalized_products" DROP CONSTRAINT IF EXISTS "FK_normalized_products_linked_product"`,
    );

    // Drop columns
    await queryRunner.query(`
            ALTER TABLE "normalized_products"
            DROP COLUMN IF EXISTS "linked_at",
            DROP COLUMN IF EXISTS "linking_method",
            DROP COLUMN IF EXISTS "linking_confidence",
            DROP COLUMN IF EXISTS "linked_product_sk"
        `);
  }
}
