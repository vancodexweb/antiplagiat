import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NlpClientService } from '../../nlp-client/nlp-client.service';
import { AiFeatureScorer, clamp01 } from '../feature.interface';

// Перплексия обычно лежит примерно в диапазоне единиц-сотен для связного
// текста; это грубая нормализация, а не калиброванная шкала — вес фичи
// в БД позволяет ослабить её вклад, если распределение окажется другим.
const NORMAL_MAX_PERPLEXITY = 150;

/**
 * Перплексия через языковую модель (раздел 3.3 ТЗ) — помечена как "тяжёлая
 * опциональная фича". Управляется флагом ENABLE_PERPLEXITY_FEATURE на
 * стороне nlp-service; если выключена, возвращает NaN — оркестратор
 * (AiDetectorService) исключает такую фичу из взвешенной суммы.
 */
@Injectable()
export class PerplexityFeature implements AiFeatureScorer {
  readonly key = 'perplexity';
  private readonly logger = new Logger(PerplexityFeature.name);

  constructor(
    private readonly nlpClient: NlpClientService,
    private readonly config: ConfigService,
  ) {}

  async score(text: string): Promise<number> {
    if (this.config.get<string>('ENABLE_PERPLEXITY_FEATURE', 'false') !== 'true') {
      return NaN;
    }

    try {
      const perplexity = await this.nlpClient.computePerplexity(text);
      if (perplexity === null) return NaN;
      // Низкая перплексия (текст легко предсказуем моделью) чаще
      // встречается у ИИ-сгенерированного текста.
      return clamp01(1 - Math.min(perplexity / NORMAL_MAX_PERPLEXITY, 1));
    } catch (error) {
      this.logger.warn(`Не удалось получить перплексию: ${error instanceof Error ? error.message : String(error)}`);
      return NaN;
    }
  }
}
