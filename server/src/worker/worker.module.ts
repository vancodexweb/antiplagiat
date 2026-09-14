import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';

// На Шаге 1 воркер — заглушка: только поднимается и держит соединение с БД.
// Реальная обработка очереди RabbitMQ появится на Шаге 3.
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
})
export class WorkerModule {}
