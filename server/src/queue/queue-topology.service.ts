import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect } from 'amqplib';

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

    const connection = await connect(url);
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
}
