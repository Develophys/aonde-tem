import {
  ConflictError,
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

    // Concurrency guard, not a validation: the open-flag check above can pass and then
    // lose the race — another admin resolves the same target between our check and this
    // update, so `updateStatusByTarget`'s `WHERE status = 'open'` matches nothing and
    // returns 0. There is no audit log, so silently answering `{ resolved: 0 }` here
    // would let the caller believe they resolved a report that someone else already
    // did (and, on "hide", that already ran against the content before we got here).
    // Surfacing this as a conflict is the only way the second admin finds out.
    if (resolved === 0) {
      throw new ConflictError(`Lost the race to resolve ${targetType} ${targetId}`);
    }

    this.log.info({ targetType, targetId, action, resolved }, "moderation target actioned");
    return { resolved };
  }
}
