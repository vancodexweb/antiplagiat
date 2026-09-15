import { Module } from '@nestjs/common';
import { ExternalSearchService } from './external-search.service';
import { ShinglingModule } from '../shingling/shingling.module';
import { ResultsModule } from '../results/results.module';
import { NoopExternalSearchProvider } from './providers/noop-external-search.provider';
import { GoogleCustomSearchProvider } from './providers/google-custom-search.provider';
import { YandexSearchProvider } from './providers/yandex-search.provider';
import { externalSearchProviderFactory } from './external-search-provider.factory';

@Module({
  imports: [ShinglingModule, ResultsModule],
  providers: [
    ExternalSearchService,
    NoopExternalSearchProvider,
    GoogleCustomSearchProvider,
    YandexSearchProvider,
    externalSearchProviderFactory,
  ],
  exports: [ExternalSearchService],
})
export class ExternalSearchModule {}
