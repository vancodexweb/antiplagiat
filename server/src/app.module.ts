import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { SettingsModule } from './settings/settings.module';
import { DocumentsModule } from './documents/documents.module';
import { CorpusModule } from './corpus/corpus.module';
import { JunkWordsModule } from './junk-words/junk-words.module';
import { DictionarySeedModule } from './dictionary-seed/dictionary-seed.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: Number(config.get('THROTTLE_TTL_SECONDS', '60')) * 1000,
          limit: Number(config.get('THROTTLE_LIMIT', '60')),
        },
      ],
    }),
    PrismaModule,
    RedisModule,
    SettingsModule,
    DocumentsModule,
    CorpusModule,
    JunkWordsModule,
    DictionarySeedModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
