import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCountryRegionToStore1753477797042
  implements MigrationInterface
{
  name = 'AddCountryRegionToStore1753477797042';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Store" ADD "country_region" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "Store" DROP COLUMN "country_region"`);
  }
}
