import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import {
  User,
  Store,
  Receipt,
  Product,
  ReceiptItem,
  Category,
  Badges,
  ScoreType,
  UserBadges,
  UserScore,
  Price,
  VerificationLogs,
} from './entities';

// Load environment variables (only if not in CI)
if (process.env.NODE_ENV !== 'test' && !process.env.CI) {
  config();
}

// Create dynamic data source that respects current environment
const createDataSource = () => {
  // Determine database name: use postgres for production/CI, beezly_db for local dev
  const dbName =
    process.env.DB_NAME ||
    (process.env.NODE_ENV === 'production' || process.env.CI
      ? 'postgres'
      : 'beezly_db');

  return new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    entities: [
      User,
      Store,
      Receipt,
      Product,
      ReceiptItem,
      Category,
      Badges,
      ScoreType,
      UserBadges,
      UserScore,
      Price,
      VerificationLogs,
    ],
    migrations: ['src/migrations/*.ts'],
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true',
    migrationsRun: false,
    // Force IPv4 if running in CI to avoid IPv6 connectivity issues
    ...(process.env.CI && {
      extra: {
        options:
          '-c tcp_keepalives_idle=20 -c tcp_keepalives_interval=20 -c tcp_keepalives_count=3',
      },
    }),
  });
};

interface TableInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface IndexInfo {
  indexname: string;
  tablename: string;
  indexdef: string;
}

interface ForeignKeyInfo {
  constraint_name: string;
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

async function compareSchemas() {
  console.log('🔍 Starting schema comparison...\n');

  // Debug environment variables
  console.log('🔧 Environment variables:');
  console.log(`DB_HOST: ${process.env.DB_HOST || 'undefined'}`);
  console.log(`DB_PORT: ${process.env.DB_PORT || 'undefined'}`);
  console.log(`DB_USERNAME: ${process.env.DB_USERNAME || 'undefined'}`);
  console.log(`DB_NAME: ${process.env.DB_NAME || 'undefined'}`);
  console.log(`DB_SSL: ${process.env.DB_SSL || 'undefined'}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}\n`);

  const dataSource = createDataSource();

  const host =
    'host' in dataSource.options ? dataSource.options.host : 'unknown';
  console.log(
    `🔌 Connecting to database: ${String(dataSource.options.database || 'unknown')} at ${String(host)}`,
  );

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Get current database schema
    const currentTables = await getCurrentDatabaseSchema(dataSource);
    const currentIndexes = await getCurrentDatabaseIndexes(dataSource);
    const currentForeignKeys = await getCurrentForeignKeys(dataSource);

    // Generate expected schema from TypeORM entities
    await generateExpectedSchema(dataSource);

    console.log('\n📊 Schema Comparison Results:');
    console.log('================================\n');

    // Compare tables and columns
    compareTables(currentTables, dataSource);

    // Show current indexes
    console.log('\n🔗 Current Database Indexes:');
    console.log('----------------------------');
    currentIndexes.forEach((index) => {
      console.log(`${index.tablename}.${index.indexname}: ${index.indexdef}`);
    });

    // Show current foreign keys
    console.log('\n🔑 Current Foreign Key Constraints:');
    console.log('----------------------------------');
    currentForeignKeys.forEach((fk) => {
      console.log(
        `${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`,
      );
    });

    // Check for PostGIS extension
    const postgisExists = await checkPostGISExtension(dataSource);
    console.log(
      `\n🌍 PostGIS Extension: ${postgisExists ? '✅ Enabled' : '❌ Not Found'}`,
    );

    console.log('\n✨ Schema comparison completed successfully!');
  } catch (error) {
    console.error('❌ Error during schema comparison:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

async function getCurrentDatabaseSchema(
  dataSource: DataSource,
): Promise<TableInfo[]> {
  const query = `
    SELECT 
      t.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public' 
      AND t.table_type = 'BASE TABLE'
      AND t.table_name NOT LIKE 'pg_%'
      AND t.table_name != 'spatial_ref_sys'
    ORDER BY t.table_name, c.ordinal_position;
  `;

  return await dataSource.query(query);
}

async function getCurrentDatabaseIndexes(
  dataSource: DataSource,
): Promise<IndexInfo[]> {
  const query = `
    SELECT 
      indexname,
      tablename,
      indexdef
    FROM pg_indexes 
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename != 'spatial_ref_sys'
    ORDER BY tablename, indexname;
  `;

  return await dataSource.query(query);
}

async function getCurrentForeignKeys(
  dataSource: DataSource,
): Promise<ForeignKeyInfo[]> {
  const query = `
    SELECT 
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name;
  `;

  return await dataSource.query(query);
}

async function generateExpectedSchema(dataSource: DataSource): Promise<string> {
  // Generate schema using TypeORM's schema builder
  const schemaBuilder = dataSource.driver.createSchemaBuilder();
  const sqlInMemory = await schemaBuilder.log();

  // SqlInMemory is an object with upQueries and downQueries arrays
  if (Array.isArray(sqlInMemory)) {
    return sqlInMemory.join(';\n');
  } else if (
    sqlInMemory &&
    typeof sqlInMemory === 'object' &&
    'upQueries' in sqlInMemory
  ) {
    const queries = (sqlInMemory as { upQueries: { query: string }[] })
      .upQueries;
    return queries.map((q) => q.query).join(';\n');
  }

  return 'Unable to generate expected schema';
}

function compareTables(currentTables: TableInfo[], dataSource: DataSource) {
  // Group current tables by table name
  const tableGroups = currentTables.reduce(
    (groups, table) => {
      if (!groups[table.table_name]) {
        groups[table.table_name] = [];
      }
      groups[table.table_name].push(table);
      return groups;
    },
    {} as Record<string, TableInfo[]>,
  );

  console.log('📋 Current Database Tables:');
  console.log('---------------------------');

  Object.keys(tableGroups)
    .sort()
    .forEach((tableName) => {
      console.log(`\n🔷 ${tableName}:`);
      tableGroups[tableName].forEach((column) => {
        const nullable = column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultValue = column.column_default
          ? ` DEFAULT ${column.column_default}`
          : '';
        console.log(
          `  • ${column.column_name}: ${column.data_type} ${nullable}${defaultValue}`,
        );
      });
    });

  // List expected entities
  console.log('\n📋 Expected TypeORM Entities:');
  console.log('-----------------------------');
  const entities = dataSource.entityMetadatas;
  entities.forEach((entity) => {
    console.log(`\n🔷 ${entity.tableName}:`);
    entity.columns.forEach((column) => {
      const nullable = column.isNullable ? 'NULL' : 'NOT NULL';
      const type = column.type.toString();
      console.log(`  • ${column.databaseName}: ${type} ${nullable}`);
    });
  });
}

async function checkPostGISExtension(dataSource: DataSource): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await dataSource.query(
      "SELECT 1 FROM pg_extension WHERE extname = 'postgis';",
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return result.length > 0;
  } catch {
    return false;
  }
}

// Run the comparison
if (require.main === module) {
  void compareSchemas();
}

export { compareSchemas };
