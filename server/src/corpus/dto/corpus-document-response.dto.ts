import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CorpusDocumentResponseDto {
  @ApiProperty({ description: 'Идентификатор документа корпуса', example: 'cly1b2c3d0000abcxyz12345' })
  id: string;

  @ApiProperty({ description: 'Название источника', example: 'Иванов И.И. Курсовая работа, 2024' })
  title: string;

  @ApiPropertyOptional({ description: 'Ссылка на первоисточник', example: null, nullable: true })
  sourceUrl?: string | null;

  @ApiProperty({ description: 'SHA-256 хэш содержимого файла', example: 'a3f5...' })
  contentHash: string;

  @ApiProperty({ description: 'Количество шинглов, извлечённых из документа', example: 842 })
  shingleCount: number;

  @ApiProperty({ description: 'Дата добавления в корпус', example: '2026-09-14T12:00:00.000Z' })
  createdAt: Date;
}
