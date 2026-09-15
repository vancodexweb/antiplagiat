import { Controller, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { DocumentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ANALYZE_DOCUMENT_PATTERN } from '../queue/queue.constants';
import type { AnalyzeDocumentMessage } from '../queue/queue-publisher.service';
import { PlagiarismService } from '../pipeline/plagiarism.service';
import { ParaphraseService } from '../pipeline/paraphrase.service';
import { GrammarService } from '../grammar/grammar.service';
import { StyleService } from '../style/style.service';
import { SpamService } from '../style/spam.service';
import { AiDetectorService } from '../ai-detector/ai-detector.service';

interface PipelineStage {
  name: string;
  run: () => Promise<void>;
}

/**
 * Консьюмер очереди RabbitMQ (раздел 2, пункты 4-5 ТЗ). Статусная машина
 * PENDING -> PROCESSING -> DONE/FAILED и логика повторов/DLQ реализованы
 * на Шаге 3; стадии реального анализа (шинглы — Шаг 4, эмбеддинги — Шаг 5
 * и т.д.) подключаются в runPipeline по мере продвижения по чек-листу.
 */
@Controller()
export class ProcessingController {
  private readonly logger = new Logger(ProcessingController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly plagiarismService: PlagiarismService,
    private readonly paraphraseService: ParaphraseService,
    private readonly grammarService: GrammarService,
    private readonly styleService: StyleService,
    private readonly spamService: SpamService,
    private readonly aiDetectorService: AiDetectorService,
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

      await this.runPipeline(document);

      await this.prisma.document.update({ where: { id: documentId }, data: { status: DocumentStatus.DONE } });
      channel.ack(originalMsg);
      this.logger.log(`Документ ${documentId} обработан успешно`);
    } catch (error) {
      await this.handleFailure(documentId, error, channel, originalMsg);
    }
  }

  private async runPipeline(document: { id: string; rawText: string }): Promise<void> {
    const stages: PipelineStage[] = [
      { name: 'plagiarism', run: () => this.plagiarismService.analyze(document.id, document.rawText) },
      { name: 'paraphrase', run: () => this.paraphraseService.analyze(document.id, document.rawText) },
      { name: 'grammar', run: () => this.grammarService.analyze(document.id, document.rawText) },
      { name: 'style', run: () => this.styleService.analyze(document.id, document.rawText) },
      { name: 'spam', run: () => this.spamService.analyze(document.id, document.rawText) },
      { name: 'aiDetector', run: () => this.aiDetectorService.analyze(document.id, document.rawText) },
    ];

    for (const stage of stages) {
      try {
        await stage.run();
      } catch (error) {
        await this.prisma.document.update({ where: { id: document.id }, data: { failedStage: stage.name } });
        throw error;
      }
    }
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
