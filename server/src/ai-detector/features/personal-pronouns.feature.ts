import { Injectable } from '@nestjs/common';
import { AiFeatureScorer, FeatureContext, clamp01 } from '../feature.interface';

const PERSONAL_PRONOUNS = new Set([
  'я', 'мы', 'ты', 'вы', 'он', 'она', 'оно', 'они',
  'меня', 'нас', 'тебя', 'вас', 'его', 'её', 'ее', 'их',
  'мне', 'нам', 'тебе', 'вам', 'ему', 'ей', 'им',
  'мной', 'мною', 'нами', 'тобой', 'тобою', 'вами', 'ним', 'ней', 'ними',
]);

// Ожидаемая доля личных местоимений в живом авторском тексте — типично
// единицы процентов; формальный/сгенерированный текст обычно заметно ближе к нулю.
const EXPECTED_RATIO = 0.05;

/**
 * Доля личных местоимений (раздел 3.3 ТЗ).
 */
@Injectable()
export class PersonalPronounsFeature implements AiFeatureScorer {
  readonly key = 'personalPronouns';

  score(_text: string, context: FeatureContext): number {
    if (context.words.length === 0) return 0;
    const count = context.words.filter((w) => PERSONAL_PRONOUNS.has(w)).length;
    const ratio = count / context.words.length;
    return clamp01(1 - Math.min(ratio / EXPECTED_RATIO, 1));
  }
}
