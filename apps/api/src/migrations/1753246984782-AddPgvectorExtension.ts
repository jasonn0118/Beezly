import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPgvectorExtension1753246984782 implements MigrationInterface {
  name = 'AddPgvectorExtension1753246984782';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the pgvector extension already exists
    const extensionExists = (await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM pg_extension 
        WHERE extname = 'vector'
      );
    `)) as [{ exists: boolean }];

    if (!extensionExists[0].exists) {
      // Create the pgvector extension
      await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
      console.log('pgvector extension created successfully.');
    } else {
      console.log('pgvector extension already exists.');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public down(_queryRunner: QueryRunner): Promise<void> {
    // Note: We typically don't drop extensions in down migrations
    // as they might be used by other tables/applications
    console.log(
      'pgvector extension removal skipped - extensions are typically not removed in migrations.',
    );
    return Promise.resolve();
  }
}
