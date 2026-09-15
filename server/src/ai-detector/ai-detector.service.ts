import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BasicMetricsService } from '../documents/metrics/basic-metrics.service';
import { normalizeToWords } from '../shingling/text-normalizer';
import { AnalysisResultService } from '../results/analysis-result.service';
import { AI_FEATURE_SCORERS, AiFeatureScorer, FeatureContext } from './feature.interface';

/**
 * Детектор ИИ-сгенерированного текста (раздел 3.3 ТЗ): взвешенная сумма
 * независимых фич, веса и список включённых фич — в БД (DetectorWeight),
 * не в коде. Фича, вернувшая NaN (недоступна/выключена флагом — см.
 * PerplexityFeature), исключается из суммы вместе со своим весом.
 */
@Injectable()
export class AiDetectorService {
  private readonly logger = new Logger(AiDetectorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly basicMetrics: BasicMetricsService,
    private readonly results: AnalysisResultService,
    private readonly config: ConfigService,
    @Inject(AI_FEATURE_SCORERS) private readonly features: AiFeatureScorer[],
  ) {}

  async analyze(documentId: string, rawText: string): Promise<void> {
    const weightRows = await this.prisma.detectorWeight.findMany({ where: { enabled: true } });
    const weightByFeature = new Map(weightRows.map((w) => [w.feature, w.weight]));

    const context: FeatureContext = {
      sentences: this.basicMetrics.splitSentences(rawText),
      words: normalizeToWords(rawText),
    };

    const scores: Record<string, number> = {};
    let weightedSum = 0;
    let weightTotal = 0;

    for (const feature of this.features) {
      const weight = weightByFeature.get(feature.key);
      if (weight === undefined) continue;

      const score = await feature.score(rawText, context);
      if (Number.isNaN(score)) continue;

      scores[feature.key] = Math.round(score * 1000) / 1000;
      weightedSum += score * weight;
      weightTotal += weight;
    }

    const aiProbability = weightTotal > 0 ? Math.round((weightedSum / weightTotal) * 1000) / 1000 : 0;
    const threshold = Number(this.config.get('AI_VERDICT_THRESHOLD', '0.6'));
    const aiVerdict = aiProbability >= threshold;

    await this.results.mergeDetails(
      documentId,
      'aiDetector',
      { scores, weightsUsed: Object.fromEntries(weightByFeature) },
      { aiProbability, aiVerdict },
    );

    this.logger.log(`Документ ${documentId}: aiProbability=${aiProbability} verdict=${aiVerdict}`);
  }
}
