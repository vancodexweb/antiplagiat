import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DetectorWeightDto, UpdateDetectorWeightDto } from './dto/detector-weight.dto';

@Injectable()
export class DetectorWeightsService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<DetectorWeightDto[]> {
    return this.prisma.detectorWeight.findMany({ orderBy: { feature: 'asc' } });
  }

  async updateMany(items: UpdateDetectorWeightDto[]): Promise<DetectorWeightDto[]> {
    for (const item of items) {
      await this.prisma.detectorWeight.upsert({
        where: { feature: item.feature },
        create: { feature: item.feature, weight: item.weight, enabled: item.enabled ?? true },
        update: { weight: item.weight, ...(item.enabled !== undefined ? { enabled: item.enabled } : {}) },
      });
    }
    return this.list();
  }
}
