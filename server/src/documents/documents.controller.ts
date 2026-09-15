import { Body, Controller, Get, MessageEvent, Param, Post, Sse, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Observable, timer } from 'rxjs';
import { map, switchMap, takeWhile } from 'rxjs/operators';
import { DocumentStatus } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import { DocumentDetailsDto } from './dto/document-details.dto';

const STREAM_POLL_INTERVAL_MS = 2000;
const TERMINAL_STATUSES: DocumentStatus[] = [DocumentStatus.DONE, DocumentStatus.FAILED];

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

  @Get(':id/details')
  @ApiOperation({ summary: 'Получить полную разбивку по всем маркерам анализа документа' })
  @ApiResponse({ status: 200, description: 'Полная разбивка по маркерам', type: DocumentDetailsDto })
  @ApiResponse({ status: 404, description: 'Документ с указанным ID не найден' })
  async getDetails(@Param('id') id: string): Promise<DocumentDetailsDto> {
    return this.documentsService.getDetails(id);
  }

  @Sse(':id/stream')
  @ApiOperation({
    summary: 'SSE-уведомление о готовности результата анализа (альтернатива поллингу GET /api/documents/:id)',
  })
  @ApiResponse({ status: 200, description: 'Поток событий text/event-stream со статусом документа' })
  @ApiResponse({ status: 404, description: 'Документ с указанным ID не найден' })
  stream(@Param('id') id: string): Observable<MessageEvent> {
    // Опциональный эндпоинт (раздел 2, пункт 6 ТЗ) — вместо отдельного
    // механизма уведомлений просто периодически перечитывает статус
    // документа и закрывает поток, как только он становится терминальным.
    return timer(0, STREAM_POLL_INTERVAL_MS).pipe(
      switchMap(() => this.documentsService.getById(id)),
      map((document) => ({ data: document })),
      takeWhile((event) => !TERMINAL_STATUSES.includes((event.data as DocumentResponseDto).status), true),
    );
  }
}
