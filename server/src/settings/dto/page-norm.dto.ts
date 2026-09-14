import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class PageNormDto {
  @ApiProperty({
    description: 'Норматив количества символов (с пробелами), который считается одной "страницей" при расчёте метрики pageCount',
    example: 1800,
  })
  charsPerPage: number;
}

export class UpdatePageNormDto {
  @ApiProperty({
    description: 'Новый норматив символов (с пробелами) на одну страницу',
    example: 1800,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'charsPerPage должен быть целым числом' })
  @Min(1, { message: 'charsPerPage должен быть больше нуля' })
  charsPerPage: number;
}
