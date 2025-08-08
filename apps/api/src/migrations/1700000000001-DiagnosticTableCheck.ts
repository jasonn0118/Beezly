import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Diagnostic Migration - Table Creation Verification
 *
 * This migration runs immediately after InitialSchema to diagnose
 * exactly what tables were created and which ones are missing.
 */
export class DiagnosticTableCheck1700000000001 implements MigrationInterface {
  name = 'DiagnosticTableCheck1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log(
      '🔍 DIAGNOSTIC: Checking table creation after InitialSchema...',
    );

    const expectedTables = [
      'Store',
      'Category',
      'Product',
      'ReceiptItem',
      'Receipt',
      'User',
      'User_badges',
      'Badges',
      'User_score',
      'Score_type',
      'Price',
      'Verification_logs',
      'typeorm_metadata',
    ];

    const existingTables = (await queryRunner.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)) as { table_name: string }[];

    console.log('📊 DIAGNOSTIC RESULTS:');
    console.log(`   Found ${existingTables.length} total tables`);

    const foundTableNames = existingTables.map((t) => t.table_name);
    console.log('   Existing tables:', foundTableNames.join(', '));

    console.log('\n📋 Expected vs Actual:');
    let missingCount = 0;
    let foundCount = 0;

    for (const expected of expectedTables) {
      const found = foundTableNames.includes(expected);
      if (found) {
        console.log(`   ✅ ${expected}`);
        foundCount++;
      } else {
        console.log(`   ❌ ${expected} - MISSING`);
        missingCount++;
      }
    }

    console.log(
      `\n📈 Summary: ${foundCount}/${expectedTables.length} expected tables found`,
    );

    if (missingCount > 0) {
      console.log(
        `🚨 WARNING: ${missingCount} tables missing from InitialSchema`,
      );
      console.log(
        '   This indicates InitialSchema failed to create complete schema',
      );
    } else {
      console.log(
        '✅ All expected tables found - InitialSchema worked correctly',
      );
    }

    // Also check for unexpected tables
    const unexpectedTables = foundTableNames.filter(
      (name) =>
        !expectedTables.includes(name) &&
        name !== 'migrations' &&
        !name.startsWith('typeorm_'),
    );

    if (unexpectedTables.length > 0) {
      console.log(
        `ℹ️  Found ${unexpectedTables.length} additional tables: ${unexpectedTables.join(', ')}`,
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public down(_queryRunner: QueryRunner): Promise<void> {
    // This is a diagnostic migration - no rollback needed
    console.log('🔍 Diagnostic migration rollback - no action needed');
    return Promise.resolve();
  }
}
