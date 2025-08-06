import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFirstLastNameFields1753995762764 implements MigrationInterface {
  name = 'AddFirstLastNameFields1753995762764';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add first_name and last_name columns
    await queryRunner.query(
      `ALTER TABLE "User" ADD "first_name" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "User" ADD "last_name" character varying`,
    );

    // Migrate existing displayName data to first_name and last_name
    await queryRunner.query(`
            UPDATE "User" 
            SET 
                "first_name" = CASE 
                    WHEN "display_name" IS NOT NULL AND trim("display_name") != '' THEN
                        trim(split_part(trim("display_name"), ' ', 1))
                    ELSE NULL
                END,
                "last_name" = CASE 
                    WHEN "display_name" IS NOT NULL AND trim("display_name") != '' AND array_length(string_to_array(trim("display_name"), ' '), 1) > 1 THEN
                        trim(substr("display_name", length(split_part(trim("display_name"), ' ', 1)) + 2))
                    ELSE NULL
                END
            WHERE "display_name" IS NOT NULL AND trim("display_name") != ''
        `);

    // Remove the old display_name column
    await queryRunner.query(`ALTER TABLE "User" DROP COLUMN "display_name"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back display_name column
    await queryRunner.query(
      `ALTER TABLE "User" ADD "display_name" character varying`,
    );

    // Migrate data back from first_name and last_name to display_name
    await queryRunner.query(`
            UPDATE "User" 
            SET "display_name" = CASE 
                WHEN "first_name" IS NOT NULL AND "last_name" IS NOT NULL THEN
                    CONCAT("first_name", ' ', "last_name")
                WHEN "first_name" IS NOT NULL THEN
                    "first_name"
                WHEN "last_name" IS NOT NULL THEN
                    "last_name"
                ELSE NULL
            END
            WHERE "first_name" IS NOT NULL OR "last_name" IS NOT NULL
        `);

    // Drop the new columns
    await queryRunner.query(`ALTER TABLE "User" DROP COLUMN "last_name"`);
    await queryRunner.query(`ALTER TABLE "User" DROP COLUMN "first_name"`);
  }
}
