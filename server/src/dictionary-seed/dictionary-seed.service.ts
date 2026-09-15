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

// Типичные обороты ИИ-сгенерированного текста (раздел 3.3 ТЗ) — та же
// модель ClicheWord, отдельная категория.
const DEFAULT_AI_CLICHES = [
  'в заключение стоит отметить',
  'таким образом, можно сделать вывод',
  'важно отметить, что',
  'следует подчеркнуть',
  'в современном мире',
  'нельзя не отметить',
  'стоит упомянуть',
  'безусловно',
  'несомненно',
  'в результате проведённого анализа',
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

// Веса фич детектора ИИ (раздел 3.3 ТЗ) — стартовые значения, дальше
// редактируются через GET/PUT /api/config/weights, не в коде.
const DEFAULT_DETECTOR_WEIGHTS: Array<{ feature: string; weight: number }> = [
  { feature: 'lexicalDiversity', weight: 0.15 },
  { feature: 'burstiness', weight: 0.25 },
  { feature: 'personalPronouns', weight: 0.15 },
  { feature: 'aiCliches', weight: 0.25 },
  { feature: 'synonymChains', weight: 0.1 },
  { feature: 'perplexity', weight: 0.1 },
];

@Injectable()
export class DictionarySeedService implements OnModuleInit {
  private readonly logger = new Logger(DictionarySeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.seedCliches('BUREAUCRATIC', DEFAULT_BUREAUCRATIC_CLICHES);
    await this.seedCliches('AI_CLICHE', DEFAULT_AI_CLICHES);
    await this.seedJunkWords();
    await this.seedDetectorWeights();
  }

  private async seedCliches(category: string, phrases: string[]): Promise<void> {
    const count = await this.prisma.clicheWord.count({ where: { category } });
    if (count > 0) return;

    await this.prisma.clicheWord.createMany({
      data: phrases.map((phrase) => ({ phrase, category })),
      skipDuplicates: true,
    });
    this.logger.log(`Словарь клише "${category}" заполнен значениями по умолчанию (${phrases.length})`);
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

  private async seedDetectorWeights(): Promise<void> {
    const count = await this.prisma.detectorWeight.count();
    if (count > 0) return;

    await this.prisma.detectorWeight.createMany({
      data: DEFAULT_DETECTOR_WEIGHTS.map(({ feature, weight }) => ({ feature, weight, enabled: true })),
      skipDuplicates: true,
    });
    this.logger.log(`Веса детектора ИИ заполнены значениями по умолчанию (${DEFAULT_DETECTOR_WEIGHTS.length})`);
  }
}
