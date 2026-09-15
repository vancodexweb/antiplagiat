import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiFeatureScorer, FeatureContext, clamp01 } from '../feature.interface';

/**
 * Совпадения со словарём типично-ИИ оборотов (раздел 3.3 ТЗ) — словарь
 * ClicheWord с category=AI_CLICHE, редактируется через БД без изменения кода.
 */
@Injectable()
export class AiClicheFeature implements AiFeatureScorer {
  readonly key = 'aiCliches';

  constructor(private readonly prisma: PrismaService) {}

  async score(_text: string, context: FeatureContext): Promise<number> {
    if (context.sentences.length === 0) return 0;

    const cliches = await this.prisma.clicheWord.findMany({ where: { category: 'AI_CLICHE' } });
    if (cliches.length === 0) return 0;

    let matchedSentences = 0;
    for (const sentence of context.sentences) {
      const lower = sentence.toLowerCase();
      if (cliches.some((c) => lower.includes(c.phrase.toLowerCase()))) {
        matchedSentences++;
      }
    }

    return clamp01(matchedSentences / context.sentences.length);
  }
}
