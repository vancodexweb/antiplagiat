import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { TextExtractionService } from './extraction/text-extraction.service';
import { BasicMetricsService } from './metrics/basic-metrics.service';
import { LanguageDetectionService } from './language/language-detection.service';
import { DocumentResponseDto } from './dto/document-response.dto';
import { DocumentNotFoundException, FileTooLargeException } from '../common/exceptions/app.exceptions';

type DocumentWithResult = Prisma.DocumentGetPayload<{ include: { result: true } }>;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly extraction: TextExtractionService,
    private readonly basicMetrics: BasicMetricsService,
    private readonly languageDetection: LanguageDetectionService,
    private readonly settings: SettingsService,
    private readonly configService: ConfigService,
  ) {}

  async uploadDocument(file: Express.Multer.File, authorEmail?: string): Promise<DocumentResponseDto> {
    this.assertFileSize(file);

    const contentHash = createHash('sha256').update(file.buffer).digest('hex');

    // Документ с таким же содержимым уже анализировался — отдаём
    // закэшированный результат без повторной обработки (раздел 2, пункт 2).
    const cached = await this.prisma.document.findUnique({ where: { contentHash }, include: { result: true } });
    if (cached) {
      return this.toResponseDto(cached);
    }

    const { text, mimeType } = await this.extraction.extract(file.buffer, file.originalname, file.mimetype);

    const pageNormChars = await this.settings.getPageNormChars();
    const metrics = this.basicMetrics.compute(text, pageNormChars);
    const { dominant, breakdown } = await this.languageDetection.detect(text);

    const authorId = authorEmail ? await this.resolveAuthorId(authorEmail) : undefined;

    const document = await this.prisma.document.create({
      data: {
        authorId,
        originalName: file.originalname,
        mimeType,
        contentHash,
        rawText: text,
        charCount: metrics.charCount,
        charCountNoSpaces: metrics.charCountNoSpaces,
        wordCount: metrics.wordCount,
        sentenceCount: metrics.sentenceCount,
        paragraphCount: metrics.paragraphCount,
        pageCount: metrics.pageCount,
        avgSentenceLength: metrics.avgSentenceLength,
        readingTimeMinutes: metrics.readingTimeMinutes,
        language: dominant === 'und' ? null : dominant,
        languageBreakdown: breakdown as Prisma.InputJsonValue,
      },
      include: { result: true },
    });

    return this.toResponseDto(document);
  }

  async getById(id: string): Promise<DocumentResponseDto> {
    const document = await this.prisma.document.findUnique({ where: { id }, include: { result: true } });
    if (!document) {
      throw new DocumentNotFoundException(id);
    }
    return this.toResponseDto(document);
  }

  private assertFileSize(file: Express.Multer.File): void {
    const maxMb = Number(this.configService.get<string>('MAX_FILE_SIZE_MB', '25'));
    if (file.size > maxMb * 1024 * 1024) {
      throw new FileTooLargeException(maxMb);
    }
  }

  private async resolveAuthorId(email: string): Promise<string> {
    const user = await this.prisma.user.upsert({
      where: { email },
      create: { email },
      update: {},
    });
    return user.id;
  }

  private toResponseDto(document: DocumentWithResult): DocumentResponseDto {
    return {
      id: document.id,
      originalName: document.originalName,
      mimeType: document.mimeType,
      contentHash: document.contentHash,
      status: document.status,
      failureReason: document.failureReason,
      charCount: document.charCount,
      charCountNoSpaces: document.charCountNoSpaces,
      wordCount: document.wordCount,
      sentenceCount: document.sentenceCount,
      paragraphCount: document.paragraphCount,
      pageCount: document.pageCount,
      avgSentenceLength: document.avgSentenceLength,
      readingTimeMinutes: document.readingTimeMinutes,
      language: document.language,
      languageBreakdown: document.languageBreakdown as Record<string, number> | null,
      createdAt: document.createdAt,
      result: document.result
        ? {
            originalityPct: document.result.originalityPct,
            plagiarismPct: document.result.plagiarismPct,
            paraphrasePct: document.result.paraphrasePct,
            selfPlagiarismPct: document.result.selfPlagiarismPct,
            citedPct: document.result.citedPct,
            spamPct: document.result.spamPct,
            junkWordsPct: document.result.junkWordsPct,
            grammarErrors: document.result.grammarErrors,
            readabilityScore: document.result.readabilityScore,
            aiProbability: document.result.aiProbability,
            aiVerdict: document.result.aiVerdict,
            createdAt: document.result.createdAt,
          }
        : null,
    };
  }
}
