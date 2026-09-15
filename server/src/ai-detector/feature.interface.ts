// Общий интерфейс фич детектора ИИ-текста (раздел 3.3 ТЗ): каждая фича —
// независимый модуль со score(text): number в диапазоне 0..1, где 1 —
// максимальное сходство с ИИ-текстом по данному признаку. Веса фич лежат
// в БД (DetectorWeight), а не в коде — см. ai-detector.service.ts.
export interface FeatureContext {
  sentences: string[];
  words: string[];
}

export interface AiFeatureScorer {
  readonly key: string;
  // NaN означает "фича недоступна в этом запуске" (например, тяжёлая
  // опциональная перплексия выключена флагом) — такая фича исключается
  // из взвешенной суммы вместе со своим весом, а не считается за 0.
  score(text: string, context: FeatureContext): Promise<number> | number;
}

export const AI_FEATURE_SCORERS = 'AI_FEATURE_SCORERS';

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return NaN;
  return Math.min(1, Math.max(0, value));
}
