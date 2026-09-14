import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis используется как кэш по contentHash (в будущем) и как LSH-индекс
 * для быстрого поиска кандидатов на заимствование (раздел 0, 3.2 ТЗ).
 */
@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(config: ConfigService) {
    super(config.get<string>('REDIS_URL', 'redis://localhost:6379'));
  }

  async onModuleDestroy(): Promise<void> {
    this.disconnect();
  }
}
