import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CorpusService } from './corpus.service';
import { AddCorpusDocumentDto } from './dto/add-corpus-document.dto';
import { CorpusDocumentResponseDto } from './dto/corpus-document-response.dto';

const HARD_UPLOAD_LIMIT_BYTES = 200 * 1024 * 1024;

@ApiTags('Корпус')
@Controller('corpus')
export class CorpusController {
  constructor(private readonly corpusService: CorpusService) {}

  @Post()
  @ApiOperation({ summary: 'Добавить документ в эталонный корпус для сверки на заимствования' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: AddCorpusDocumentDto })
  @ApiResponse({ status: 201, description: 'Документ добавлен в корпус', type: CorpusDocumentResponseDto })
  @ApiResponse({ status: 415, description: 'Неподдерживаемый тип файла' })
  @ApiResponse({ status: 422, description: 'Ошибка валидации входных данных' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: HARD_UPLOAD_LIMIT_BYTES } }))
  async add(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: AddCorpusDocumentDto,
  ): Promise<CorpusDocumentResponseDto> {
    return this.corpusService.addDocument(file, body.title, body.sourceUrl);
  }
}
