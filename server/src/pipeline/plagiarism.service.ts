import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShinglingService } from '../shingling/shingling.service';
import { LshIndexService } from '../shingling/lsh-index.service';
import { computeMinHashSignature } from '../shingling/minhash';
import { chunkShingles, CHUNK_SIZE, CHUNK_STRIDE } from '../shingling/chunk-shingles';
import { AnalysisResultService } from '../results/analysis-result.service';

interface PlagiarismSource {
  corpusDocumentId: string;
  title: string;
  matchedShingles: number;
}

interface PlagiarismDetails {
  shingleSize: number;
  totalShingles: number;
  matchedShingles: number;
  sources: PlagiarismSource[];
}

/**
 * Точное дублирование (раздел 3.2 ТЗ): шинглы документа сверяются с
 * корпусом через LSH-кандидатов (быстрый отбор) и затем точным
 * пересечением множеств хешей в Postgres (финальная проверка).
 */
@Injectable()
export class PlagiarismService {
  private readonly logger = new Logger(PlagiarismService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly shingling: ShinglingService,
    private readonly lshIndex: LshIndexService,
    private readonly results: AnalysisResultService,
  ) {}

  async analyze(documentId: string, rawText: string): Promise<void> {
    const shingles = this.shingling.generateShingles(rawText);

    // Предыдущий анализ (если это повторная обработка) не должен оставлять
    // задвоенные шинглы.
    await this.prisma.shingle.deleteMany({ where: { documentId } });
    if (shingles.length > 0) {
      await this.prisma.shingle.createMany({
        data: shingles.map((s) => ({ documentId, hash: s.hashHex, position: s.position })),
      });
    }

    if (shingles.length === 0) {
      await this.writeResult(documentId, { shingleSize: this.shingling.windowSize, totalShingles: 0, matchedShingles: 0, sources: [] }, 0);
      return;
    }

    // Кандидатов ищем по каждому окну шинглов отдельно (см. chunk-shingles.ts),
    // чтобы найти совпадение, даже если скопирован только один абзац.
    const chunks = chunkShingles(shingles, CHUNK_SIZE, CHUNK_STRIDE);
    const candidateIdLists = await Promise.all(
      chunks.map((chunk) => this.lshIndex.findCandidateIds(computeMinHashSignature(chunk.map((s) => s.hash)))),
    );
    const candidateIds = Array.from(new Set(candidateIdLists.flat()));

    if (candidateIds.length === 0) {
      await this.writeResult(
        documentId,
        { shingleSize: this.shingling.windowSize, totalShingles: shingles.length, matchedShingles: 0, sources: [] },
        0,
      );
      return;
    }

    const documentHashes = shingles.map((s) => s.hashHex);

    const matches = await this.prisma.corpusShingle.findMany({
      where: { documentId: { in: candidateIds }, hash: { in: documentHashes } },
      select: { hash: true, documentId: true },
    });

    const matchedHashSet = new Set(matches.map((m) => m.hash));
    const matchedByCorpusDoc = new Map<string, number>();
    for (const match of matches) {
      matchedByCorpusDoc.set(match.documentId, (matchedByCorpusDoc.get(match.documentId) ?? 0) + 1);
    }

    const corpusDocs = await this.prisma.corpusDocument.findMany({
      where: { id: { in: [...matchedByCorpusDoc.keys()] } },
      select: { id: true, title: true },
    });

    const sources: PlagiarismSource[] = corpusDocs.map((doc) => ({
      corpusDocumentId: doc.id,
      title: doc.title,
      matchedShingles: matchedByCorpusDoc.get(doc.id) ?? 0,
    }));

    const plagiarismPct = Math.round((matchedHashSet.size / shingles.length) * 1000) / 10;

    await this.writeResult(
      documentId,
      {
        shingleSize: this.shingling.windowSize,
        totalShingles: shingles.length,
        matchedShingles: matchedHashSet.size,
        sources,
      },
      plagiarismPct,
    );

    this.logger.log(`Документ ${documentId}: plagiarismPct=${plagiarismPct}% (кандидатов: ${candidateIds.length})`);
  }

  private async writeResult(documentId: string, details: PlagiarismDetails, plagiarismPct: number): Promise<void> {
    await this.results.mergeDetails(documentId, 'plagiarism', details, { plagiarismPct });
    await this.results.recomputeOriginality(documentId);
  }
}
