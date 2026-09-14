import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeToWords } from '../shingling/text-normalizer';
import { AnalysisResultService } from '../results/analysis-result.service';
import { STOPWORDS } from './stopwords';

/**
 * Заспамленность и мусорные слова (раздел 3.6 ТЗ). Оба словаря (мусорные
 * слова — JunkWord) редактируются через API/БД, а не хардкодятся.
 */
@Injectable()
export class SpamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly results: AnalysisResultService,
  ) {}

  async analyze(documentId: string, rawText: string): Promise<void> {
    const words = normalizeToWords(rawText);

    if (words.length === 0) {
      await this.results.mergeDetails(
        documentId,
        'spam',
        { topWords: [], junkWordsCount: 0, totalWords: 0 },
        { spamPct: 0, junkWordsPct: 0 },
      );
      return;
    }

    const topN = Number(this.config.get('SPAM_TOP_N_WORDS', '10'));
    const frequency = new Map<string, number>();
    for (const word of words) {
      if (STOPWORDS.has(word) || word.length < 3) continue;
      frequency.set(word, (frequency.get(word) ?? 0) + 1);
    }

    const topWords = [...frequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([word, count]) => ({ word, count }));

    const topWordsSum = topWords.reduce((sum, w) => sum + w.count, 0);
    const spamPct = Math.round((topWordsSum / words.length) * 1000) / 10;

    const junkWordRows = await this.prisma.junkWord.findMany();
    const junkSet = new Set(junkWordRows.map((r) => r.word.toLowerCase()));
    const junkWordsCount = words.filter((w) => junkSet.has(w)).length;
    const junkWordsPct = Math.round((junkWordsCount / words.length) * 1000) / 10;

    await this.results.mergeDetails(
      documentId,
      'spam',
      { topWords, junkWordsCount, totalWords: words.length },
      { spamPct, junkWordsPct },
    );
  }
}
