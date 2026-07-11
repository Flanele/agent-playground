import { Module } from '@nestjs/common';
import { ToolsService } from './tools.service';
import { TelegramModule } from 'src/telegram/telegram.module';

@Module({})
export class ToolsModule {
  imports: [TelegramModule];
  providers: [ToolsService];
  exports: [ToolsService];
}
