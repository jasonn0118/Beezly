import { Controller, Get } from '@nestjs/common';
import { TasksService } from './tasks.service';

@Controller('cron')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('test') // path: /cron/test
  async triggerManually() {
    await this.tasksService.handleDailyTask();
    return '✅ Manual cron job executed';
  }
}
