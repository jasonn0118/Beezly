import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1753316790537 implements MigrationInterface {
  name = 'Migration1753316790537';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Category" DROP CONSTRAINT "FK_41185546107ec4b4774da68df2f"`,
    );
    await queryRunner.query(`ALTER TABLE "Category" DROP COLUMN "parent_id"`);
    await queryRunner.query(`ALTER TABLE "Category" DROP COLUMN "level"`);
    await queryRunner.query(`ALTER TABLE "Category" DROP COLUMN "use_yn"`);
    await queryRunner.query(`ALTER TABLE "Category" DROP COLUMN "name"`);
    await queryRunner.query(`ALTER TABLE "Category" DROP COLUMN "slug"`);
    await queryRunner.query(`ALTER TABLE "Category" ADD "category1" text`);
    await queryRunner.query(`ALTER TABLE "Category" ADD "category2" text`);
    await queryRunner.query(`ALTER TABLE "Category" ADD "category3" text`);
    await queryRunner.query(
      `ALTER TABLE "Product" ADD "brandName" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "Product" DROP COLUMN "brandName"`);
    await queryRunner.query(`ALTER TABLE "Category" DROP COLUMN "category3"`);
    await queryRunner.query(`ALTER TABLE "Category" DROP COLUMN "category2"`);
    await queryRunner.query(`ALTER TABLE "Category" DROP COLUMN "category1"`);
    await queryRunner.query(`ALTER TABLE "Category" ADD "slug" text`);
    await queryRunner.query(`ALTER TABLE "Category" ADD "name" text`);
    await queryRunner.query(`ALTER TABLE "Category" ADD "use_yn" boolean`);
    await queryRunner.query(`ALTER TABLE "Category" ADD "level" bigint`);
    await queryRunner.query(`ALTER TABLE "Category" ADD "parent_id" integer`);
    await queryRunner.query(
      `ALTER TABLE "Category" ADD CONSTRAINT "FK_41185546107ec4b4774da68df2f" FOREIGN KEY ("parent_id") REFERENCES "Category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
