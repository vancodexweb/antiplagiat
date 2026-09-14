import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JunkWordDto } from './dto/junk-word.dto';

@Injectable()
export class JunkWordsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<JunkWordDto[]> {
    return this.prisma.junkWord.findMany({ orderBy: { word: 'asc' } });
  }

  async add(word: string): Promise<JunkWordDto> {
    const normalized = word.trim().toLowerCase();
    return this.prisma.junkWord.upsert({
      where: { word: normalized },
      create: { word: normalized },
      update: {},
    });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.junkWord.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Слово с указанным ID не найдено в словаре мусорных слов');
    }
    await this.prisma.junkWord.delete({ where: { id } });
  }
}
