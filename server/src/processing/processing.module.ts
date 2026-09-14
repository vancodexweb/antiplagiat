import { Module } from '@nestjs/common';
import { ProcessingController } from './processing.controller';
import { PipelineModule } from '../pipeline/pipeline.module';

@Module({
  imports: [PipelineModule],
  controllers: [ProcessingController],
})
export class ProcessingModule {}
