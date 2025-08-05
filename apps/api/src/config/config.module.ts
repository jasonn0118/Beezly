import { Module, Global } from '@nestjs/common';
import { AuthConfigService } from './auth.config';

@Global()
@Module({
  providers: [AuthConfigService],
  exports: [AuthConfigService],
})
export class ConfigModule {}
