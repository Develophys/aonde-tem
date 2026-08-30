import { Controller, Get, Patch, Param, Body, UseGuards, NotFoundException } from "@nestjs/common";
import { adminActionSchema, type AdminQueueResponse } from "@aonde-tem/contracts";
import { AdminGuard } from "../guards/admin.guard.js";
import { PrismaFlagRepository } from "../infrastructure/prisma-flag.repository.js";
import { ListModerationQueue } from "../application/list-moderation-queue.js";
import { PrismaService } from "../../../shared/prisma.service.js";

@Controller("admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly flags: PrismaFlagRepository,
    private readonly listQueue: ListModerationQueue,
    private readonly prisma: PrismaService,
  ) {}

  @Get("queue")
  async queue(): Promise<AdminQueueResponse> {
    const entries = await this.listQueue.execute();
    return {
      items: entries.map((e) => ({
        targetType: e.targetType,
        targetId: e.targetId,
        targetName: e.targetName,
        targetContext: e.targetContext,
        flagCount: e.flagCount,
        reasons: e.reasons,
        latestComment: e.latestComment,
        latestReporterEmail: e.latestReporterEmail,
        latestAt: e.latestAt.toISOString(),
      })),
    };
  }

  @Patch("flags/:id")
  async actionFlag(@Param("id") id: string, @Body() body: unknown): Promise<{ ok: boolean }> {
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
