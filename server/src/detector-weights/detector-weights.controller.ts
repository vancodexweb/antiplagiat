import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DetectorWeightsService } from './detector-weights.service';
import { DetectorWeightDto, UpdateDetectorWeightsDto } from './dto/detector-weight.dto';

@ApiTags('Конфигурация')
@Controller('config/weights')
export class DetectorWeightsController {
  constructor(private readonly detectorWeightsService: DetectorWeightsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить веса детектора ИИ-сгенерированного текста' })
  @ApiResponse({ status: 200, description: 'Текущие веса фич детектора', type: [DetectorWeightDto] })
  list(): Promise<DetectorWeightDto[]> {
    return this.detectorWeightsService.list();
  }

  @Put()
  @ApiOperation({ summary: 'Обновить веса детектора ИИ-сгенерированного текста' })
  @ApiResponse({ status: 200, description: 'Веса обновлены', type: [DetectorWeightDto] })
  @ApiResponse({ status: 422, description: 'Ошибка валидации входных данных' })
  update(@Body() dto: UpdateDetectorWeightsDto): Promise<DetectorWeightDto[]> {
    return this.detectorWeightsService.updateMany(dto.weights);
  }
}
