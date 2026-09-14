import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TextExtractionService } from '../documents/extraction/text-extraction.service';
import { ShinglingService } from '../shingling/shingling.service';
import { LshIndexService } from '../shingling/lsh-index.service';
import { computeMinHashSignature } from '../shingling/minhash';
import { chunkShingles, CHUNK_SIZE, CHUNK_STRIDE } from '../shingling/chunk-shingles';
import { NlpClientService } from '../nlp-client/nlp-client.service';
import { VectorSearchService } from '../vector-search/vector-search.service';
import { CorpusDocumentResponseDto } from './dto/corpus-document-response.dto';

type CorpusDocumentWithCount = Prisma.CorpusDocumentGetPayload<{ include: { _count: { select: { shingles: true } } } }>;

@Injectable()
export class CorpusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly extraction: TextExtractionService,
    private readonly shingling: ShinglingService,
    private readonly lshIndex: LshIndexService,
    private readonly nlpClient: NlpClientService,
    private readonly vectorSearch: VectorSearchService,
  ) {}

  async addDocument(file: Express.Multer.File, title: string, sourceUrl?: string): Promise<CorpusDocumentResponseDto> {
    const { text } = await this.extraction.extract(file.buffer, file.originalname, file.mimetype);
    const contentHash = createHash('sha256').update(file.buffer).digest('hex');

    const existing = await this.prisma.corpusDocument.findUnique({
      where: { contentHash },
      include: { _count: { select: { shingles: true } } },
    });
    if (existing) {
      return this.toDto(existing);
    }

    const shingles = this.shingling.generateShingles(text);

    const corpusDocument = await this.prisma.corpusDocument.create({
      data: {
        title,
        sourceUrl,
        contentHash,
        rawText: text,
        shingles: {
          createMany: {
            data: shingles.map((s) => ({ hash: s.hashHex, position: s.position })),
          },
        },
      },
      include: { _count: { select: { shingles: true } } },
    });

    // Индексируем не документ целиком, а каждое окно шинглов — иначе
    // скопированный из этого источника абзац не пройдёт LSH-фильтр в
    // большом чужом документе (см. chunk-shingles.ts).
    for (const chunk of chunkShingles(shingles, CHUNK_SIZE, CHUNK_STRIDE)) {
      const signature = computeMinHashSignature(chunk.map((s) => s.hash));
      await this.lshIndex.indexCorpusDocument(corpusDocument.id, signature);
    }

    // Эмбеддинги предложений источника — для детекции перефразирования
    // (раздел 3.2 ТЗ), сверяются через pgvector в ParaphraseService.
    const sentences = await this.nlpClient.embedSentences(text);
    await this.vectorSearch.replaceSentences('CorpusSentenceEmbedding', corpusDocument.id, sentences);

    return this.toDto(corpusDocument);
  }

  private toDto(doc: CorpusDocumentWithCount): CorpusDocumentResponseDto {
    return {
      id: doc.id,
      title: doc.title,
      sourceUrl: doc.sourceUrl,
      contentHash: doc.contentHash,
      shingleCount: doc._count.shingles,
      createdAt: doc.createdAt,
    };
  }
}
