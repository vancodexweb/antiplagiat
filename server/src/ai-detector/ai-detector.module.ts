import { Module } from '@nestjs/common';
import { AiDetectorService } from './ai-detector.service';
import { AI_FEATURE_SCORERS } from './feature.interface';
import { LexicalDiversityFeature } from './features/lexical-diversity.feature';
import { BurstinessFeature } from './features/burstiness.feature';
import { PersonalPronounsFeature } from './features/personal-pronouns.feature';
import { AiClicheFeature } from './features/ai-cliche.feature';
import { SynonymChainFeature } from './features/synonym-chain.feature';
import { PerplexityFeature } from './features/perplexity.feature';
import { BasicMetricsService } from '../documents/metrics/basic-metrics.service';
import { ResultsModule } from '../results/results.module';
import { NlpClientModule } from '../nlp-client/nlp-client.module';

const FEATURES = [
  LexicalDiversityFeature,
  BurstinessFeature,
  PersonalPronounsFeature,
  AiClicheFeature,
  SynonymChainFeature,
  PerplexityFeature,
];

@Module({
  imports: [ResultsModule, NlpClientModule],
  providers: [
    AiDetectorService,
    BasicMetricsService,
    ...FEATURES,
    {
      provide: AI_FEATURE_SCORERS,
      useFactory: (...features: unknown[]) => features,
      inject: FEATURES,
    },
  ],
  exports: [AiDetectorService],
})
export class AiDetectorModule {}
