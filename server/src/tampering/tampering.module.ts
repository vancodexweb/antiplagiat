import { Module } from '@nestjs/common';
import { TamperingService } from './tampering.service';

@Module({
  providers: [TamperingService],
  exports: [TamperingService],
})
export class TamperingModule {}
