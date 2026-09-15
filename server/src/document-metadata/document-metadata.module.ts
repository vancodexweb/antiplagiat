import { Module } from '@nestjs/common';
import { DocumentMetadataService } from './document-metadata.service';

@Module({
  providers: [DocumentMetadataService],
  exports: [DocumentMetadataService],
})
export class DocumentMetadataModule {}
