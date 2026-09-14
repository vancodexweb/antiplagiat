import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class JunkWordDto {
  @ApiProperty({ description: 'Идентификатор записи словаря', example: 'cly1b2c3d0000abcxyz12345' })
  id: string;

  @ApiProperty({ description: 'Мусорное слово или филлер', example: 'короче' })
  word: string;
}

export class CreateJunkWordDto {
  @ApiProperty({ description: 'Мусорное слово или филлер для добавления в словарь', example: 'короче' })
  @IsString()
  @IsNotEmpty({ message: 'word обязателен' })
  word: string;
}
