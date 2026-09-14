import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { fnv1a } from './fnv-hash';
import { NUM_HASHES } from './minhash';

const BANDS = 16;
const ROWS = NUM_HASHES / BANDS; // 4 строки в банде

/**
 * LSH-индекс в Redis (раздел 0, 3.2 ТЗ): сигнатура разбивается на BANDS
 * "полос", каждая хешируется в бакет — документы, совпавшие хотя бы в
 * одной полосе, считаются кандидатами на дальнейшую точную проверку.
 * Это на порядки быстрее полного перебора корпуса при большом количестве
 * источников.
 */
@Injectable()
export class LshIndexService {
  constructor(private readonly redis: RedisService) {}

  private bandKeys(signature: number[]): string[] {
    const keys: string[] = [];
    for (let b = 0; b < BANDS; b++) {
      const slice = signature.slice(b * ROWS, (b + 1) * ROWS);
      const bucket = fnv1a(slice.join(':'));
      keys.push(`lsh:band:${b}:${bucket}`);
    }
    return keys;
  }

  async indexCorpusDocument(corpusDocumentId: string, signature: number[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    for (const key of this.bandKeys(signature)) {
      pipeline.sadd(key, corpusDocumentId);
    }
    await pipeline.exec();
  }

  async removeCorpusDocument(corpusDocumentId: string, signature: number[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    for (const key of this.bandKeys(signature)) {
      pipeline.srem(key, corpusDocumentId);
    }
    await pipeline.exec();
  }

  async findCandidateIds(signature: number[]): Promise<string[]> {
    const keys = this.bandKeys(signature);
    if (keys.length === 0) return [];
    const results = await Promise.all(keys.map((key) => this.redis.smembers(key)));
    return Array.from(new Set(results.flat()));
  }
}
