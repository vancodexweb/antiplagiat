import { Injectable } from '@nestjs/common';
import { AiFeatureScorer, FeatureContext, clamp01 } from '../feature.interface';

/**
 * Лексическое разнообразие (TTR — type-token ratio, раздел 3.3 ТЗ).
 * Эвристика: шаблонный/ИИ-текст чаще многократно повторяет одни и те же
 * слова в пределах документа, поэтому низкий TTR трактуется как более
 * "ИИ-подобный" — направление и вклад признака регулируются весом в БД.
 */
@Injectable()
export class LexicalDiversityFeature implements AiFeatureScorer {
  readonly key = 'lexicalDiversity';

  score(_text: string, context: FeatureContext): number {
    if (context.words.length === 0) return 0;
    const uniqueWords = new Set(context.words).size;
    const ttr = uniqueWords / context.words.length;
    return clamp01(1 - ttr);
  }
}
