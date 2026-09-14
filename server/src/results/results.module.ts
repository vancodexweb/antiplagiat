import { Module } from '@nestjs/common';
import { AnalysisResultService } from './analysis-result.service';

@Module({
  providers: [AnalysisResultService],
  exports: [AnalysisResultService],
})
export class ResultsModule {}
