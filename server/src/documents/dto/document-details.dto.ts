import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus } from '@prisma/client';

export class TamperingFlagDto {
  @ApiProperty({ description: 'Тип попытки обмана системы', example: 'HOMOGLYPH', enum: ['HOMOGLYPH', 'ZERO_WIDTH', 'HIDDEN_TEXT', 'TINY_FONT'] })
  type: string;

  @ApiPropertyOptional({ description: 'Позиция в тексте, если применимо', example: 42, nullable: true })
  position: number | null;

  @ApiPropertyOptional({ description: 'Пояснение находки', example: 'Символ "а" похож на "a" из другого алфавита', nullable: true })
  details: string | null;
}

export class DocumentMetadataDto {
  @ApiPropertyOptional({ description: 'Дата создания файла из метаданных', nullable: true })
  createdAtRaw: Date | null;

  @ApiPropertyOptional({ description: 'Дата последнего изменения файла из метаданных', nullable: true })
  modifiedAtRaw: Date | null;

  @ApiPropertyOptional({ description: 'Автор из метаданных файла', nullable: true })
  author: string | null;

  @ApiPropertyOptional({ description: 'ПО-производитель файла', nullable: true })
  producer: string | null;

  @ApiProperty({ description: 'Признак подозрительности метаданных (см. раздел 3.8 ТЗ)' })
  suspicious: boolean;

  @ApiPropertyOptional({ description: 'Пояснение, почему метаданные помечены подозрительными', nullable: true })
  suspicionNote: string | null;
}

export class DocumentDetailsDto {
  @ApiProperty({ description: 'Идентификатор документа' })
  id: string;

  @ApiProperty({ description: 'Статус обработки документа', enum: DocumentStatus })
  status: DocumentStatus;

  @ApiPropertyOptional({
    description: 'Полная разбивка по всем маркерам анализа (по стадиям пайплайна)',
    nullable: true,
    type: 'object',
    additionalProperties: true,
  })
  details: Record<string, unknown> | null;

  @ApiProperty({ description: 'Найденные попытки обмана системы', type: [TamperingFlagDto] })
  tamperingFlags: TamperingFlagDto[];

  @ApiPropertyOptional({ description: 'Метаданные документа', type: DocumentMetadataDto, nullable: true })
  metadata: DocumentMetadataDto | null;
}
