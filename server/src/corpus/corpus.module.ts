import { Module } from '@nestjs/common';
import { CorpusController } from './corpus.controller';
import { CorpusService } from './corpus.service';
import { DocumentsModule } from '../documents/documents.module';
import { ShinglingModule } from '../shingling/shingling.module';

@Module({
  imports: [DocumentsModule, ShinglingModule],
  controllers: [CorpusController],
  providers: [CorpusService],
})
export class CorpusModule {}
