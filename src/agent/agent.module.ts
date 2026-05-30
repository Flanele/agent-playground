import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { OpenAiModule } from 'src/open-ai/open-ai.module';

@Module({})
export class AgentModule {
    imports: [OpenAiModule];
    providers: [AgentService];
    exports: [AgentService];
}
