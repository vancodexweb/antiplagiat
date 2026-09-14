import { Module } from '@nestjs/common';
import { CorpusController } from './corpus.controller';
import { CorpusService } from './corpus.service';
import { DocumentsModule } from '../documents/documents.module';
import { ShinglingModule } from '../shingling/shingling.module';
import { NlpClientModule } from '../nlp-client/nlp-client.module';
import { VectorSearchModule } from '../vector-search/vector-search.module';

@Module({
  imports: [DocumentsModule, ShinglingModule, NlpClientModule, VectorSearchModule],
  controllers: [CorpusController],
  providers: [CorpusService],
})
export class CorpusModule {}
