import { Injectable, Logger } from '@nestjs/common';
import * as mammoth from 'mammoth';
import { UnsupportedFileTypeException } from '../../common/exceptions/app.exceptions';

export interface ExtractionResult {
  text: string;
  mimeType: string;
}

// Белый список типов файлов — проверяется по сигнатуре байтов (file-type),
// а не по расширению или Content-Type из запроса, которым нельзя доверять.
const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

@Injectable()
export class TextExtractionService {
  private readonly logger = new Logger(TextExtractionService.name);

  async extract(buffer: Buffer, originalName: string, declaredMimeType: string): Promise<ExtractionResult> {
    const mimeType = await this.detectMimeType(buffer, originalName, declaredMimeType);

    switch (mimeType) {
      case 'application/pdf':
        return { text: await this.extractFromPdf(buffer), mimeType };
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return { text: await this.extractFromDocx(buffer), mimeType };
      case 'text/plain':
        return { text: buffer.toString('utf-8'), mimeType };
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

  private async extractFromPdf(buffer: Buffer): Promise<string> {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text ?? '';
    } finally {
      await parser.destroy();
    }
  }

  private async extractFromDocx(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
}
