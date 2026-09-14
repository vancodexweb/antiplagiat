import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnalysisResultService } from '../results/analysis-result.service';

interface LanguageToolMatch {
  message: string;
  offset: number;
  length: number;
  rule: { id: string; category?: { id?: string; name?: string } };
}

interface GrammarErrorDetail {
  message: string;
  offset: number;
  length: number;
  ruleId: string;
  category: string;
}

/**
 * Грамматика и орфография (раздел 3.4 ТЗ) — через self-hosted LanguageTool.
 * language=auto: документы могут быть смешанными по языку (раздел 3.1),
 * а LanguageTool сам неплохо определяет язык через fastText.
 */
@Injectable()
export class GrammarService {
  private readonly logger = new Logger(GrammarService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly results: AnalysisResultService,
  ) {}

  async analyze(documentId: string, rawText: string): Promise<void> {
    const baseUrl = this.config.get<string>('LANGUAGETOOL_URL', 'http://localhost:8010');

    const response = await fetch(`${baseUrl}/v2/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ language: 'auto', text: rawText }),
    });

    if (!response.ok) {
      throw new Error(`LanguageTool ответил статусом ${response.status}`);
    }

    const data = (await response.json()) as { matches: LanguageToolMatch[] };

    const errors: GrammarErrorDetail[] = data.matches.map((match) => ({
      message: match.message,
      offset: match.offset,
      length: match.length,
      ruleId: match.rule.id,
      category: match.rule.category?.name ?? 'Другое',
    }));

    const byCategory = errors.reduce<Record<string, number>>((acc, error) => {
      acc[error.category] = (acc[error.category] ?? 0) + 1;
      return acc;
    }, {});

    await this.results.mergeDetails(
      documentId,
      'grammar',
      { totalErrors: errors.length, byCategory, errors },
      { grammarErrors: errors.length },
    );

    this.logger.log(`Документ ${documentId}: grammarErrors=${errors.length}`);
  }
}
