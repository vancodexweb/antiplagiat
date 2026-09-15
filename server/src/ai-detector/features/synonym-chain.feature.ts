import { Injectable } from '@nestjs/common';
import { AiFeatureScorer, FeatureContext, clamp01 } from '../feature.interface';

// Эвристика "избыточной синонимизации подряд" (раздел 3.3 ТЗ): цепочки из
// 3+ слов через запятую в одном предложении — характерный для ИИ-текста
// приём "нанизывания" однородных эпитетов/определений. Полноценная
// проверка на синонимию потребовала бы отдельного словаря синонимов,
// которого в системе нет, — это осознанное упрощение.
const CHAIN_RE = /(?:[а-яё]+,\s*){2,}[а-яё]+/giu;

@Injectable()
export class SynonymChainFeature implements AiFeatureScorer {
  readonly key = 'synonymChains';

  score(_text: string, context: FeatureContext): number {
    if (context.sentences.length === 0) return 0;

    const matched = context.sentences.filter((sentence) => {
      CHAIN_RE.lastIndex = 0;
      return CHAIN_RE.test(sentence);
    }).length;

    return clamp01(matched / context.sentences.length);
  }
}
