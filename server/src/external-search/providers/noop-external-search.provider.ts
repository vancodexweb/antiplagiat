import { Injectable } from '@nestjs/common';
import { ExternalSearchMatch, ExternalSearchProvider } from '../external-search-provider.interface';

/**
 * Провайдер по умолчанию (EXTERNAL_SEARCH_PROVIDER=none или ключи не заданы) —
 * ничего не ищет, просто возвращает пустой результат.
 */
@Injectable()
export class NoopExternalSearchProvider implements ExternalSearchProvider {
  readonly name = 'none';

  async search(): Promise<ExternalSearchMatch[]> {
    return [];
  }
}
