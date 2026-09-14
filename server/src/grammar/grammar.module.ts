import { Module } from '@nestjs/common';
import { GrammarService } from './grammar.service';
import { ResultsModule } from '../results/results.module';

@Module({
  imports: [ResultsModule],
  providers: [GrammarService],
  exports: [GrammarService],
})
export class GrammarModule {}
