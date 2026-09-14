import { Module } from '@nestjs/common';
import { DictionarySeedService } from './dictionary-seed.service';

@Module({
  providers: [DictionarySeedService],
})
export class DictionarySeedModule {}
