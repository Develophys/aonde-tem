import type { FlagReason, FlagTargetType } from "../entities/flag";

/**
 * One flagged target with its open flags already collapsed. Grouping happens in the
 * query rather than in memory: the queue is read far more often than it is written,
 * and Postgres counts and de-duplicates reasons in the same pass as the join.
 */
export interface ModerationQueueRow {
  targetType: FlagTargetType;
  targetId: string;
  /** Null when the flagged content no longer exists. */
  targetName: string | null;
  /** Discovery targets only; null for products and for deleted content. */
  placeName: string | null;
  /** Discovery targets only; null for products and for deleted content. */
  priceBrl: number | null;
  flagCount: number;
  /** Distinct reasons across the target's open flags. */
  reasons: FlagReason[];
  latestComment: string | null;
  latestReporterEmail: string;
  latestAt: Date;
}

export interface ModerationQueueReader {
  /** Open flags grouped by target, newest first. */
  findOpenGroupedByTarget(limit?: number): Promise<ModerationQueueRow[]>;
}
