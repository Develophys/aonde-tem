import type { FlagReason, FlagTargetType, Logger, ModerationQueueReader } from "@aonde-tem/domain";

/** Matches the ceiling the old admin endpoint used. Paging is deliberately out of scope. */
const MODERATION_QUEUE_LIMIT = 100;

export interface ModerationQueueEntry {
  targetType: FlagTargetType;
  targetId: string;
  targetName: string | null;
  /** "Mercadinho do Zé · R$ 24,90" for a discovery; null for a product. */
  targetContext: string | null;
  flagCount: number;
  reasons: FlagReason[];
  latestComment: string | null;
  latestReporterEmail: string;
  latestAt: Date;
}

/**
 * Formatted by hand rather than through Intl: pt-BR currency from Intl inserts a
 * non-breaking space after "R$", which is invisible in the UI but makes every
 * assertion about this string a guessing game.
 */
function brl(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

/**
 * Use case: the open moderation queue, one entry per flagged target.
 *
 * The grouping is the reader's job. What lives here is the one piece of formatting
 * the design puts on the server — the context line — so that the price is rendered
 * in exactly one place instead of being reassembled by every client.
 */
export class ListModerationQueue {
  constructor(
    private readonly queue: ModerationQueueReader,
    private readonly log: Logger,
  ) {}

  async execute(): Promise<ModerationQueueEntry[]> {
    const rows = await this.queue.findOpenGroupedByTarget(MODERATION_QUEUE_LIMIT);

    const entries = rows.map((row) => ({
      targetType: row.targetType,
      targetId: row.targetId,
      targetName: row.targetName,
      targetContext:
        row.placeName && row.priceBrl !== null ? `${row.placeName} · ${brl(row.priceBrl)}` : null,
      flagCount: row.flagCount,
      reasons: row.reasons,
      latestComment: row.latestComment,
      latestReporterEmail: row.latestReporterEmail,
      latestAt: row.latestAt,
    }));

    this.log.info({ targets: entries.length }, "moderation queue listed");
    return entries;
  }
}
