import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddCorpusDocumentDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Файл документа-источника (PDF, DOCX или TXT), с которым будут сверяться проверяемые работы',
  })
  file: unknown;

  @ApiProperty({ description: 'Название источника', example: 'Иванов И.И. Курсовая работа, 2024' })
  @IsString()
  @IsNotEmpty({ message: 'title обязателен' })
  title: string;

  @ApiPropertyOptional({ description: 'Ссылка на первоисточник, если применимо', example: 'https://example.com/source.pdf' })
  @IsOptional()
  @IsString()
  sourceUrl?: string;
}
