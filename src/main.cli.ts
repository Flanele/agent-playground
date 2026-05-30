import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CliService } from './cli/cli.service';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const cli = app.get(CliService);
  await cli.start();

  await app.close();
}
bootstrap();
