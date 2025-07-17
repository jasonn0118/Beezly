import { AppDataSource } from './data-source';

interface MigrationTestResult {
  success: boolean;
  errors: string[];
  details: {
    tablesCreated: string[];
    indexesCreated: string[];
    postgisEnabled: boolean;
    foreignKeysCreated: number;
  };
}

async function testMigration(): Promise<MigrationTestResult> {
  const result: MigrationTestResult = {
    success: false,
    errors: [],
    details: {
      tablesCreated: [],
      indexesCreated: [],
      postgisEnabled: false,
      foreignKeysCreated: 0,
    },
  };

  try {
    console.log('🚀 Starting migration test...\n');

    // Initialize connection
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    const queryRunner = AppDataSource.createQueryRunner();

    try {
      // Check if PostGIS is available
      try {
        const postgisVersion = (await queryRunner.query(
          'SELECT postgis_version() as version',
        )) as [{ version: string }];
        result.details.postgisEnabled = true;
        console.log(
          `✅ PostGIS enabled: ${postgisVersion[0].version.split(' ')[0]}`,
        );
      } catch {
        result.errors.push('PostGIS extension not available');
        console.log('❌ PostGIS not available');
      }

      // Verify all tables exist
      const tables = (await queryRunner.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `)) as [{ table_name: string }];

      const expectedTables = [
        'Badges',
        'Category',
        'Price',
        'Product',
        'Receipt',
        'ReceiptItem',
        'Score_type',
        'Store',
        'User',
        'User_badges',
        'User_score',
        'Verification_logs',
        'migrations',
      ];

      result.details.tablesCreated = tables.map((t) => t.table_name);
      console.log(`📊 Tables found: ${result.details.tablesCreated.length}`);

      const missingTables = expectedTables.filter(
        (table) => !result.details.tablesCreated.includes(table),
      );
      if (missingTables.length > 0) {
        result.errors.push(`Missing tables: ${missingTables.join(', ')}`);
      }

      // Verify indexes
      const indexes = (await queryRunner.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename != 'migrations'
        ORDER BY indexname
      `)) as [{ indexname: string }];

      result.details.indexesCreated = indexes.map((i) => i.indexname);
      console.log(`📍 Indexes found: ${result.details.indexesCreated.length}`);

      // Check for geospatial index
      const geoIndex = result.details.indexesCreated.find((index) =>
        index.includes('location'),
      );
      if (geoIndex) {
        console.log(`✅ Geospatial index found: ${geoIndex}`);
      } else {
        result.errors.push('Geospatial index missing');
      }

      // Verify foreign keys
      const foreignKeys = (await queryRunner.query(`
        SELECT COUNT(*) as count
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_schema = 'public'
      `)) as [{ count: string }];

      result.details.foreignKeysCreated = parseInt(foreignKeys[0].count, 10);
      console.log(
        `🔗 Foreign key constraints: ${result.details.foreignKeysCreated}`,
      );

      if (result.details.foreignKeysCreated < 8) {
        result.errors.push(
          `Expected at least 8 foreign keys, found ${result.details.foreignKeysCreated}`,
        );
      }

      // Test PostGIS functionality
      if (result.details.postgisEnabled) {
        try {
          const pointTest = (await queryRunner.query(`
            SELECT ST_AsText(ST_Point(-122.4194, 37.7749)) as point
          `)) as [{ point: string }];
          console.log(`✅ PostGIS point test: ${pointTest[0].point}`);

          // Test the geospatial index with a sample query
          await queryRunner.query(`
            EXPLAIN ANALYZE SELECT * FROM "Store" 
            WHERE ST_DWithin(
              ST_Point(longitude, latitude), 
              ST_Point(-122.4194, 37.7749), 
              1000
            ) 
            AND latitude IS NOT NULL 
            AND longitude IS NOT NULL
          `);
          console.log('✅ Geospatial query test passed');
        } catch (error) {
          result.errors.push(`PostGIS functionality test failed: ${error}`);
        }
      }

      // Test sample data insertion and querying
      try {
        console.log('\n🧪 Testing data operations...');

        // Insert test user
        const userResult = (await queryRunner.query(`
          INSERT INTO "User" (email, password_hash, display_name) 
          VALUES ('test@example.com', 'hashed_password', 'Test User') 
          RETURNING user_sk
        `)) as [{ user_sk: string }];
        const userSk = userResult[0].user_sk;

        // Insert test store
        const storeResult = (await queryRunner.query(`
          INSERT INTO "Store" (name, address, latitude, longitude) 
          VALUES ('Test Store', '123 Test St', 37.7749, -122.4194) 
          RETURNING store_sk
        `)) as [{ store_sk: string }];
        const storeSk = storeResult[0].store_sk;

        // Insert test receipt
        (await queryRunner.query(
          `
          INSERT INTO "Receipt" (user_sk, store_sk, status) 
          VALUES ($1, $2, 'pending') 
          RETURNING receipt_sk
        `,
          [userSk, storeSk],
        )) as [{ receipt_sk: string }];

        console.log('✅ Test data insertion successful');

        // Clean up test data
        await queryRunner.query('DELETE FROM "Receipt" WHERE user_sk = $1', [
          userSk,
        ]);
        await queryRunner.query('DELETE FROM "Store" WHERE store_sk = $1', [
          storeSk,
        ]);
        await queryRunner.query('DELETE FROM "User" WHERE user_sk = $1', [
          userSk,
        ]);

        console.log('✅ Test data cleanup successful');
      } catch (error) {
        result.errors.push(`Data operations test failed: ${error}`);
      }

      result.success = result.errors.length === 0;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    result.errors.push(`Database connection failed: ${error}`);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }

  return result;
}

async function main() {
  console.log('🔬 Migration Test Suite\n');

  const result = await testMigration();

  console.log('\n📋 Test Summary:');
  console.log(`Success: ${result.success ? '✅' : '❌'}`);
  console.log(`Tables created: ${result.details.tablesCreated.length}`);
  console.log(`Indexes created: ${result.details.indexesCreated.length}`);
  console.log(`Foreign keys: ${result.details.foreignKeysCreated}`);
  console.log(
    `PostGIS enabled: ${result.details.postgisEnabled ? '✅' : '❌'}`,
  );

  if (result.errors.length > 0) {
    console.log('\n❌ Errors found:');
    result.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 All migration tests passed!');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

export { MigrationTestResult, testMigration };
