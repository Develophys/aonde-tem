import { Controller, Get, Patch, Param, Body, UseGuards, NotFoundException } from "@nestjs/common";
import { adminActionSchema, type AdminFlagResponse } from "@aonde-tem/contracts";
import { AdminGuard } from "../guards/admin.guard.js";
import { PrismaFlagRepository } from "../infrastructure/prisma-flag.repository.js";
import { PrismaService } from "../../../shared/prisma.service.js";

@Controller("admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly flags: PrismaFlagRepository,
    private readonly prisma: PrismaService,
  ) {}

  @Get("flags")
  async listOpenFlags(): Promise<{ flags: AdminFlagResponse[] }> {
    const openFlags = await this.flags.findOpen(100);
    const enriched = await Promise.all(
      openFlags.map(async (f) => {
        const reporter = await this.prisma.user.findUnique({ where: { id: f.reporterId } });
        return {
          id: f.id,
          targetType: f.targetType,
          targetId: f.targetId,
          reason: f.reason,
          status: f.status,
          comment: f.comment ?? null,
          createdAt: f.createdAt.toISOString(),
          reporterEmail: reporter?.email ?? "unknown",
        };
      }),
    );
    return { flags: enriched };
  }

  @Patch("flags/:id")
  async actionFlag(
    @Param("id") id: string,
    @Body() body: unknown,
  ): Promise<{ ok: boolean }> {
    const dto = adminActionSchema.parse(body);
    const flag = await this.flags.findById(id);
    if (!flag) throw new NotFoundException(`Flag ${id} not found`);

    if (dto.action === "hide") {
      if (flag.targetType === "discovery") {
        await this.prisma.discovery.update({
          where: { id: flag.targetId },
          data: { hiddenAt: new Date() },
        });
      } else if (flag.targetType === "product") {
        await this.prisma.product.update({
          where: { id: flag.targetId },
          data: { status: "blocked" },
        });
      }
      await this.flags.updateStatus(id, "actioned");
    } else {
      await this.flags.updateStatus(id, "dismissed");
    }

    return { ok: true };
  }
}
