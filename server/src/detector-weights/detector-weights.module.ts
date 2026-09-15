import { Module } from '@nestjs/common';
import { DetectorWeightsController } from './detector-weights.controller';
import { DetectorWeightsService } from './detector-weights.service';

@Module({
  controllers: [DetectorWeightsController],
  providers: [DetectorWeightsService],
})
export class DetectorWeightsModule {}
