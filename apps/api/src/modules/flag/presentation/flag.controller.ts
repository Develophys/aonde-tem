import { Controller, Post, Body, Req, UseGuards, Inject } from "@nestjs/common";
import { createFlagSchema, type FlagResponse } from "@aonde-tem/contracts";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard.js";
import { CreateFlag } from "../application/create-flag.js";

@Controller("flags")
export class FlagController {
  constructor(@Inject(CreateFlag) private readonly createFlag: CreateFlag) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: unknown, @Req() req: any): Promise<FlagResponse> {
    const dto = createFlagSchema.parse(body);
    const flag = await this.createFlag.execute(dto, req.user.sub);
    return {
      id: flag.id,
      targetType: flag.targetType,
      targetId: flag.targetId,
      reason: flag.reason,
      status: flag.status,
      createdAt: flag.createdAt.toISOString(),
    };
  }
}
