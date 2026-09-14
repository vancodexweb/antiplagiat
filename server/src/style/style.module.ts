import { Module } from '@nestjs/common';
import { StyleService } from './style.service';
import { SpamService } from './spam.service';
import { BasicMetricsService } from '../documents/metrics/basic-metrics.service';
import { ResultsModule } from '../results/results.module';

@Module({
  imports: [ResultsModule],
  providers: [StyleService, SpamService, BasicMetricsService],
  exports: [StyleService, SpamService],
})
export class StyleModule {}
