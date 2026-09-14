import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Каждая стадия пайплайна (шинглы — Шаг 4, эмбеддинги — Шаг 5, грамматика —
 * Шаг 6 и т.д.) знает только про свой раздел отчёта и не должна затирать
 * то, что уже записали остальные стадии — mergeDetails делает
 * read-modify-write поверх detailsJson вместо полной перезаписи.
 */
@Injectable()
export class AnalysisResultService {
  constructor(private readonly prisma: PrismaService) {}

  async mergeDetails(
    documentId: string,
    sectionKey: string,
    sectionValue: unknown,
    scalarFields: Partial<Prisma.AnalysisResultUncheckedCreateInput> = {},
  ): Promise<void> {
    const existing = await this.prisma.analysisResult.findUnique({ where: { documentId } });
    const details = {
      ...((existing?.detailsJson as Record<string, unknown>) ?? {}),
      [sectionKey]: sectionValue,
    };

    await this.prisma.analysisResult.upsert({
      where: { documentId },
      create: { documentId, detailsJson: details as Prisma.InputJsonValue, ...scalarFields },
      update: { detailsJson: details as Prisma.InputJsonValue, ...scalarFields },
    });
  }

  // originalityPct = 100 минус все виды заимствований — пересчитывается
  // заново каждой стадией, которая меняет один из компонентов формулы.
  async recomputeOriginality(documentId: string): Promise<void> {
    const result = await this.prisma.analysisResult.findUnique({ where: { documentId } });
    if (!result) return;

    const raw = 100 - result.plagiarismPct - result.paraphrasePct - result.selfPlagiarismPct;
    const originalityPct = Math.min(100, Math.max(0, Math.round(raw * 10) / 10));

    await this.prisma.analysisResult.update({ where: { documentId }, data: { originalityPct } });
  }
}
