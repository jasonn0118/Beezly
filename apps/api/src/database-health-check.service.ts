import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseHealthCheckService implements OnModuleInit {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async onModuleInit() {
    try {
      // Test basic database connection
      await this.dataSource.query('SELECT 1');
      console.log('✅ Database connection established successfully');

      // Test PostGIS availability
      try {
        await this.dataSource.query('SELECT PostGIS_Version()');
        console.log('✅ PostGIS is available');

        // Test basic geometric functionality
        await this.dataSource.query("SELECT ST_GeomFromText('POINT(0 0)')");
        console.log('✅ PostGIS geometric functions are working');
      } catch {
        console.log(
          '⚠️  PostGIS not available (expected for local development)',
        );
      }
    } catch {
      console.error('❌ Database connection failed');

      // In production, exit the process on database failure
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }
}
