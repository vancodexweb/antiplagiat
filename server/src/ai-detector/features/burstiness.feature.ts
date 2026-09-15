import { Injectable } from '@nestjs/common';
import { AiFeatureScorer, FeatureContext, clamp01 } from '../feature.interface';
import { normalizeToWords } from '../../shingling/text-normalizer';

/**
 * Burstiness — разброс длины предложений (раздел 3.3 ТЗ): у человека текст
 * "рваный" (короткие и длинные предложения вперемешку), у ИИ — заметно
 * более ровный. Считаем коэффициент вариации длины предложений и
 * инвертируем: низкая вариация -> выше ИИ-подобие.
 */
@Injectable()
export class BurstinessFeature implements AiFeatureScorer {
  readonly key = 'burstiness';

  score(_text: string, context: FeatureContext): number {
    const lengths = context.sentences.map((s) => normalizeToWords(s).length).filter((n) => n > 0);
    if (lengths.length < 2) return 0;

    const mean = lengths.reduce((sum, n) => sum + n, 0) / lengths.length;
    if (mean === 0) return 0;

    const variance = lengths.reduce((sum, n) => sum + (n - mean) ** 2, 0) / lengths.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;

    return clamp01(1 - Math.min(coefficientOfVariation, 1));
  }
}
