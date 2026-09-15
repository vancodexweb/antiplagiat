import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect } from 'amqplib';

const CONNECT_ATTEMPTS = 10;
const CONNECT_RETRY_DELAY_MS = 2000;

/**
 * Гарантированно создаёт очередь задач и очередь мёртвых писем (DLQ) при
 * старте api — до того, как в основную очередь придёт первое сообщение.
 * Без этого шага дефолтный exchange RabbitMQ молча потеряет сообщение,
 * если DLQ ещё не существует на момент первого dead-letter.
 */
@Injectable()
export class QueueTopologyService implements OnModuleInit {
  private readonly logger = new Logger(QueueTopologyService.name);

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('RABBITMQ_URL', 'amqp://localhost:5672');
    const queue = this.config.get<string>('RABBITMQ_QUEUE', 'documents_analysis');
    const dlq = this.config.get<string>('RABBITMQ_DLQ', 'documents_analysis_dlq');

    const connection = await this.connectWithRetry(url);
    const channel = await connection.createChannel();

    await channel.assertQueue(dlq, { durable: true });
    await channel.assertQueue(queue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': dlq,
      },
    });

    await channel.close();
    await connection.close();

    this.logger.log(`Топология RabbitMQ готова: очередь "${queue}", DLQ "${dlq}"`);
  }

  // RabbitMQ healthcheck в docker-compose (rabbitmq-diagnostics ping)
  // может отрапортовать "healthy" на мгновение раньше, чем AMQP-листенер
  // на 5672 реально готов принимать соединения — без повтора это валит
  // весь процесс api необработанным отказом промиса при самом первом старте.
  private async connectWithRetry(url: string): ReturnType<typeof connect> {
    for (let attempt = 1; attempt <= CONNECT_ATTEMPTS; attempt++) {
      try {
        return await connect(url);
      } catch (error) {
        if (attempt === CONNECT_ATTEMPTS) throw error;
        this.logger.warn(
          `RabbitMQ пока недоступен (попытка ${attempt}/${CONNECT_ATTEMPTS}), повтор через ${CONNECT_RETRY_DELAY_MS}мс: ${error instanceof Error ? error.message : String(error)}`,
        );
        await new Promise((resolve) => setTimeout(resolve, CONNECT_RETRY_DELAY_MS));
      }
    }
    throw new Error('unreachable');
  }
}
