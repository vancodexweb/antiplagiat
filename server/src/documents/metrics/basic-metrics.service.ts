import { Injectable } from '@nestjs/common';

const WORDS_PER_MINUTE = 200;

export interface BasicMetrics {
  charCount: number;
  charCountNoSpaces: number;
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  pageCount: number;
  avgSentenceLength: number;
  readingTimeMinutes: number;
}

/**
 * Лёгкие метрики раздела 3.1 — считаются синхронно при загрузке документа,
 * без обращения к worker/nlp-service.
 */
@Injectable()
export class BasicMetricsService {
  compute(text: string, pageNormChars: number): BasicMetrics {
    const chars = Array.from(text);
    const charCount = chars.length;
    const charCountNoSpaces = chars.filter((ch) => !/\s/u.test(ch)).length;

    const words = text.match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu) ?? [];
    const wordCount = words.length;

    const sentences = this.splitSentences(text);
    const sentenceCount = sentences.length;

    const paragraphCount = this.countParagraphs(text);

    const pageCount = charCountNoSpaces > 0 ? Math.max(1, Math.ceil(charCountNoSpaces / pageNormChars)) : 0;

    const avgSentenceLength = sentenceCount > 0 ? Math.round((wordCount / sentenceCount) * 100) / 100 : 0;
    const readingTimeMinutes = Math.round((wordCount / WORDS_PER_MINUTE) * 100) / 100;

    return {
      charCount,
      charCountNoSpaces,
      wordCount,
      sentenceCount,
      paragraphCount,
      pageCount,
      avgSentenceLength,
      readingTimeMinutes,
    };
  }

  // Разбиение на предложения по знакам конца предложения (. ! ? … и их
  // комбинации), с фильтрацией пустых фрагментов. Не претендует на 100%
  // точность с сокращениями/инициалами — этого для метрик достаточно,
  // полноценный NLP-разбор делает nlp-service (эмбеддинги предложений).
  splitSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?…])\s+(?=[А-ЯA-ZЁ0-9"«])|\n+/u)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && /[\p{L}\p{N}]/u.test(s));
  }

  private countParagraphs(text: string): number {
    const byBlankLine = text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (byBlankLine.length > 1) return byBlankLine.length;

    return text.trim().length > 0 ? 1 : 0;
  }
}
