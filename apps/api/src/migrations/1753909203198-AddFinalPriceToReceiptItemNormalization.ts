import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFinalPriceToReceiptItemNormalization1753909203198
  implements MigrationInterface
{
  name = 'AddFinalPriceToReceiptItemNormalization1753909203198';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Helper function to safely drop index if it exists
    const dropIndexIfExists = async (indexName: string) => {
      const indexExists = (await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE schemaname = 'public' 
          AND indexname = '${indexName}'
        );
      `)) as [{ exists: boolean }];

      if (indexExists[0]?.exists) {
        await queryRunner.query(`DROP INDEX "public"."${indexName}"`);
      }
    };

    // Helper function to safely drop constraint if it exists
    const dropConstraintIfExists = async (
      tableName: string,
      constraintName: string,
    ) => {
      const constraintExists = (await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
          AND constraint_name = '${constraintName}'
        );
      `)) as [{ exists: boolean }];

      if (constraintExists[0]?.exists) {
        await queryRunner.query(
          `ALTER TABLE "${tableName}" DROP CONSTRAINT "${constraintName}"`,
        );
      }
    };

    // Drop foreign key constraints safely
    await dropConstraintIfExists(
      'receipt_item_normalizations',
      'FK_receipt_item_normalization_item',
    );
    await dropConstraintIfExists(
      'receipt_item_normalizations',
      'FK_receipt_item_normalization_product',
    );
    await dropConstraintIfExists(
      'normalized_products',
      'FK_normalized_products_linked_product',
    );
    await dropConstraintIfExists(
      'unprocessed_products',
      'FK_unprocessed_product_normalized_product',
    );

    // Drop indexes safely
    await dropIndexIfExists('IDX_receipt_item_normalization_unique');
    await dropIndexIfExists('IDX_receipt_item_normalization_item');
    await dropIndexIfExists('IDX_receipt_item_normalization_product');
    await dropIndexIfExists('IDX_normalized_products_raw_name');
    await dropIndexIfExists('IDX_normalized_products_merchant');
    await dropIndexIfExists('IDX_normalized_products_normalized_name');
    await dropIndexIfExists('IDX_normalized_products_confidence_score');
    await dropIndexIfExists('IDX_normalized_products_is_discount');
    await dropIndexIfExists('IDX_normalized_products_embedding');
    await dropIndexIfExists('IDX_normalized_products_linked_product_sk');
    await dropIndexIfExists('IDX_normalized_products_confidence_unlinked');
    await dropIndexIfExists('IDX_unprocessed_product_status_created');
    await dropIndexIfExists('IDX_unprocessed_product_reason_status');
    await dropIndexIfExists('IDX_unprocessed_product_merchant');

    // Drop remaining constraints safely
    await dropConstraintIfExists(
      'normalized_products',
      'CHK_confidence_score_range',
    );
    await dropConstraintIfExists('normalized_products', 'UQ_raw_name_merchant');
    await queryRunner.query(
      `ALTER TABLE "receipt_item_normalizations" ADD "final_price" numeric(10,2)`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "receipt_item_normalizations"."final_price" IS 'Final price after applying discounts or fees'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "receipt_item_normalizations"."confidence_score" IS 'Confidence score for this specific match'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "receipt_item_normalizations"."normalization_method" IS 'Method used for normalization (exact_match, ai_generated, etc.)'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "receipt_item_normalizations"."is_selected" IS 'Whether this is the selected normalization for the receipt item'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "receipt_item_normalizations"."similarity_score" IS 'Similarity score if using embedding-based matching'`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" DROP COLUMN "embedding"`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ADD "embedding" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ALTER COLUMN "last_matched_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ALTER COLUMN "last_matched_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ALTER COLUMN "created_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ALTER COLUMN "updated_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" DROP COLUMN "linked_product_sk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ADD "linked_product_sk" integer`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."unprocessed_product_status_enum" RENAME TO "unprocessed_product_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."unprocessed_products_status_enum" AS ENUM('pending_review', 'under_review', 'approved_for_creation', 'rejected', 'processed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "unprocessed_products" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "unprocessed_products" ALTER COLUMN "status" TYPE "public"."unprocessed_products_status_enum" USING "status"::"text"::"public"."unprocessed_products_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "unprocessed_products" ALTER COLUMN "status" SET DEFAULT 'pending_review'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."unprocessed_product_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."unprocessed_product_reason_enum" RENAME TO "unprocessed_product_reason_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."unprocessed_products_reason_enum" AS ENUM('no_barcode_match', 'no_embedding_match', 'low_similarity_score', 'multiple_matches_found', 'user_created_new_item', 'no_suitable_match_found')`,
    );
    await queryRunner.query(
      `ALTER TABLE "unprocessed_products" ALTER COLUMN "reason" TYPE "public"."unprocessed_products_reason_enum" USING "reason"::"text"::"public"."unprocessed_products_reason_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."unprocessed_product_reason_enum_old"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_23de44dbb43853f1b14d2418f5" ON "receipt_item_normalizations" ("normalized_product_sk") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_10b4ad9461a10c3efdae3e7798" ON "receipt_item_normalizations" ("receipt_item_sk") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_055fedcd8632c4b861f017b637" ON "receipt_item_normalizations" ("receipt_item_sk", "normalized_product_sk") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ccd63d0fe22190bef5fa2ad73f" ON "normalized_products" ("raw_name", "merchant") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2be41c838a5d8ccbadb33f9e7d" ON "unprocessed_products" ("merchant") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8aa4eaa5147c6de344bda3f01d" ON "unprocessed_products" ("reason", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_05315c0f3d0f2b3d01c2c2b7eb" ON "unprocessed_products" ("status", "created_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ADD CONSTRAINT "CHK_11389528bf377235119bb858db" CHECK ("confidence_score" >= 0 AND "confidence_score" <= 1)`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_item_normalizations" ADD CONSTRAINT "FK_10b4ad9461a10c3efdae3e7798e" FOREIGN KEY ("receipt_item_sk") REFERENCES "ReceiptItem"("receiptitem_sk") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_item_normalizations" ADD CONSTRAINT "FK_23de44dbb43853f1b14d2418f53" FOREIGN KEY ("normalized_product_sk") REFERENCES "normalized_products"("normalized_product_sk") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ADD CONSTRAINT "FK_8988cdcae12e54d0c88e196ad38" FOREIGN KEY ("linked_product_sk") REFERENCES "Product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "unprocessed_products" ADD CONSTRAINT "FK_f60e47db84d583439510fc7dfcf" FOREIGN KEY ("normalized_product_sk") REFERENCES "normalized_products"("normalized_product_sk") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "unprocessed_products" DROP CONSTRAINT "FK_f60e47db84d583439510fc7dfcf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" DROP CONSTRAINT "FK_8988cdcae12e54d0c88e196ad38"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_item_normalizations" DROP CONSTRAINT "FK_23de44dbb43853f1b14d2418f53"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_item_normalizations" DROP CONSTRAINT "FK_10b4ad9461a10c3efdae3e7798e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" DROP CONSTRAINT "CHK_11389528bf377235119bb858db"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_05315c0f3d0f2b3d01c2c2b7eb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8aa4eaa5147c6de344bda3f01d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2be41c838a5d8ccbadb33f9e7d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ccd63d0fe22190bef5fa2ad73f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_055fedcd8632c4b861f017b637"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_10b4ad9461a10c3efdae3e7798"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_23de44dbb43853f1b14d2418f5"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."unprocessed_product_reason_enum_old" AS ENUM('no_barcode_match', 'no_embedding_match', 'low_similarity_score', 'multiple_matches_found', 'user_created_new_item')`,
    );
    await queryRunner.query(
      `ALTER TABLE "unprocessed_products" ALTER COLUMN "reason" TYPE "public"."unprocessed_product_reason_enum_old" USING "reason"::"text"::"public"."unprocessed_product_reason_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."unprocessed_products_reason_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."unprocessed_product_reason_enum_old" RENAME TO "unprocessed_product_reason_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."unprocessed_product_status_enum_old" AS ENUM('pending_review', 'under_review', 'approved_for_creation', 'rejected', 'processed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "unprocessed_products" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "unprocessed_products" ALTER COLUMN "status" TYPE "public"."unprocessed_product_status_enum_old" USING "status"::"text"::"public"."unprocessed_product_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "unprocessed_products" ALTER COLUMN "status" SET DEFAULT 'pending_review'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."unprocessed_products_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."unprocessed_product_status_enum_old" RENAME TO "unprocessed_product_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" DROP COLUMN "linked_product_sk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ADD "linked_product_sk" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ALTER COLUMN "updated_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ALTER COLUMN "created_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ALTER COLUMN "last_matched_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ALTER COLUMN "last_matched_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" DROP COLUMN "embedding"`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ADD "embedding" vector`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "receipt_item_normalizations"."similarity_score" IS NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "receipt_item_normalizations"."is_selected" IS NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "receipt_item_normalizations"."normalization_method" IS NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "receipt_item_normalizations"."confidence_score" IS NULL`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "receipt_item_normalizations"."final_price" IS 'Final price after applying discounts or fees'`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_item_normalizations" DROP COLUMN "final_price"`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ADD CONSTRAINT "UQ_raw_name_merchant" UNIQUE ("merchant", "raw_name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ADD CONSTRAINT "CHK_confidence_score_range" CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (1)::numeric)))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unprocessed_product_merchant" ON "unprocessed_products" ("merchant") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unprocessed_product_reason_status" ON "unprocessed_products" ("reason", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unprocessed_product_status_created" ON "unprocessed_products" ("created_at", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_normalized_products_confidence_unlinked" ON "normalized_products" ("confidence_score", "linked_product_sk") WHERE ((linked_product_sk IS NULL) AND (confidence_score >= 0.80))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_normalized_products_linked_product_sk" ON "normalized_products" ("linked_product_sk") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_normalized_products_embedding" ON "normalized_products" ("embedding") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_normalized_products_is_discount" ON "normalized_products" ("is_discount") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_normalized_products_confidence_score" ON "normalized_products" ("confidence_score") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_normalized_products_normalized_name" ON "normalized_products" ("normalized_name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_normalized_products_merchant" ON "normalized_products" ("merchant") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_normalized_products_raw_name" ON "normalized_products" ("raw_name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_receipt_item_normalization_product" ON "receipt_item_normalizations" ("normalized_product_sk") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_receipt_item_normalization_item" ON "receipt_item_normalizations" ("receipt_item_sk") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_receipt_item_normalization_unique" ON "receipt_item_normalizations" ("normalized_product_sk", "receipt_item_sk") `,
    );
    await queryRunner.query(
      `ALTER TABLE "unprocessed_products" ADD CONSTRAINT "FK_unprocessed_product_normalized_product" FOREIGN KEY ("normalized_product_sk") REFERENCES "normalized_products"("normalized_product_sk") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ADD CONSTRAINT "FK_normalized_products_linked_product" FOREIGN KEY ("linked_product_sk") REFERENCES "Product"("product_sk") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_item_normalizations" ADD CONSTRAINT "FK_receipt_item_normalization_product" FOREIGN KEY ("normalized_product_sk") REFERENCES "normalized_products"("normalized_product_sk") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_item_normalizations" ADD CONSTRAINT "FK_receipt_item_normalization_item" FOREIGN KEY ("receipt_item_sk") REFERENCES "ReceiptItem"("receiptitem_sk") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
