import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional } from 'class-validator';

export class UploadDocumentDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Файл документа для проверки (PDF, DOCX или TXT)',
  })
  file: unknown;

  @ApiPropertyOptional({
    description:
      'Email автора документа. Если указан — документ привязывается к пользователю (создаётся при первом обращении), что включает проверку на самоплагиат по его предыдущим работам',
    example: 'student@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'authorEmail должен быть корректным email-адресом' })
  authorEmail?: string;
}
