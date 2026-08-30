import type { Flag, FlagStatus, FlagTargetType } from "../entities/flag";

export interface FlagRepository {
  findById(id: string): Promise<Flag | null>;
  findOpen(limit?: number): Promise<Flag[]>;
  save(flag: Flag): Promise<void>;
  updateStatus(id: string, status: FlagStatus): Promise<void>;
  /** How many flags on this target are still `open`. */
  countOpenByTarget(targetType: FlagTargetType, targetId: string): Promise<number>;
  /**
   * Resolves every `open` flag on a target in one statement, returning how many were
   * updated. Moderation judges the content, so one decision has to settle all of its
   * flags — otherwise removing a five-times-flagged product leaves four open flags
   * pointing at content that is already gone.
   */
  updateStatusByTarget(
    targetType: FlagTargetType,
    targetId: string,
    status: FlagStatus,
  ): Promise<number>;
}
