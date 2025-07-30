import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixLinkedProductSkTypeToUuid1753911308408
  implements MigrationInterface
{
  name = 'FixLinkedProductSkTypeToUuid1753911308408';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint first
    await queryRunner.query(
      `ALTER TABLE "normalized_products" DROP CONSTRAINT IF EXISTS "FK_8988cdcae12e54d0c88e196ad38"`,
    );

    // Drop and recreate the column with UUID type
    await queryRunner.query(
      `ALTER TABLE "normalized_products" DROP COLUMN "linked_product_sk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ADD "linked_product_sk" uuid`,
    );

    // Recreate foreign key constraint to Product.product_sk (UUID)
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ADD CONSTRAINT "FK_8988cdcae12e54d0c88e196ad38" FOREIGN KEY ("linked_product_sk") REFERENCES "Product"("product_sk") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint first
    await queryRunner.query(
      `ALTER TABLE "normalized_products" DROP CONSTRAINT "FK_8988cdcae12e54d0c88e196ad38"`,
    );

    // Drop and recreate the column with integer type
    await queryRunner.query(
      `ALTER TABLE "normalized_products" DROP COLUMN "linked_product_sk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ADD "linked_product_sk" integer`,
    );

    // Recreate foreign key constraint to Product.id (integer) - for rollback
    await queryRunner.query(
      `ALTER TABLE "normalized_products" ADD CONSTRAINT "FK_8988cdcae12e54d0c88e196ad38" FOREIGN KEY ("linked_product_sk") REFERENCES "Product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}