import { Controller, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { DocumentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ANALYZE_DOCUMENT_PATTERN } from '../queue/queue.constants';
import type { AnalyzeDocumentMessage } from '../queue/queue-publisher.service';

/**
 * Консьюмер очереди RabbitMQ (раздел 2, пункты 4-5 ТЗ). На Шаге 3 пайплайн
 * анализа — заглушка (runPipeline ничего не делает), но статусная машина
 * PENDING -> PROCESSING -> DONE/FAILED и логика повторов/DLQ уже реальные,
 * чтобы следующие шаги просто подключали новые стадии в runPipeline.
 */
@Controller()
export class ProcessingController {
  private readonly logger = new Logger(ProcessingController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @EventPattern(ANALYZE_DOCUMENT_PATTERN)
  async handleAnalyzeDocument(@Payload() data: AnalyzeDocumentMessage, @Ctx() context: RmqContext): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const { documentId } = data;

    try {
      const document = await this.prisma.document.findUnique({ where: { id: documentId } });
      if (!document) {
        this.logger.warn(`Документ ${documentId} не найден — сообщение отброшено`);
        channel.ack(originalMsg);
        return;
      }

      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.PROCESSING, failureReason: null, failedStage: null },
      });

      await this.runPipeline(documentId);

      await this.prisma.document.update({ where: { id: documentId }, data: { status: DocumentStatus.DONE } });
      channel.ack(originalMsg);
      this.logger.log(`Документ ${documentId} обработан успешно`);
    } catch (error) {
      await this.handleFailure(documentId, error, channel, originalMsg);
    }
  }

  // Шаг 3: реального анализа ещё нет — стадии 4-9 подключатся сюда по
  // мере продвижения по чек-листу (раздел 12).
  private async runPipeline(_documentId: string): Promise<void> {
    return;
  }

  private async handleFailure(
    documentId: string,
    error: unknown,
    channel: ReturnType<RmqContext['getChannelRef']>,
    originalMsg: ReturnType<RmqContext['getMessage']>,
  ): Promise<void> {
    const maxRetries = Number(this.config.get('RABBITMQ_MAX_RETRIES', '3'));
    const message = error instanceof Error ? error.message : String(error);

    const document = await this.prisma.document.update({
      where: { id: documentId },
      data: { retryCount: { increment: 1 } },
    });

    this.logger.error(
      `Ошибка обработки документа ${documentId} (попытка ${document.retryCount}/${maxRetries}): ${message}`,
    );

    if (document.retryCount >= maxRetries) {
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.FAILED, failureReason: message },
      });
      // requeue=false — сообщение уходит в DLQ согласно x-dead-letter-*
      // аргументам очереди (см. rmq-options.factory.ts).
      channel.nack(originalMsg, false, false);
    } else {
      // requeue=true — повторная попытка обработки этого же сообщения.
      channel.nack(originalMsg, false, true);
    }
  }
}
