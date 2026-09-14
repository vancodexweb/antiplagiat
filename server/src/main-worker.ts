import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker/worker.module';
import { buildRmqOptions } from './queue/rmq-options.factory';

async function bootstrap(): Promise<void> {
  const logger = new Logger('worker');

  const rmqOptions = buildRmqOptions({
    get: (key: string, defaultValue: string) => process.env[key] ?? defaultValue,
  });
  // Ручной ack/nack нужен именно консьюмеру (см. комментарий в
  // rmq-options.factory.ts) — задаём его только здесь, не в общей фабрике.
  const app = await NestFactory.createMicroservice(WorkerModule, {
    ...rmqOptions,
    options: { ...rmqOptions.options, noAck: false },
  });

  await app.listen();
  logger.log('worker запущен и слушает очередь RabbitMQ');
}

bootstrap();
