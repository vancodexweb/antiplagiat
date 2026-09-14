import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus } from '@prisma/client';
import { AnalysisResultDto } from './analysis-result.dto';

export class DocumentResponseDto {
  @ApiProperty({ description: 'Идентификатор документа', example: 'cly1b2c3d0000abcxyz12345' })
  id: string;

  @ApiProperty({ description: 'Исходное имя загруженного файла', example: 'referat.docx' })
  originalName: string;

  @ApiProperty({ description: 'Определённый по сигнатуре байт MIME-тип файла', example: 'application/pdf' })
  mimeType: string;

  @ApiProperty({ description: 'SHA-256 хэш содержимого файла (используется для кэширования результата)', example: 'a3f5...' })
  contentHash: string;

  @ApiProperty({
    description: 'Статус обработки документа',
    enum: DocumentStatus,
    example: DocumentStatus.PENDING,
  })
  status: DocumentStatus;

  @ApiPropertyOptional({ description: 'Причина ошибки, если статус FAILED', example: null, nullable: true })
  failureReason?: string | null;

  @ApiProperty({ description: 'Количество символов с пробелами', example: 12000 })
  charCount: number;

  @ApiProperty({ description: 'Количество символов без пробелов', example: 10200 })
  charCountNoSpaces: number;

  @ApiProperty({ description: 'Количество слов', example: 1800 })
  wordCount: number;

  @ApiProperty({ description: 'Количество предложений', example: 120 })
  sentenceCount: number;

  @ApiProperty({ description: 'Количество абзацев', example: 25 })
  paragraphCount: number;

  @ApiProperty({ description: 'Количество страниц по текущему нормативу символов на страницу', example: 7 })
  pageCount: number;

  @ApiProperty({ description: 'Средняя длина предложения в словах', example: 15.2 })
  avgSentenceLength: number;

  @ApiProperty({ description: 'Оценочное время чтения документа, в минутах (из расчёта 200 слов/мин)', example: 9 })
  readingTimeMinutes: number;

  @ApiPropertyOptional({ description: 'Доминирующий язык документа (ISO 639-1)', example: 'ru', nullable: true })
  language?: string | null;

  @ApiPropertyOptional({
    description: 'Разбивка по языкам в процентах, если документ смешанный',
    example: { ru: 92.5, en: 7.5 },
    nullable: true,
  })
  languageBreakdown?: Record<string, number> | null;

  @ApiProperty({ description: 'Дата загрузки документа', example: '2026-09-14T12:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Результат анализа (заполняется после завершения обработки, статус DONE)', type: AnalysisResultDto, nullable: true })
  result?: AnalysisResultDto | null;
}
