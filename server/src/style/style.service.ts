import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BasicMetricsService } from '../documents/metrics/basic-metrics.service';
import { normalizeToWords } from '../shingling/text-normalizer';
import { AnalysisResultService } from '../results/analysis-result.service';
import { STOPWORDS } from './stopwords';

const LONG_SENTENCE_WORD_THRESHOLD = 25;
const VOWELS = new Set('аеёиоуыэюя');

// Возвратные глаголы в характерных для страдательного залога формах
// (делается, решается, был выполнен и т.п.) — упрощённая эвристика без
// полноценного морфологического разбора, но она ловит самый частый в
// русском языке тип пассивных конструкций.
// Важно: \b в JS-регулярках определяется через ASCII \w и не работает с
// кириллицей (весь текст — "не-словесные" символы), поэтому границы слова
// не используются — [а-яё]+ и так не выходит за пределы пробелов/пунктуации.
const PASSIVE_VOICE_RE = /[а-яё]+(ется|ются|ался|алась|алось|ались|ился|илась|илось|ились)/giu;

interface StyleDetails {
  longSentencesPct: number;
  passiveVoicePct: number;
  bureaucracyPct: number;
  wordRepetitions: number;
  matchedCliches: string[];
}

/**
 * Читаемость и стилистика (раздел 3.5 ТЗ).
 */
@Injectable()
export class StyleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly basicMetrics: BasicMetricsService,
    private readonly results: AnalysisResultService,
  ) {}

  async analyze(documentId: string, rawText: string): Promise<void> {
    const sentences = this.basicMetrics.splitSentences(rawText);
    const words = normalizeToWords(rawText);

    const readabilityScore = this.computeReadability(sentences, words);
    const longSentencesPct = this.computeLongSentencesPct(sentences);
    const passiveVoicePct = this.computePassiveVoicePct(sentences);
    const wordRepetitions = this.countAdjacentRepetitions(sentences);
    const { bureaucracyPct, matchedCliches } = await this.computeBureaucracyPct(sentences);

    const details: StyleDetails = { longSentencesPct, passiveVoicePct, bureaucracyPct, wordRepetitions, matchedCliches };

    await this.results.mergeDetails(documentId, 'style', details, { readabilityScore });
  }

  // Адаптация формулы Флеша-Кинкейда для русского языка (И.В. Оборнева):
  // 206.835 - 1.3*ASL - 60.1*ASW, где ASL — средняя длина предложения в
  // словах, ASW — среднее число слогов в слове (слоги считаем по гласным).
  private computeReadability(sentences: string[], words: string[]): number {
    if (sentences.length === 0 || words.length === 0) return 0;

    const totalSyllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);
    const asl = words.length / sentences.length;
    const asw = totalSyllables / words.length;
    const score = 206.835 - 1.3 * asl - 60.1 * asw;

    return Math.round(score * 10) / 10;
  }

  private countSyllables(word: string): number {
    let count = 0;
    for (const ch of word.toLowerCase()) {
      if (VOWELS.has(ch)) count++;
    }
    return Math.max(count, 1);
  }

  private computeLongSentencesPct(sentences: string[]): number {
    if (sentences.length === 0) return 0;
    const longCount = sentences.filter((s) => normalizeToWords(s).length > LONG_SENTENCE_WORD_THRESHOLD).length;
    return Math.round((longCount / sentences.length) * 1000) / 10;
  }

  private computePassiveVoicePct(sentences: string[]): number {
    if (sentences.length === 0) return 0;
    const passiveCount = sentences.filter((s) => {
      PASSIVE_VOICE_RE.lastIndex = 0;
      return PASSIVE_VOICE_RE.test(s);
    }).length;
    return Math.round((passiveCount / sentences.length) * 1000) / 10;
  }

  // Повторы одного и того же значимого слова в соседних предложениях —
  // частый признак небрежного/неотредактированного или ИИ-сгенерированного
  // текста (раздел 3.5, см. также детектор ИИ в разделе 3.3).
  private countAdjacentRepetitions(sentences: string[]): number {
    let repetitions = 0;
    for (let i = 0; i < sentences.length - 1; i++) {
      const wordsA = this.significantWords(sentences[i]);
      const wordsB = this.significantWords(sentences[i + 1]);
      const hasOverlap = [...wordsA].some((w) => wordsB.has(w));
      if (hasOverlap) repetitions++;
    }
    return repetitions;
  }

  private significantWords(sentence: string): Set<string> {
    return new Set(normalizeToWords(sentence).filter((w) => w.length >= 3 && !STOPWORDS.has(w)));
  }

  private async computeBureaucracyPct(sentences: string[]): Promise<{ bureaucracyPct: number; matchedCliches: string[] }> {
    if (sentences.length === 0) return { bureaucracyPct: 0, matchedCliches: [] };

    const cliches = await this.prisma.clicheWord.findMany({ where: { category: 'BUREAUCRATIC' } });
    if (cliches.length === 0) return { bureaucracyPct: 0, matchedCliches: [] };

    const matched = new Set<string>();
    let sentencesWithCliche = 0;

    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      const found = cliches.find((c) => lower.includes(c.phrase.toLowerCase()));
      if (found) {
        sentencesWithCliche++;
        matched.add(found.phrase);
      }
    }

    return {
      bureaucracyPct: Math.round((sentencesWithCliche / sentences.length) * 1000) / 10,
      matchedCliches: [...matched],
    };
  }
}
