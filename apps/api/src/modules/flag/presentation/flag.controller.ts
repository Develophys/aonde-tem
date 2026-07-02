import { Controller, Post, Body, Req, UseGuards, Inject } from "@nestjs/common";
import { createFlagSchema, type FlagResponse } from "@aonde-tem/contracts";
import { JwtAuthGuard, type JwtPayload } from "../../auth/guards/jwt-auth.guard.js";
import { CreateFlag } from "../application/create-flag.js";

interface AuthenticatedRequest {
  user: JwtPayload;
}

@Controller("flags")
export class FlagController {
  constructor(@Inject(CreateFlag) private readonly createFlag: CreateFlag) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: unknown, @Req() req: AuthenticatedRequest): Promise<FlagResponse> {
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
