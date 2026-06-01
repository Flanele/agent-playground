import { Module } from '@nestjs/common';
import { ToolsService } from './tools.service';

@Module({})
export class ToolsModule {
  providers: [ToolsService];
  exports: [ToolsService];
}
