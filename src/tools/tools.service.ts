import { Injectable } from '@nestjs/common';
import { getCurrentTime } from './utils/get-current-time';

@Injectable()
export class ToolsService {
  async executeTool(name: string, args: unknown) {
    switch (name) {
      case 'get_current_time':
        return getCurrentTime(args as Record<string, unknown>);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}
