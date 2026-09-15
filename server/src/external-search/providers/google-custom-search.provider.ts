import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExternalSearchMatch, ExternalSearchProvider } from '../external-search-provider.interface';

/**
 * Google Programmable Search Engine (Custom Search JSON API):
 * https://developers.google.com/custom-search/v1/overview
 */
@Injectable()
export class GoogleCustomSearchProvider implements ExternalSearchProvider {
  readonly name = 'google';
  private readonly logger = new Logger(GoogleCustomSearchProvider.name);

  constructor(private readonly config: ConfigService) {}

  async search(query: string): Promise<ExternalSearchMatch[]> {
    const apiKey = this.config.get<string>('GOOGLE_CSE_API_KEY');
    const engineId = this.config.get<string>('GOOGLE_CSE_ENGINE_ID');
    if (!apiKey || !engineId) {
      this.logger.warn('GOOGLE_CSE_API_KEY/GOOGLE_CSE_ENGINE_ID не заданы — пропускаю запрос');
      return [];
    }

    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', engineId);
    url.searchParams.set('q', query);
    // Точная фраза — ищем именно дословное совпадение шингла.
    url.searchParams.set('exactTerms', query);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Google CSE ответил ${response.status}`);
    }

    const data = (await response.json()) as { items?: { link: string; title: string; snippet: string }[] };
    return (data.items ?? []).map((item) => ({ url: item.link, title: item.title, snippet: item.snippet }));
  }
}
