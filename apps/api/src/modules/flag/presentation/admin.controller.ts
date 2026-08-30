import { Controller, Get, Patch, Param, Body, UseGuards } from "@nestjs/common";
import {
  adminActionSchema,
  flagTargetTypeSchema,
  type AdminQueueResponse,
} from "@aonde-tem/contracts";
import { AdminGuard } from "../guards/admin.guard.js";
import { ListModerationQueue } from "../application/list-moderation-queue.js";
import { ActionModerationTarget } from "../application/action-moderation-target.js";

@Controller("admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly listQueue: ListModerationQueue,
    private readonly actionTarget: ActionModerationTarget,
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

  // A bad targetType or body throws ZodError, which AllExceptionsFilter already maps
  // to a 400; NotFoundError from the use-case maps to 404. No try/catch needed here.
  @Patch("queue/:targetType/:targetId")
  async action(
    @Param("targetType") targetType: string,
    @Param("targetId") targetId: string,
    @Body() body: unknown,
  ): Promise<{ ok: boolean; resolved: number }> {
    const { action } = adminActionSchema.parse(body);
    const { resolved } = await this.actionTarget.execute({
      targetType: flagTargetTypeSchema.parse(targetType),
      targetId,
      action,
    });
    return { ok: true, resolved };
  }
}
