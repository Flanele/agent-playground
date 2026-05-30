import { Module } from '@nestjs/common';
import { OpenAiService } from './open-ai.service';

@Module({})
export class OpenAiModule {
  providers: [OpenAiService];
  exports: [OpenAiService];
}
