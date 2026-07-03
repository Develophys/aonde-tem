import { Flag, type FlagRepository, type Logger } from "@aonde-tem/domain";
import type { CreateFlagDto } from "@aonde-tem/contracts";
import { randomUUID } from "node:crypto";

export class CreateFlag {
  constructor(
    private readonly flags: FlagRepository,
    private readonly log: Logger,
  ) {}

  async execute(dto: CreateFlagDto, reporterId: string): Promise<Flag> {
    const flag = Flag.create({
      id: randomUUID(),
      targetType: dto.targetType,
      targetId: dto.targetId,
      reason: dto.reason,
      reporterId,
      comment: dto.comment,
    });

    await this.flags.save(flag);
    this.log.info(
      { flagId: flag.id, targetType: dto.targetType, targetId: dto.targetId, reason: dto.reason },
      "flag created",
    );
    return flag;
  }
}
