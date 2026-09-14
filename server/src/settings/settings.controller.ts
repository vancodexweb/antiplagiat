import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { PageNormDto, UpdatePageNormDto } from './dto/page-norm.dto';

@ApiTags('Конфигурация')
@Controller('config')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('page-norm')
  @ApiOperation({ summary: 'Получить текущий норматив символов на одну страницу' })
  @ApiResponse({ status: 200, description: 'Текущий норматив', type: PageNormDto })
  async getPageNorm(): Promise<PageNormDto> {
    const charsPerPage = await this.settingsService.getPageNormChars();
    return { charsPerPage };
  }

  @Put('page-norm')
  @ApiOperation({ summary: 'Изменить норматив символов на одну страницу' })
  @ApiResponse({ status: 200, description: 'Норматив обновлён', type: PageNormDto })
  @ApiResponse({ status: 422, description: 'Ошибка валидации входных данных' })
  async updatePageNorm(@Body() dto: UpdatePageNormDto): Promise<PageNormDto> {
    const charsPerPage = await this.settingsService.setPageNormChars(dto.charsPerPage);
    return { charsPerPage };
  }
}
