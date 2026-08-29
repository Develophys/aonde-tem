import {
  NotFoundError,
  type DiscoveryRepository,
  type Logger,
  type ReporterAccountReader,
  type ReporterDiscoveryRow,
} from "@aonde-tem/domain";

/** Cap matching the `nearby` convention — a prolific reporter must not blow up the payload. */
const MY_DISCOVERIES_LIMIT = 50;

export interface MyDiscoveryView extends ReporterDiscoveryRow {
  isExpired: boolean;
}

export interface MyDiscoveriesResult {
  results: MyDiscoveryView[];
  stats: {
    total: number;
    active: number;
    memberSince: Date;
  };
}

/**
 * Use case: one reporter's own discoveries plus the counts their profile shows.
 *
 * `now` is injected rather than read from the clock so expiry is testable and so
 * a single request classifies every row against one instant.
 */
export class FindMyDiscoveries {
  constructor(
    private readonly discoveries: DiscoveryRepository,
    private readonly accounts: ReporterAccountReader,
    private readonly log: Logger,
  ) {}

  async execute(query: { reporterId: string; now: Date }): Promise<MyDiscoveriesResult> {
    const { reporterId, now } = query;
    this.log.info({ reporterId }, "find my discoveries");

    const memberSince = await this.accounts.findCreatedAt(reporterId);
    if (!memberSince) {
      throw new NotFoundError(`User ${reporterId} not found`);
    }

    const rows = await this.discoveries.findByReporter(reporterId, MY_DISCOVERIES_LIMIT);
    const results = rows.map((row) => ({
      ...row,
      isExpired: row.expiresAt.getTime() <= now.getTime(),
    }));

    // Counted over the returned page, not the whole history: the cap above means a
    // reporter past 50 reports sees stats for what is shown. Revisit alongside paging.
    const stats = {
      total: results.length,
      active: results.filter((r) => !r.isExpired).length,
      memberSince,
    };

    this.log.info({ reporterId, total: stats.total, active: stats.active }, "my discoveries found");
    return { results, stats };
  }
}
