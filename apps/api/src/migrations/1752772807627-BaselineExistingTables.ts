import { MigrationInterface, QueryRunner } from 'typeorm';

export class BaselineExistingTables1752772807627 implements MigrationInterface {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async up(_queryRunner: QueryRunner): Promise<void> {
    // This is a baseline migration for existing Supabase tables
    // No operations are performed as the tables already exist in Supabase
    // This migration serves as a starting point for future migrations
    // To mark this migration as applied without running it, execute:
    // INSERT INTO migrations (timestamp, name) VALUES (1752772807627, 'BaselineExistingTables1752772807627');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Baseline migration - no reversal needed
    // WARNING: Do not drop existing tables here
  }
}
