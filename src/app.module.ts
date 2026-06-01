import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CliService } from './cli/cli.service';
import { CliModule } from './cli/cli.module';
import { TelegramService } from './telegram/telegram.service';
import { TelegramModule } from './telegram/telegram.module';
import { AgentService } from './agent/agent.service';
import { AgentModule } from './agent/agent.module';
import { OpenAiService } from './open-ai/open-ai.service';
import { OpenAiModule } from './open-ai/open-ai.module';
import { MemoryModule } from './memory/memory.module';
import { ToolsService } from './tools/tools.service';

@Module({
  imports: [CliModule, TelegramModule, AgentModule, OpenAiModule, MemoryModule],
  controllers: [AppController],
  providers: [AppService, CliService, TelegramService, AgentService, OpenAiService, ToolsService],
})
export class AppModule {}
