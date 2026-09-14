import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ANALYZE_DOCUMENT_PATTERN, DOCUMENTS_QUEUE_CLIENT } from './queue.constants';

export interface AnalyzeDocumentMessage {
  documentId: string;
}

@Injectable()
export class QueuePublisherService implements OnModuleDestroy {
  private readonly logger = new Logger(QueuePublisherService.name);

  constructor(@Inject(DOCUMENTS_QUEUE_CLIENT) private readonly client: ClientProxy) {}

  publishAnalysisTask(documentId: string): void {
    this.client.emit<unknown, AnalyzeDocumentMessage>(ANALYZE_DOCUMENT_PATTERN, { documentId });
    this.logger.log(`Задача на анализ документа ${documentId} отправлена в очередь`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }
}
