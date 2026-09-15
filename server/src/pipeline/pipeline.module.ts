import { Module } from '@nestjs/common';
import { PlagiarismService } from './plagiarism.service';
import { ParaphraseService } from './paraphrase.service';
import { ShinglingModule } from '../shingling/shingling.module';
import { ResultsModule } from '../results/results.module';
import { NlpClientModule } from '../nlp-client/nlp-client.module';
import { VectorSearchModule } from '../vector-search/vector-search.module';
import { GrammarModule } from '../grammar/grammar.module';
import { StyleModule } from '../style/style.module';
import { AiDetectorModule } from '../ai-detector/ai-detector.module';
import { ExternalSearchModule } from '../external-search/external-search.module';

@Module({
  imports: [
    ShinglingModule,
    ResultsModule,
    NlpClientModule,
    VectorSearchModule,
    GrammarModule,
    StyleModule,
    AiDetectorModule,
    ExternalSearchModule,
  ],
  providers: [PlagiarismService, ParaphraseService],
  exports: [PlagiarismService, ParaphraseService, GrammarModule, StyleModule, AiDetectorModule, ExternalSearchModule],
})
export class PipelineModule {}
