import { ApiProperty } from '@nestjs/swagger';

export class AnalysisResultDto {
  @ApiProperty({ description: 'Процент оригинальности текста (100 - заимствования)', example: 82.5 })
  originalityPct: number;

  @ApiProperty({ description: 'Процент точных текстовых заимствований (шинглы/MinHash)', example: 5.2 })
  plagiarismPct: number;

  @ApiProperty({ description: 'Процент смыслового перефразирования (по эмбеддингам предложений)', example: 8.1 })
  paraphrasePct: number;

  @ApiProperty({ description: 'Процент совпадений с предыдущими документами того же автора', example: 0 })
  selfPlagiarismPct: number;

  @ApiProperty({ description: 'Процент текста, корректно оформленного как цитата (не считается заимствованием)', example: 4.2 })
  citedPct: number;

  @ApiProperty({ description: 'Заспамленность — доля топ-N значимых слов от общего объёма текста', example: 12.3 })
  spamPct: number;

  @ApiProperty({ description: 'Доля мусорных слов/филлеров по словарю', example: 1.4 })
  junkWordsPct: number;

  @ApiProperty({ description: 'Количество грамматических и орфографических ошибок (LanguageTool)', example: 3 })
  grammarErrors: number;

  @ApiProperty({ description: 'Индекс удобочитаемости текста (адаптация Флеша-Кинкейда для русского)', example: 54.7 })
  readabilityScore: number;

  @ApiProperty({ description: 'Вероятность того, что текст сгенерирован ИИ, от 0 до 1', example: 0.23 })
  aiProbability: number;

  @ApiProperty({ description: 'Итоговый вердикт детектора ИИ (true — вероятно сгенерирован ИИ)', example: false })
  aiVerdict: boolean;

  @ApiProperty({ description: 'Дата и время завершения анализа', example: '2026-09-14T12:00:00.000Z' })
  createdAt: Date;
}
