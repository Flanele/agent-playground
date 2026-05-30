import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import {
  ResponseCreateParamsNonStreaming,
} from 'openai/resources/responses/responses.js';

@Injectable()
export class OpenAiService {
  private client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  async createResponse(params: ResponseCreateParamsNonStreaming) {
    return await this.client.responses.create({ ...params, stream: false });
  }
}
