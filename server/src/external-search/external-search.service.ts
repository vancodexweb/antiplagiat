import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ShinglingService } from '../shingling/shingling.service';
import { AnalysisResultService } from '../results/analysis-result.service';
import { EXTERNAL_SEARCH_PROVIDER_TOKEN } from './external-search-provider.factory';
import { ExternalSearchMatch, ExternalSearchProvider } from './external-search-provider.interface';

interface ExternalSearchQueryResult {
  phrase: string;
  matches: ExternalSearchMatch[];
}

interface ExternalSearchDetails {
  enabled: boolean;
  provider: string;
  queriedPhrases: number;
  results: ExternalSearchQueryResult[];
}

/**
 * Внешняя проверка по интернету (раздел 3.2 ТЗ): среди шинглов документа,
 * не найденных в локальном корпусе ("редкие"), берётся небольшая выборка и
 * проверяется через внешнюю поисковую систему. Результат — справочная
 * информация в detailsJson.externalSearch, она не входит в формулу
 * originalityPct/plagiarismPct: внешние источники не входят в канонический
 * корпус и провайдер по умолчанию отключён (см. NoopExternalSearchProvider).
 */
@Injectable()
export class ExternalSearchService {
  private readonly logger = new Logger(ExternalSearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly shingling: ShinglingService,
    private readonly results: AnalysisResultService,
    @Inject(EXTERNAL_SEARCH_PROVIDER_TOKEN) private readonly provider: ExternalSearchProvider,
  ) {}

  async analyze(documentId: string, rawText: string): Promise<void> {
    const enabled = this.config.get<string>('ENABLE_EXTERNAL_SEARCH', 'false') === 'true';
    if (!enabled) {
      await this.writeResult(documentId, {
        enabled: false,
        provider: this.provider.name,
        queriedPhrases: 0,
        results: [],
      });
      return;
    }

    const shingles = this.shingling.generateShingles(rawText);
    if (shingles.length === 0) {
      await this.writeResult(documentId, { enabled: true, provider: this.provider.name, queriedPhrases: 0, results: [] });
      return;
    }

    const hashes = shingles.map((s) => s.hashHex);
    const foundInCorpus = await this.prisma.corpusShingle.findMany({
      where: { hash: { in: hashes } },
      select: { hash: true },
      distinct: ['hash'],
    });
    const foundHashSet = new Set(foundInCorpus.map((r) => r.hash));

    // "Редкие" шинглы — те, что не встречаются в локальном корпусе вообще
    // (не только среди LSH-кандидатов, как в PlagiarismService) — именно
    // такие фрагменты имеет смысл проверять во внешнем интернете.
    const rareShingles = shingles.filter((s) => !foundHashSet.has(s.hashHex));

    const sampleSize = Number(this.config.get('EXTERNAL_SEARCH_SAMPLE_SIZE', '5'));
    const sample = this.sampleEvenly(rareShingles, sampleSize);

    const results: ExternalSearchQueryResult[] = [];
    for (const shingle of sample) {
      try {
        const matches = await this.provider.search(shingle.phrase);
        results.push({ phrase: shingle.phrase, matches });
      } catch (error) {
        this.logger.warn(
          `Внешний поиск (${this.provider.name}) не удался для фразы "${shingle.phrase}": ` +
            `${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    await this.writeResult(documentId, {
      enabled: true,
      provider: this.provider.name,
      queriedPhrases: sample.length,
      results,
    });

    this.logger.log(
      `Документ ${documentId}: внешний поиск (${this.provider.name}) — проверено ${sample.length} из ${rareShingles.length} редких шинглов`,
    );
  }

  private sampleEvenly<T>(items: T[], count: number): T[] {
    if (count <= 0 || items.length === 0) return [];
    if (items.length <= count) return items;
    const step = items.length / count;
    const sample: T[] = [];
    for (let i = 0; i < count; i++) {
      sample.push(items[Math.floor(i * step)]);
    }
    return sample;
  }

  private async writeResult(documentId: string, details: ExternalSearchDetails): Promise<void> {
    await this.results.mergeDetails(documentId, 'externalSearch', details);
  }
}
