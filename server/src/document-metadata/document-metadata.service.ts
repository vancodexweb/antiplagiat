import { Injectable, Logger } from '@nestjs/common';
import JSZip from 'jszip';

export interface ExtractedMetadata {
  createdAtRaw: Date | null;
  modifiedAtRaw: Date | null;
  author: string | null;
  producer: string | null;
  suspicious: boolean;
  suspicionNote: string | null;
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Если документ "изменён" в пределах пары минут до загрузки, а "создан"
// заметно раньше — похоже на давно готовый файл, просто открытый и сразу
// сданный (раздел 3.8 ТЗ). У системы нет заявленного срока написания, это
// осознанное упрощение без внешнего входного параметра.
const RECENT_MODIFICATION_WINDOW_MS = 2 * 60 * 1000;
const DORMANT_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Метаданные документа (раздел 3.8 ТЗ) — дата создания/изменения, автор,
 * ПО-производитель, с флагом подозрительности при несогласованных датах.
 */
@Injectable()
export class DocumentMetadataService {
  private readonly logger = new Logger(DocumentMetadataService.name);

  async extract(buffer: Buffer, mimeType: string): Promise<ExtractedMetadata | null> {
    try {
      if (mimeType === 'application/pdf') return await this.extractFromPdf(buffer);
      if (mimeType === DOCX_MIME) return await this.extractFromDocx(buffer);
    } catch (error) {
      this.logger.warn(`Не удалось извлечь метаданные документа: ${error instanceof Error ? error.message : String(error)}`);
    }
    return null;
  }

  private async extractFromPdf(buffer: Buffer): Promise<ExtractedMetadata> {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    try {
      const info = await parser.getInfo();
      const raw = (info.info ?? {}) as Record<string, string | undefined>;
      return this.buildResult(
        parsePdfDate(raw.CreationDate),
        parsePdfDate(raw.ModDate),
        raw.Author ?? null,
        raw.Producer ?? raw.Creator ?? null,
      );
    } finally {
      await parser.destroy();
    }
  }

  private async extractFromDocx(buffer: Buffer): Promise<ExtractedMetadata> {
    const zip = await JSZip.loadAsync(buffer);
    const coreXml = await zip.file('docProps/core.xml')?.async('text');
    const appXml = await zip.file('docProps/app.xml')?.async('text');

    const author = coreXml ? extractTag(coreXml, 'dc:creator') : null;
    const createdRaw = coreXml ? extractTag(coreXml, 'dcterms:created') : null;
    const modifiedRaw = coreXml ? extractTag(coreXml, 'dcterms:modified') : null;
    const producer = appXml ? extractTag(appXml, 'Application') : null;

    return this.buildResult(
      createdRaw ? safeDate(createdRaw) : null,
      modifiedRaw ? safeDate(modifiedRaw) : null,
      author,
      producer,
    );
  }

  private buildResult(
    createdAtRaw: Date | null,
    modifiedAtRaw: Date | null,
    author: string | null,
    producer: string | null,
  ): ExtractedMetadata {
    let suspicious = false;
    let suspicionNote: string | null = null;

    if (createdAtRaw && modifiedAtRaw) {
      if (modifiedAtRaw.getTime() < createdAtRaw.getTime()) {
        suspicious = true;
        suspicionNote = 'Дата изменения раньше даты создания — метаданные документа противоречивы';
      } else {
        const dormantMs = modifiedAtRaw.getTime() - createdAtRaw.getTime();
        const sinceModifiedMs = Date.now() - modifiedAtRaw.getTime();
        if (dormantMs > DORMANT_THRESHOLD_MS && Math.abs(sinceModifiedMs) < RECENT_MODIFICATION_WINDOW_MS) {
          suspicious = true;
          suspicionNote = 'Документ создан задолго до правки, изменён непосредственно перед загрузкой';
        }
      }
    }

    return { createdAtRaw, modifiedAtRaw, author, producer, suspicious, suspicionNote };
  }
}

function parsePdfDate(raw?: string): Date | null {
  if (!raw) return null;
  const match = /^D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/.exec(raw);
  if (!match) return null;
  const [, y, mo, d, h = '00', mi = '00', s = '00'] = match;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)));
  return Number.isNaN(date.getTime()) ? null : date;
}

function safeDate(raw: string): Date | null {
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function extractTag(xml: string, tag: string): string | null {
  const match = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`).exec(xml);
  return match ? match[1].trim() : null;
}
