import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { AgentModule } from 'src/agent/agent.module';

@Module({})
export class TelegramModule {
  imports: [AgentModule];
  providers: [TelegramService];
}
