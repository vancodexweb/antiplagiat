import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JunkWordsService } from './junk-words.service';
import { CreateJunkWordDto, JunkWordDto } from './dto/junk-word.dto';

@ApiTags('Конфигурация')
@Controller('config/junk-words')
export class JunkWordsController {
  constructor(private readonly junkWordsService: JunkWordsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить словарь мусорных слов/филлеров' })
  @ApiResponse({ status: 200, description: 'Словарь мусорных слов', type: [JunkWordDto] })
  list(): Promise<JunkWordDto[]> {
    return this.junkWordsService.list();
  }

  @Post()
  @ApiOperation({ summary: 'Добавить слово в словарь мусорных слов' })
  @ApiResponse({ status: 201, description: 'Слово добавлено', type: JunkWordDto })
  @ApiResponse({ status: 422, description: 'Ошибка валидации входных данных' })
  add(@Body() dto: CreateJunkWordDto): Promise<JunkWordDto> {
    return this.junkWordsService.add(dto.word);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить слово из словаря мусорных слов' })
  @ApiResponse({ status: 200, description: 'Слово удалено' })
  @ApiResponse({ status: 404, description: 'Слово с указанным ID не найдено' })
  remove(@Param('id') id: string): Promise<void> {
    return this.junkWordsService.remove(id);
  }
}
