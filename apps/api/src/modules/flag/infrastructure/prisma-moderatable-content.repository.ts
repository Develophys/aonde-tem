import { Injectable } from "@nestjs/common";
import type { ModeratableContentRepository } from "@aonde-tem/domain";
import { PrismaService } from "../../../shared/prisma.service.js";

@Injectable()
export class PrismaModeratableContentRepository implements ModeratableContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async hideDiscovery(id: string): Promise<void> {
    await this.prisma.discovery.update({ where: { id }, data: { hiddenAt: new Date() } });
  }

  async blockProduct(id: string): Promise<void> {
    await this.prisma.product.update({ where: { id }, data: { status: "blocked" } });
  }
}
