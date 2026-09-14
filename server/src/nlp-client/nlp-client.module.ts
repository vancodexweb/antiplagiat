import { Module } from '@nestjs/common';
import { NlpClientService } from './nlp-client.service';

@Module({
  providers: [NlpClientService],
  exports: [NlpClientService],
})
export class NlpClientModule {}
