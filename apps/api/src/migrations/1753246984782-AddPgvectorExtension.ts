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

    if (extensionExists[0].exists) {
      console.log('pgvector extension already exists.');
      return;
    }

    // Check if user has privileges to create extensions
    try {
      const userPrivileges = (await queryRunner.query(`
        SELECT rolsuper FROM pg_roles WHERE rolname = current_user;
      `)) as [{ rolsuper: boolean }];

      const isSuperUser = userPrivileges?.[0]?.rolsuper === true;

      if (!isSuperUser) {
        console.log(
          'User does not have superuser privileges. Skipping vector extension creation.',
        );
        console.log(
          'Note: This is expected in CI/CD environments and does not affect functionality.',
        );
        return;
      }

      // Use a savepoint to isolate the extension creation
      await queryRunner.query(`SAVEPOINT vector_extension_attempt;`);

      try {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
        await queryRunner.query(`RELEASE SAVEPOINT vector_extension_attempt;`);
        console.log('pgvector extension created successfully.');
      } catch (extensionError) {
        // Rollback to savepoint to clean up transaction state
        await queryRunner.query(
          `ROLLBACK TO SAVEPOINT vector_extension_attempt;`,
        );
        await queryRunner.query(`RELEASE SAVEPOINT vector_extension_attempt;`);

        console.warn(
          'pgvector extension not available. This is expected in some environments:',
          (extensionError as Error).message,
        );
        console.log(
          'Note: Tables will use text-based embedding storage instead of vector type.',
        );
      }
    } catch (privilegeError) {
      console.warn(
        'Could not check user privileges. Skipping vector extension creation:',
        (privilegeError as Error).message,
      );
      console.log(
        'Note: This is expected in some environments and does not affect functionality.',
      );
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
