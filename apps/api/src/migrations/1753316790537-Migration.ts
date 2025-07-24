/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1753316790537 implements MigrationInterface {
  name = 'Migration1753316790537';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if constraint exists before dropping it
    const constraintExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'FK_41185546107ec4b4774da68df2f' 
      AND table_name = 'Category'
    `);

    if (constraintExists.length > 0) {
      await queryRunner.query(
        `ALTER TABLE "Category" DROP CONSTRAINT "FK_41185546107ec4b4774da68df2f"`,
      );
    }

    // Check if columns exist before dropping them
    const columnsToCheck = ['parent_id', 'level', 'use_yn', 'name', 'slug'];
    for (const column of columnsToCheck) {
      const columnExists = await queryRunner.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Category' AND column_name = '${column}'
      `);

      if (columnExists.length > 0) {
        await queryRunner.query(
          `ALTER TABLE "Category" DROP COLUMN "${column}"`,
        );
      }
    }

    // Check if columns exist before adding them
    const newColumnsToCheck = ['category1', 'category2', 'category3'];
    for (const column of newColumnsToCheck) {
      const columnExists = await queryRunner.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Category' AND column_name = '${column}'
      `);

      if (columnExists.length === 0) {
        await queryRunner.query(`ALTER TABLE "Category" ADD "${column}" text`);
      }
    }

    // Check if brandName column exists before adding it
    const brandNameExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'Product' AND column_name = 'brandName'
    `);

    if (brandNameExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "Product" ADD "brandName" character varying`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if brandName column exists before dropping it
    const brandNameExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'Product' AND column_name = 'brandName'
    `);

    if (brandNameExists.length > 0) {
      await queryRunner.query(`ALTER TABLE "Product" DROP COLUMN "brandName"`);
    }

    // Check if new category columns exist before dropping them
    const newColumnsToCheck = ['category3', 'category2', 'category1'];
    for (const column of newColumnsToCheck) {
      const columnExists = await queryRunner.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Category' AND column_name = '${column}'
      `);

      if (columnExists.length > 0) {
        await queryRunner.query(
          `ALTER TABLE "Category" DROP COLUMN "${column}"`,
        );
      }
    }

    // Check if old columns exist before adding them back
    const oldColumnsToRestore = [
      { name: 'slug', type: 'text' },
      { name: 'name', type: 'text' },
      { name: 'use_yn', type: 'boolean' },
      { name: 'level', type: 'bigint' },
      { name: 'parent_id', type: 'integer' },
    ];

    for (const column of oldColumnsToRestore) {
      const columnExists = await queryRunner.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Category' AND column_name = '${column.name}'
      `);

      if (columnExists.length === 0) {
        await queryRunner.query(
          `ALTER TABLE "Category" ADD "${column.name}" ${column.type}`,
        );
      }
    }

    // Check if constraint exists before adding it back
    const constraintExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'FK_41185546107ec4b4774da68df2f' 
      AND table_name = 'Category'
    `);

    if (constraintExists.length === 0) {
      // Also check if parent_id column exists (required for the constraint)
      const parentIdExists = await queryRunner.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Category' AND column_name = 'parent_id'
      `);

      if (parentIdExists.length > 0) {
        await queryRunner.query(
          `ALTER TABLE "Category" ADD CONSTRAINT "FK_41185546107ec4b4774da68df2f" FOREIGN KEY ("parent_id") REFERENCES "Category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
      }
    }
  }
}
