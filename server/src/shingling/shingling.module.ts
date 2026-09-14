import { Module } from '@nestjs/common';
import { ShinglingService } from './shingling.service';
import { LshIndexService } from './lsh-index.service';

@Module({
  providers: [ShinglingService, LshIndexService],
  exports: [ShinglingService, LshIndexService],
})
export class ShinglingModule {}
