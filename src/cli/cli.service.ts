import { Injectable } from '@nestjs/common';
import { stdin as input, stdout as output } from 'node:process';
import readline from 'node:readline/promises';
import { AgentService } from 'src/agent/agent.service';
import os from 'node:os';

@Injectable()
export class CliService {
  constructor(private readonly agentService: AgentService) {}

  async start() {
    const rl = readline.createInterface({ input, output });

    while (true) {
      const text = await rl.question('You: ');

      if (text === 'exit') {
        break;
      }

      const result = await this.agentService.handleMessage({
        userId: 'cli-user',
        text,
        model: 'gpt-5-mini',
        temperature: 1.0,
        source: 'cli',
        userMeta: {
          name: os.userInfo().username,
        },
      });

      if (result.source !== 'cli') {
        throw new Error('Expected CLI result');
      }

      console.log('Agent:', result.text);
    }

    rl.close();
  }
}
