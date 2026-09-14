import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { ProcessingModule } from '../processing/processing.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, ProcessingModule],
})
export class WorkerModule {}
