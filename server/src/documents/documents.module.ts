import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { TextExtractionService } from './extraction/text-extraction.service';
import { BasicMetricsService } from './metrics/basic-metrics.service';
import { LanguageDetectionService } from './language/language-detection.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, TextExtractionService, BasicMetricsService, LanguageDetectionService],
  exports: [DocumentsService, TextExtractionService, BasicMetricsService, LanguageDetectionService],
})
export class DocumentsModule {}
