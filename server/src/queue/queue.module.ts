import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { DOCUMENTS_QUEUE_CLIENT } from './queue.constants';
import { QueuePublisherService } from './queue-publisher.service';
import { QueueTopologyService } from './queue-topology.service';
import { buildRmqOptions } from './rmq-options.factory';

// Только для api: публикация задач в очередь + однократное создание
// топологии RabbitMQ (очередь + DLQ) при старте.
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: DOCUMENTS_QUEUE_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: buildRmqOptions,
      },
    ]),
  ],
  providers: [QueuePublisherService, QueueTopologyService],
  exports: [QueuePublisherService],
})
export class QueueModule {}
