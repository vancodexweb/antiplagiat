import { RmqOptions, Transport } from '@nestjs/microservices';

// Минимальный интерфейс вместо конкретного ConfigService: main-worker.ts
// вызывает эту фабрику до инициализации Nest DI (там читаем process.env
// напрямую), а api — уже через настоящий ConfigService.
export interface ConfigLike {
  get(key: string, defaultValue: string): string;
}

// Общие опции подключения к RabbitMQ — используются и клиентом (api,
// публикация задач), и микросервисом-консьюмером (worker), чтобы обе
// стороны декларировали очередь идентично (иначе RabbitMQ откажет с
// PRECONDITION_FAILED при несовпадении аргументов очереди).
//
// noAck здесь намеренно не задаётся: это настройка консьюмера, а не
// соединения. worker включает noAck:false отдельно (main-worker.ts) для
// ручного ack/nack основной очереди; если задать её и на стороне api,
// это ломает служебный reply-consumer ClientProxy (RabbitMQ отвечает
// 406 PRECONDITION_FAILED "reply consumer cannot acknowledge").
export function buildRmqOptions(config: ConfigLike): RmqOptions {
  const dlq = config.get('RABBITMQ_DLQ', 'documents_analysis_dlq');

  return {
    transport: Transport.RMQ,
    options: {
      urls: [config.get('RABBITMQ_URL', 'amqp://localhost:5672')],
      queue: config.get('RABBITMQ_QUEUE', 'documents_analysis'),
      queueOptions: {
        durable: true,
        // Сообщение, отклонённое воркером без requeue (после исчерпания
        // попыток), автоматически попадает в очередь dlq через дефолтный
        // exchange RabbitMQ (раздел 2, пункт 5 ТЗ).
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': dlq,
        },
      },
    },
  };
}
