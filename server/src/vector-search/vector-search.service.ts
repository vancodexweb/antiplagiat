import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { EmbeddedSentence } from '../nlp-client/nlp-client.service';

export type EmbeddingTable = 'SentenceEmbedding' | 'CorpusSentenceEmbedding';

export interface NearestSentenceMatch {
  corpusDocumentId: string;
  title: string;
  similarity: number;
}

/**
 * Prisma не поддерживает поля Unsupported("vector(384)") в типизированном
 * API — работа с эмбеддингами предложений идёт через "сырой" SQL и
 * оператор pgvector `<=>` (косинусное расстояние). Имя таблицы никогда не
 * приходит от пользователя — только из фиксированного набора значений
 * EmbeddingTable, поэтому подстановка в запрос безопасна.
 */
@Injectable()
export class VectorSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async replaceSentences(table: EmbeddingTable, documentId: string, sentences: EmbeddedSentence[]): Promise<void> {
    await this.prisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "documentId" = $1`, documentId);

    for (const sentence of sentences) {
      const vectorLiteral = toVectorLiteral(sentence.embedding);
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "${table}" (id, "documentId", sentence, position, embedding) VALUES ($1, $2, $3, $4, $5::vector)`,
        randomUUID(),
        documentId,
        sentence.text,
        sentence.position,
        vectorLiteral,
      );
    }
  }

  async findNearestCorpusSentence(embedding: number[]): Promise<NearestSentenceMatch | null> {
    const vectorLiteral = toVectorLiteral(embedding);
    const rows = await this.prisma.$queryRawUnsafe<NearestSentenceMatch[]>(
      `SELECT cse."documentId" as "corpusDocumentId", cd.title as title, 1 - (cse.embedding <=> $1::vector) as similarity
       FROM "CorpusSentenceEmbedding" cse
       JOIN "CorpusDocument" cd ON cd.id = cse."documentId"
       ORDER BY cse.embedding <=> $1::vector
       LIMIT 1`,
      vectorLiteral,
    );
    return rows[0] ?? null;
  }
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}
