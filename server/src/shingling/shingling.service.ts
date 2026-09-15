import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizeToWords } from './text-normalizer';
import { fnv1a } from './fnv-hash';

export interface ShingleData {
  hash: number; // 32-битный хеш, используется для MinHash
  hashHex: string; // строковое представление для хранения в БД
  position: number;
  phrase: string; // исходный текст шингла — нужен для запросов ExternalSearchProvider
}

/**
 * Шинглирование — скользящее окно из N слов (раздел 3.2 ТЗ). Совпадающие
 * шинглы у двух документов означают дословное совпадение фрагмента текста
 * длиной N слов — это и есть "точное дублирование".
 */
@Injectable()
export class ShinglingService {
  constructor(private readonly config: ConfigService) {}

  get windowSize(): number {
    return Number(this.config.get('SHINGLE_SIZE', '5'));
  }

  generateShingles(text: string): ShingleData[] {
    const words = normalizeToWords(text);
    const size = this.windowSize;
    if (words.length < size) {
      return [];
    }

    const shingles: ShingleData[] = [];
    for (let i = 0; i <= words.length - size; i++) {
      const phrase = words.slice(i, i + size).join(' ');
      const hash = fnv1a(phrase);
      shingles.push({ hash, hashHex: hash.toString(16).padStart(8, '0'), position: i, phrase });
    }
    return shingles;
  }
}
