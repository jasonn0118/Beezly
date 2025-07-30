import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropDuplicateTrgmIndex1753750994708 implements MigrationInterface {
  name = 'DropDuplicateTrgmIndex1753750994708';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_product_name_trgm"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "idx_product_name_trgm" ON "Product" ("name") `,
    );
  }
}
