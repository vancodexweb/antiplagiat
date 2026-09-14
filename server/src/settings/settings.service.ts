import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

const PAGE_NORM_KEY = 'pageNorm';

interface PageNormValue {
  charsPerPage: number;
}

/**
 * Хранилище редактируемых через API параметров системы (SystemConfig),
 * чтобы такие вещи, как норматив страницы, не были захардкожены (раздел 10 ТЗ).
 */
@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const existing = await this.prisma.systemConfig.findUnique({ where: { key: PAGE_NORM_KEY } });
    if (!existing) {
      const defaultChars = Number(this.configService.get('DEFAULT_PAGE_NORM_CHARS', '1800'));
      await this.prisma.systemConfig.create({
        data: { key: PAGE_NORM_KEY, value: { charsPerPage: defaultChars } },
      });
      this.logger.log(`Норматив страницы инициализирован значением по умолчанию: ${defaultChars} символов`);
    }
  }

  async getPageNormChars(): Promise<number> {
    const record = await this.prisma.systemConfig.findUnique({ where: { key: PAGE_NORM_KEY } });
    const value = record?.value as PageNormValue | undefined;
    return value?.charsPerPage ?? 1800;
  }

  async setPageNormChars(charsPerPage: number): Promise<number> {
    await this.prisma.systemConfig.upsert({
      where: { key: PAGE_NORM_KEY },
      create: { key: PAGE_NORM_KEY, value: { charsPerPage } },
      update: { value: { charsPerPage } },
    });
    return charsPerPage;
  }
}
