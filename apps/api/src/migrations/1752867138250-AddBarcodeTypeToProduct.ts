import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBarcodeTypeToProduct1752867138250
  implements MigrationInterface
{
  name = 'AddBarcodeTypeToProduct1752867138250';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."Product_barcode_type_enum" AS ENUM('code39', 'ean8', 'ean13', 'codabar', 'itf14', 'code128', 'upc_a', 'upc_e')`,
    );
    await queryRunner.query(
      `ALTER TABLE "Product" ADD "barcode_type" "public"."Product_barcode_type_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "Product" DROP COLUMN "barcode_type"`);
    await queryRunner.query(`DROP TYPE "public"."Product_barcode_type_enum"`);
  }
}
