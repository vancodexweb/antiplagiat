import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class DetectorWeightDto {
  @ApiProperty({ description: 'Идентификатор записи веса', example: 'cly1b2c3d0000abcxyz12345' })
  id: string;

  @ApiProperty({ description: 'Название фичи детектора ИИ', example: 'burstiness' })
  feature: string;

  @ApiProperty({ description: 'Вес фичи во взвешенной сумме', example: 0.25 })
  weight: number;

  @ApiProperty({ description: 'Учитывается ли фича при расчёте aiProbability', example: true })
  enabled: boolean;
}

export class UpdateDetectorWeightDto {
  @ApiProperty({ description: 'Название фичи детектора (совпадает с ключом в коде)', example: 'burstiness' })
  @IsString()
  @IsNotEmpty({ message: 'feature обязателен' })
  feature: string;

  @ApiProperty({ description: 'Новый вес фичи во взвешенной сумме', example: 0.3 })
  @IsNumber({}, { message: 'weight должен быть числом' })
  weight: number;

  @ApiPropertyOptional({ description: 'Включить/выключить фичу', example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateDetectorWeightsDto {
  @ApiProperty({ description: 'Список весов для обновления (upsert по feature)', type: [UpdateDetectorWeightDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateDetectorWeightDto)
  weights: UpdateDetectorWeightDto[];
}
