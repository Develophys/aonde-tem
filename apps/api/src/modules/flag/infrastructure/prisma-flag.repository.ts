import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma.service.js";
import {
  Flag,
  type FlagRepository,
  type FlagTargetType,
  type FlagReason,
  type FlagStatus,
} from "@aonde-tem/domain";

@Injectable()
export class PrismaFlagRepository implements FlagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Flag | null> {
    const row = await this.prisma.flag.findUnique({ where: { id } });
    if (!row) return null;
    return Flag.create({
      id: row.id,
      targetType: row.targetType as FlagTargetType,
      targetId: row.targetId,
      reason: row.reason as FlagReason,
      reporterId: row.reporterId,
      comment: row.comment ?? undefined,
      status: row.status as FlagStatus,
      createdAt: row.createdAt,
    });
  }

  async findOpen(limit = 50): Promise<Flag[]> {
    const rows = await this.prisma.flag.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return rows.map((r) =>
      Flag.create({
        id: r.id,
        targetType: r.targetType as FlagTargetType,
        targetId: r.targetId,
        reason: r.reason as FlagReason,
        reporterId: r.reporterId,
        comment: r.comment ?? undefined,
        status: r.status as FlagStatus,
        createdAt: r.createdAt,
      }),
    );
  }

  async save(flag: Flag): Promise<void> {
    await this.prisma.flag.upsert({
      where: { id: flag.id },
      create: {
        id: flag.id,
        targetType: flag.targetType,
        targetId: flag.targetId,
        reason: flag.reason,
        reporterId: flag.reporterId,
        comment: flag.comment,
        status: flag.status,
      },
      update: { status: flag.status },
    });
  }

  async updateStatus(id: string, status: FlagStatus): Promise<void> {
    await this.prisma.flag.update({ where: { id }, data: { status } });
  }
}
