import { Module } from '@nestjs/common';
import { PlagiarismService } from './plagiarism.service';
import { ParaphraseService } from './paraphrase.service';
import { ShinglingModule } from '../shingling/shingling.module';
import { ResultsModule } from '../results/results.module';
import { NlpClientModule } from '../nlp-client/nlp-client.module';
import { VectorSearchModule } from '../vector-search/vector-search.module';

@Module({
  imports: [ShinglingModule, ResultsModule, NlpClientModule, VectorSearchModule],
  providers: [PlagiarismService, ParaphraseService],
  exports: [PlagiarismService, ParaphraseService],
})
export class PipelineModule {}
