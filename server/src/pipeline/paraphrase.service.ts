import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NlpClientService } from '../nlp-client/nlp-client.service';
import { VectorSearchService } from '../vector-search/vector-search.service';
import { AnalysisResultService } from '../results/analysis-result.service';

interface ParaphraseSource {
  corpusDocumentId: string;
  title: string;
  matchedSentences: number;
}

/**
 * Перефразирование (раздел 3.2 ТЗ): смысловое совпадение ищем через
 * косинусную близость эмбеддингов предложений в pgvector — это ловит
 * пересказ своими словами, который пропускают точные шинглы (Шаг 4).
 */
@Injectable()
export class ParaphraseService {
  private readonly logger = new Logger(ParaphraseService.name);

  constructor(
    private readonly nlpClient: NlpClientService,
    private readonly vectorSearch: VectorSearchService,
    private readonly config: ConfigService,
    private readonly results: AnalysisResultService,
  ) {}

  async analyze(documentId: string, rawText: string): Promise<void> {
    const sentences = await this.nlpClient.embedSentences(rawText);
    await this.vectorSearch.replaceSentences('SentenceEmbedding', documentId, sentences);

    if (sentences.length === 0) {
      await this.writeResult(documentId, { totalSentences: 0, matchedSentences: 0, sources: [] }, 0);
      return;
    }

    const threshold = Number(this.config.get('PARAPHRASE_SIMILARITY_THRESHOLD', '0.85'));
    const sourceCounts = new Map<string, ParaphraseSource>();
    let matchedCount = 0;

    for (const sentence of sentences) {
      const best = await this.vectorSearch.findNearestCorpusSentence(sentence.embedding);
      if (best && best.similarity >= threshold) {
        matchedCount += 1;
        const existing = sourceCounts.get(best.corpusDocumentId);
        sourceCounts.set(best.corpusDocumentId, {
          corpusDocumentId: best.corpusDocumentId,
          title: best.title,
          matchedSentences: (existing?.matchedSentences ?? 0) + 1,
        });
      }
    }

    const paraphrasePct = Math.round((matchedCount / sentences.length) * 1000) / 10;

    await this.writeResult(
      documentId,
      { totalSentences: sentences.length, matchedSentences: matchedCount, sources: [...sourceCounts.values()] },
      paraphrasePct,
    );

    this.logger.log(`Документ ${documentId}: paraphrasePct=${paraphrasePct}% (предложений: ${sentences.length})`);
  }

  private async writeResult(
    documentId: string,
    details: { totalSentences: number; matchedSentences: number; sources: ParaphraseSource[] },
    paraphrasePct: number,
  ): Promise<void> {
    await this.results.mergeDetails(documentId, 'paraphrase', details, { paraphrasePct });
    await this.results.recomputeOriginality(documentId);
  }
}
