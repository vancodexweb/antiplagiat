import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Стартовые значения редактируемых словарей (разделы 3.5, 3.6, 10 ТЗ) —
// без них на пустой БД bureaucracyPct/junkWordsPct у любого документа
// всегда были бы нулевыми. Дальше словари редактируются через API
// (/api/config/junk-words) или напрямую в БД (ClicheWord), без изменения кода.
const DEFAULT_BUREAUCRATIC_CLICHES = [
  'в связи с вышеизложенным',
  'по причине того что',
  'необходимо отметить, что',
  'в настоящее время',
  'имеет место быть',
  'на сегодняшний день',
  'как было сказано выше',
  'данный вопрос',
  'вышеуказанный',
  'нижеследующий',
];

const DEFAULT_JUNK_WORDS = [
  'короче',
  'как бы',
  'типа',
  'в общем',
  'это самое',
  'ну вот',
  'так сказать',
  'собственно говоря',
  'на самом деле',
  'если честно',
];

@Injectable()
export class DictionarySeedService implements OnModuleInit {
  private readonly logger = new Logger(DictionarySeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.seedCliches();
    await this.seedJunkWords();
  }

  private async seedCliches(): Promise<void> {
    const count = await this.prisma.clicheWord.count({ where: { category: 'BUREAUCRATIC' } });
    if (count > 0) return;

    await this.prisma.clicheWord.createMany({
      data: DEFAULT_BUREAUCRATIC_CLICHES.map((phrase) => ({ phrase, category: 'BUREAUCRATIC' })),
      skipDuplicates: true,
    });
    this.logger.log(`Словарь канцелярита заполнен значениями по умолчанию (${DEFAULT_BUREAUCRATIC_CLICHES.length})`);
  }

  private async seedJunkWords(): Promise<void> {
    const count = await this.prisma.junkWord.count();
    if (count > 0) return;

    await this.prisma.junkWord.createMany({
      data: DEFAULT_JUNK_WORDS.map((word) => ({ word })),
      skipDuplicates: true,
    });
    this.logger.log(`Словарь мусорных слов заполнен значениями по умолчанию (${DEFAULT_JUNK_WORDS.length})`);
  }
}
