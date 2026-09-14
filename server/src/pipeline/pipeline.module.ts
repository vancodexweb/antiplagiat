import { Module } from '@nestjs/common';
import { PlagiarismService } from './plagiarism.service';
import { ShinglingModule } from '../shingling/shingling.module';
import { ResultsModule } from '../results/results.module';

@Module({
  imports: [ShinglingModule, ResultsModule],
  providers: [PlagiarismService],
  exports: [PlagiarismService],
})
export class PipelineModule {}
