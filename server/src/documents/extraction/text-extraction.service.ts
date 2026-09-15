import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mammoth from 'mammoth';
import { UnsupportedFileTypeException } from '../../common/exceptions/app.exceptions';
import { NlpClientService } from '../../nlp-client/nlp-client.service';

export interface ExtractionResult {
  text: string;
  mimeType: string;
  ocrApplied: boolean;
}

// Белый список типов файлов — проверяется по сигнатуре байтов (file-type),
// а не по расширению или Content-Type из запроса, которым нельзя доверять.
const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

// Если в PDF есть страницы, но извлечённого текста почти нет — это скан
// без текстового слоя (раздел 3.9 ТЗ), а не документ с реально пустыми
// страницами.
const SCANNED_PDF_CHARS_PER_PAGE_THRESHOLD = 20;

@Injectable()
export class TextExtractionService {
  private readonly logger = new Logger(TextExtractionService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly nlpClient: NlpClientService,
  ) {}

  async extract(buffer: Buffer, originalName: string, declaredMimeType: string): Promise<ExtractionResult> {
    const mimeType = await this.detectMimeType(buffer, originalName, declaredMimeType);

    switch (mimeType) {
      case 'application/pdf':
        return this.extractFromPdfWithOcrFallback(buffer, mimeType);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return { text: await this.extractFromDocx(buffer), mimeType, ocrApplied: false };
      case 'text/plain':
        return { text: buffer.toString('utf-8'), mimeType, ocrApplied: false };
      default:
        throw new UnsupportedFileTypeException(mimeType);
    }
  }

  private async detectMimeType(buffer: Buffer, originalName: string, declaredMimeType: string): Promise<string> {
    // file-type — ESM-only пакет, поэтому подключаем его динамическим import()
    // даже из CommonJS-кода (это стандартный и рабочий способ интеропа в Node).
    const { fileTypeFromBuffer } = await import('file-type');
    const detected = await fileTypeFromBuffer(buffer);

    if (detected) {
      if (!SUPPORTED_MIME_TYPES.has(detected.mime)) {
        throw new UnsupportedFileTypeException(detected.mime);
      }
      return detected.mime;
    }

    // У обычного текстового файла нет магических байт-сигнатур, поэтому для
    // text/plain делаем единственное осознанное исключение и доверяем
    // расширению/заявленному mime-типу, предварительно убедившись, что
    // содержимое действительно похоже на текст (нет NUL-байтов).
    const looksLikePlainText = !buffer.subarray(0, 8000).includes(0);
    const declaredAsText = declaredMimeType === 'text/plain' || originalName.toLowerCase().endsWith('.txt');
    if (looksLikePlainText && declaredAsText) {
      return 'text/plain';
    }

    throw new UnsupportedFileTypeException(declaredMimeType || 'unknown');
  }

  private async extractFromPdfWithOcrFallback(buffer: Buffer, mimeType: string): Promise<ExtractionResult> {
    const { text, pageCount } = await this.extractFromPdf(buffer);

    const ocrEnabled = this.config.get<string>('ENABLE_OCR', 'true') === 'true';
    if (!ocrEnabled || !this.looksLikeScannedPdf(text, pageCount)) {
      return { text, mimeType, ocrApplied: false };
    }

    this.logger.log(`PDF без текстового слоя (${pageCount} стр.) — запускаю OCR через nlp-service`);
    try {
      const ocrText = await this.nlpClient.ocrPdf(buffer);
      if (ocrText !== null) {
        return { text: ocrText, mimeType, ocrApplied: true };
      }
      this.logger.warn('OCR выключен на стороне nlp-service (ENABLE_OCR=false) — возвращаю пустой текст');
    } catch (error) {
      this.logger.warn(`OCR не удался: ${error instanceof Error ? error.message : String(error)}`);
    }

    return { text, mimeType, ocrApplied: false };
  }

  private looksLikeScannedPdf(text: string, pageCount: number): boolean {
    if (pageCount === 0) return false;
    return text.trim().length / pageCount < SCANNED_PDF_CHARS_PER_PAGE_THRESHOLD;
  }

  private async extractFromPdf(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return { text: result.text ?? '', pageCount: result.total ?? result.pages?.length ?? 0 };
    } finally {
      await parser.destroy();
    }
  }

  private async extractFromDocx(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
}
