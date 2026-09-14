import { Module } from '@nestjs/common';
import { JunkWordsController } from './junk-words.controller';
import { JunkWordsService } from './junk-words.service';

@Module({
  controllers: [JunkWordsController],
  providers: [JunkWordsService],
})
export class JunkWordsModule {}
