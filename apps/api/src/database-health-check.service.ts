import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load test environment if needed
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
}

@Injectable()
export class DatabaseHealthCheckService implements OnModuleInit {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async onModuleInit() {
    const env = process.env.NODE_ENV || 'development';
    console.log(`\n🔧 Environment: ${env}`);
    console.log(`📊 Database: ${process.env.DB_NAME || 'default'}`);
    console.log(`🖥️  Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}`);
    console.log(`👤 Username: ${process.env.DB_USERNAME || 'postgres'}`);
    console.log(`🔑 Password: ${process.env.DB_PASSWORD || 'N/A'}`);
    
    try {
      // Test basic database connection
      await this.dataSource.query('SELECT 1');
      console.log('✅ Database connection established successfully');

      // Show current database name
      const dbResult = await this.dataSource.query('SELECT current_database()');
      console.log('✅ Connected to database:', dbResult[0].current_database);

      // Test PostGIS availability (this will fail if PostGIS isn't installed, which is expected for now)
      try {
        const postgisResult = await this.dataSource.query('SELECT PostGIS_Version()');
        console.log('✅ PostGIS is available:', postgisResult[0].postgis_version);
        
        // Test basic geometric functionality
        await this.dataSource.query('SELECT ST_GeomFromText(\'POINT(0 0)\')');
        console.log('✅ PostGIS geometric functions are working');
      } catch (postgisError) {
        console.log('⚠️  PostGIS not available (expected for local development without PostGIS)');
        console.log('   This will work when deployed to Render with PostGIS support');
      }

    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.log('💡 Make sure PostgreSQL is running and credentials are correct');
      
      // In production, exit the process on database failure
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }
}