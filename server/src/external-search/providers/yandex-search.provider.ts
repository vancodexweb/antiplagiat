import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExternalSearchMatch, ExternalSearchProvider } from '../external-search-provider.interface';

/**
 * Yandex Search API (XML): https://yandex.cloud/docs/search-api/operations/get-html
 * Ответ — XML; разбираем точечными регулярками по блокам <doc>...</doc>
 * (по аналогии с разбором DOCX в tampering.service.ts — без отдельной
 * зависимости на полноценный XML-парсер ради одного простого случая).
 */
@Injectable()
export class YandexSearchProvider implements ExternalSearchProvider {
  readonly name = 'yandex';
  private readonly logger = new Logger(YandexSearchProvider.name);

  constructor(private readonly config: ConfigService) {}

  async search(query: string): Promise<ExternalSearchMatch[]> {
    const apiKey = this.config.get<string>('YANDEX_SEARCH_API_KEY');
    const folderId = this.config.get<string>('YANDEX_SEARCH_FOLDER_ID');
    if (!apiKey || !folderId) {
      this.logger.warn('YANDEX_SEARCH_API_KEY/YANDEX_SEARCH_FOLDER_ID не заданы — пропускаю запрос');
      return [];
    }

    const url = new URL('https://yandex.com/search/xml');
    url.searchParams.set('folderid', folderId);
    url.searchParams.set('apikey', apiKey);
    url.searchParams.set('query', `"${query}"`);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Yandex Search API ответил ${response.status}`);
    }

    const xml = await response.text();
    return this.parseDocs(xml);
  }

  private parseDocs(xml: string): ExternalSearchMatch[] {
    const matches: ExternalSearchMatch[] = [];
    const docRe = /<doc>([\s\S]*?)<\/doc>/g;
    let docMatch: RegExpExecArray | null;
    while ((docMatch = docRe.exec(xml)) !== null) {
      const block = docMatch[1];
      const url = this.extractTag(block, 'url');
      if (!url) continue;
      const title = this.stripMarkup(this.extractTag(block, 'title')) ?? url;
      const passage = this.stripMarkup(this.extractTag(block, 'passage')) ?? '';
      matches.push({ url, title, snippet: passage });
    }
    return matches;
  }

  private extractTag(block: string, tag: string): string | null {
    const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(block);
    return match ? match[1].trim() : null;
  }

  private stripMarkup(value: string | null): string | null {
    return value === null ? null : value.replace(/<[^>]+>/g, '').trim();
  }
}
