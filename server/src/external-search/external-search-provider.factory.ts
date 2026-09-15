import { ConfigService } from '@nestjs/config';
import { FactoryProvider } from '@nestjs/common';
import { ExternalSearchProvider } from './external-search-provider.interface';
import { NoopExternalSearchProvider } from './providers/noop-external-search.provider';
import { GoogleCustomSearchProvider } from './providers/google-custom-search.provider';
import { YandexSearchProvider } from './providers/yandex-search.provider';

export const EXTERNAL_SEARCH_PROVIDER_TOKEN = 'EXTERNAL_SEARCH_PROVIDER_TOKEN';

/**
 * Выбор реализации ExternalSearchProvider по env-переменной
 * EXTERNAL_SEARCH_PROVIDER (none|google|yandex) — раздел 3.2 ТЗ.
 */
export const externalSearchProviderFactory: FactoryProvider<ExternalSearchProvider> = {
  provide: EXTERNAL_SEARCH_PROVIDER_TOKEN,
  useFactory: (
    config: ConfigService,
    google: GoogleCustomSearchProvider,
    yandex: YandexSearchProvider,
    noop: NoopExternalSearchProvider,
  ): ExternalSearchProvider => {
    switch (config.get<string>('EXTERNAL_SEARCH_PROVIDER', 'none')) {
      case 'google':
        return google;
      case 'yandex':
        return yandex;
      default:
        return noop;
    }
  },
  inject: [ConfigService, GoogleCustomSearchProvider, YandexSearchProvider, NoopExternalSearchProvider],
};
