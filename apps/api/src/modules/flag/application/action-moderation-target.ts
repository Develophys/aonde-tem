import {
  NotFoundError,
  type FlagRepository,
  type FlagTargetType,
  type Logger,
  type ModeratableContentRepository,
} from "@aonde-tem/domain";

export interface ActionModerationTargetCommand {
  targetType: FlagTargetType;
  targetId: string;
  action: "hide" | "dismiss";
}

/**
 * Use case: resolve one flagged target.
 *
 * The order matters. The open-flag check comes first so a stale card cannot hide
 * content that nobody currently objects to, and the content change comes before the
 * flags are resolved so that a failure mid-way leaves the flags open and the queue
 * still showing the work — the opposite order would lose the flag and leave the
 * content up.
 */
export class ActionModerationTarget {
  constructor(
    private readonly flags: FlagRepository,
    private readonly content: ModeratableContentRepository,
    private readonly log: Logger,
  ) {}

  async execute(command: ActionModerationTargetCommand): Promise<{ resolved: number }> {
    const { targetType, targetId, action } = command;

    const open = await this.flags.countOpenByTarget(targetType, targetId);
    if (open === 0) {
      throw new NotFoundError(`No open flags for ${targetType} ${targetId}`);
    }

    if (action === "hide") {
      if (targetType === "discovery") {
        await this.content.hideDiscovery(targetId);
      } else {
        await this.content.blockProduct(targetId);
      }
    }

    const resolved = await this.flags.updateStatusByTarget(
      targetType,
      targetId,
      action === "hide" ? "actioned" : "dismissed",
    );

    this.log.info({ targetType, targetId, action, resolved }, "moderation target actioned");
    return { resolved };
  }
}
