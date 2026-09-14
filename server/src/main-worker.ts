import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker/worker.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('worker');
  const app = await NestFactory.createApplicationContext(WorkerModule);
  await app.init();
  logger.log('worker запущен, соединение с БД установлено (обработка очереди — Шаг 3)');

  // Приложение без HTTP-сервера и без активного консьюмера очереди (пока)
  // не держит event loop никаким открытым хендлом — голый "зависший" Promise
  // тут не поможет (Node всё равно завершит процесс, если для libuv нет
  // работы), поэтому держим event loop простым периодическим таймером.
  setInterval(() => {}, 1 << 30);
}

bootstrap();
