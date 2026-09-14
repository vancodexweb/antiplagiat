import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NlpServiceUnavailableException } from '../common/exceptions/app.exceptions';

export interface EmbeddedSentence {
  position: number;
  text: string;
  embedding: number[];
}

export interface LemmaToken {
  text: string;
  lemma: string;
  pos: string | null;
}

/**
 * HTTP-клиент к nlp-service (раздел 0 ТЗ: worker/api обращаются к нему по
 * HTTP, сам он состояния не хранит). Используется и api (индексация
 * корпуса), и worker (анализ документа) — оба процесса нуждаются в одних
 * и тех же эмбеддингах предложений.
 */
@Injectable()
export class NlpClientService {
  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    return this.config.get<string>('NLP_SERVICE_URL', 'http://localhost:8001');
  }

  async embedSentences(text: string): Promise<EmbeddedSentence[]> {
    const data = await this.post<{ sentences: EmbeddedSentence[] }>('/embed-sentences', { text });
    return data.sentences;
  }

  async lemmatize(text: string): Promise<LemmaToken[]> {
    const data = await this.post<{ tokens: LemmaToken[] }>('/lemmatize', { text });
    return data.tokens;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new NlpServiceUnavailableException({
        message: error instanceof Error ? error.message : String(error),
      });
    }

    if (!response.ok) {
      throw new NlpServiceUnavailableException({ status: response.status });
    }

    return (await response.json()) as T;
  }
}
