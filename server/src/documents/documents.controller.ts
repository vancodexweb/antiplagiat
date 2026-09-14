import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentResponseDto } from './dto/document-response.dto';

// Жёсткий верхний предел на приём файла в память — защита от злоупотребления
// запросами; настоящий бизнес-лимит (MAX_FILE_SIZE_MB) проверяется в
// DocumentsService и возвращает корректный FILE_TOO_LARGE.
const HARD_UPLOAD_LIMIT_BYTES = 200 * 1024 * 1024;

@ApiTags('Документы')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Загрузить документ на проверку' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadDocumentDto })
  @ApiResponse({ status: 201, description: 'Документ принят, базовые метрики посчитаны', type: DocumentResponseDto })
  @ApiResponse({ status: 413, description: 'Файл превышает допустимый размер' })
  @ApiResponse({ status: 415, description: 'Неподдерживаемый тип файла' })
  @ApiResponse({ status: 422, description: 'Ошибка валидации входных данных' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: HARD_UPLOAD_LIMIT_BYTES } }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDocumentDto,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.uploadDocument(file, body.authorEmail);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить статус, метрики и результат анализа документа' })
  @ApiResponse({ status: 200, description: 'Документ найден', type: DocumentResponseDto })
  @ApiResponse({ status: 404, description: 'Документ с указанным ID не найден' })
  async getById(@Param('id') id: string): Promise<DocumentResponseDto> {
    return this.documentsService.getById(id);
  }
}
