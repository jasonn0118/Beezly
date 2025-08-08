import { Module } from '@nestjs/common';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

@Module({
  imports: [ConfigModule],
  controllers: [TasksController],
  providers: [
    TasksService,
    {
      provide: SupabaseClient,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return createClient(
          config.get<string>('SUPABASE_URL')!,
          config.get<string>('SUPABASE_ANON_KEY')!,
        );
      },
    },
    {
      provide: OpenAI,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new OpenAI({ apiKey: config.get<string>('OPENAI_API_KEY')! });
      },
    },
  ],
  exports: [TasksService],
})
export class TasksModule {}
