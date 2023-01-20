import { NestFactory } from '@nestjs/core';
import { InternalServerErrorExceptionsFilter } from '../../../libs/common/src/filters/internal-server-error-exceptions.filter';
import { ProducerModule } from './producer/producer.module';
import * as dotenv from 'dotenv';
import { EnvHelper } from '../../../libs/env/src/env.helper';

EnvHelper.verifyNodeEnv();

dotenv.config({ path: EnvHelper.getEnvFilePath() });

async function bootstrap() {
  const app = await NestFactory.create(ProducerModule);

  app.useGlobalFilters(new InternalServerErrorExceptionsFilter());
  app.enableShutdownHooks();

  await app.listen(4000);
}
bootstrap();
