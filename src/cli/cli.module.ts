import { Module } from '@nestjs/common';
import { AgentModule } from 'src/agent/agent.module';
import { CliService } from './cli.service';

@Module({})
export class CliModule {
  imports: [AgentModule];
  providers: [CliService];
}
