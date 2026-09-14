import { Injectable } from '@nestjs/common';

export interface LanguageDetectionResult {
  // Доминирующий язык документа, код ISO 639-1 (ru, en, ...) либо 'und', если не определён
  dominant: string;
  // Проценты по языкам среди распознанных фрагментов текста, в сумме ~100
  breakdown: Record<string, number>;
}

// franc возвращает коды ISO 639-3 — приводим самые частые к привычному
// двухбуквенному виду для читаемости в API/отчётах.
const ISO_639_3_TO_1: Record<string, string> = {
  rus: 'ru',
  eng: 'en',
  ukr: 'uk',
  bel: 'be',
  deu: 'de',
  fra: 'fr',
  spa: 'es',
  kaz: 'kk',
};

const MIN_CHUNK_LENGTH = 20;

@Injectable()
export class LanguageDetectionService {
  async detect(text: string): Promise<LanguageDetectionResult> {
    const chunks = this.splitIntoChunks(text);
    if (chunks.length === 0) {
      return { dominant: 'und', breakdown: {} };
    }

    // franc — ESM-only, поэтому подключаем через динамический import() даже
    // из CommonJS-сборки (см. также TextExtractionService).
    const { franc } = await import('franc');

    const wordsByLanguage = new Map<string, number>();
    let totalWords = 0;

    for (const chunk of chunks) {
      const wordCount = this.countWords(chunk);
      if (wordCount === 0) continue;

      const code3 = chunk.length >= MIN_CHUNK_LENGTH ? franc(chunk) : 'und';
      const code = ISO_639_3_TO_1[code3] ?? code3;

      wordsByLanguage.set(code, (wordsByLanguage.get(code) ?? 0) + wordCount);
      totalWords += wordCount;
    }

    if (totalWords === 0) {
      return { dominant: 'und', breakdown: {} };
    }

    const breakdown: Record<string, number> = {};
    let dominant = 'und';
    let dominantShare = -1;

    for (const [lang, words] of wordsByLanguage.entries()) {
      const pct = Math.round((words / totalWords) * 1000) / 10;
      breakdown[lang] = pct;
      if (pct > dominantShare) {
        dominantShare = pct;
        dominant = lang;
      }
    }

    return { dominant, breakdown };
  }

  private splitIntoChunks(text: string): string[] {
    return text
      .split(/\n\s*\n/)
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 0);
  }

  private countWords(text: string): number {
    return (text.match(/[\p{L}\p{N}]+/gu) ?? []).length;
  }
}
