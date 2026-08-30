import { Injectable } from "@nestjs/common";
import type {
  FlagReason,
  FlagTargetType,
  ModerationQueueReader,
  ModerationQueueRow,
} from "@aonde-tem/domain";
import { PrismaService } from "../../../shared/prisma.service.js";

/** Exactly what `$queryRaw` hands back: DECIMAL as string, COUNT(*) as BigInt. */
export interface RawQueueRow {
  targetType: string;
  targetId: string;
  targetName: string | null;
  placeName: string | null;
  price: string | null;
  flagCount: bigint;
  reasons: string[];
  latestComment: string | null;
  latestReporterEmail: string;
  latestAt: Date;
}

export function toQueueRow(raw: RawQueueRow): ModerationQueueRow {
  return {
    targetType: raw.targetType as FlagTargetType,
    targetId: raw.targetId,
    targetName: raw.targetName,
    placeName: raw.placeName,
    priceBrl: raw.price === null ? null : Number.parseFloat(raw.price),
    flagCount: Number(raw.flagCount),
    reasons: raw.reasons as FlagReason[],
    latestComment: raw.latestComment,
    latestReporterEmail: raw.latestReporterEmail,
    latestAt: raw.latestAt,
  };
}

@Injectable()
export class PrismaModerationQueueReader implements ModerationQueueReader {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * COVERAGE GAP: this query has no automated test.
   *
   * `toQueueRow` (the pure mapper below) is unit-tested, and `ListModerationQueue`'s
   * use-case test feeds the reader rows that are already grouped — neither exercises
   * this SQL. The only way to test the query itself is against a real Postgres with
   * PostGIS/pg_trgm, and this repo's `DATABASE_URL` points at the production database,
   * so no such test is written here. Do not add one that runs against it.
   *
   * Hand-verified only, not covered by any test:
   *  - several open flags on one target collapsing to a single queue row
   *  - de-duplication of `reasons` across those flags (the `ARRAY_AGG(DISTINCT …)`)
   *  - the `latest` CTE's `DISTINCT ON` actually picking the newest flag's comment/
   *    reporter rather than some other row for the same target
   *  - a deleted target's name/context coming back NULL (`COALESCE`/`LEFT JOIN`
   *    propagation) instead of throwing or silently dropping the row
   *  - the `limit` ceiling actually bounding the result set
   *
   * Once a non-production dev database exists, write an integration test against it
   * that seeds flags rows directly and asserts each behaviour above.
   */
  async findOpenGroupedByTarget(limit = 100): Promise<ModerationQueueRow[]> {
    // `flags.targetId` is polymorphic with no foreign key — it addresses either
    // products.id or discoveries.id depending on targetType, which Prisma's relation
    // model cannot express. Hence raw SQL with two conditional LEFT JOINs.
    //
    // `latest` is a separate DISTINCT ON pass because the newest flag's comment and
    // reporter are per-row facts, not aggregates: MAX() would give the largest string,
    // not the most recent one.
    //
    // No ::uuid casts anywhere — every id column in this schema is TEXT.
    const rows = await this.prisma.$queryRaw<RawQueueRow[]>`
      WITH latest AS (
        SELECT DISTINCT ON (f."targetType", f."targetId")
               f."targetType", f."targetId", f.comment, f."reporterId", f."createdAt"
          FROM flags f
         WHERE f.status = 'open'
         ORDER BY f."targetType", f."targetId", f."createdAt" DESC
      )
      SELECT
        g."targetType",
        g."targetId",
        COALESCE(tp.name, dp.name)              AS "targetName",
        pl.name                                 AS "placeName",
        d.price::text                           AS price,
        g.flag_count                            AS "flagCount",
        g.reasons                               AS reasons,
        l.comment                               AS "latestComment",
        u.email                                 AS "latestReporterEmail",
        l."createdAt"                           AS "latestAt"
      FROM (
        SELECT f."targetType", f."targetId",
               COUNT(*)                    AS flag_count,
               ARRAY_AGG(DISTINCT f.reason) AS reasons
          FROM flags f
         WHERE f.status = 'open'
         GROUP BY f."targetType", f."targetId"
      ) g
      JOIN latest l
        ON l."targetType" = g."targetType" AND l."targetId" = g."targetId"
      JOIN users u ON u.id = l."reporterId"
      LEFT JOIN products    tp ON g."targetType" = 'product'   AND tp.id = g."targetId"
      LEFT JOIN discoveries d  ON g."targetType" = 'discovery' AND d.id  = g."targetId"
      LEFT JOIN products    dp ON dp.id = d."productId"
      LEFT JOIN places      pl ON pl.id = d."placeId"
      ORDER BY l."createdAt" DESC
      LIMIT ${limit}
    `;

    return rows.map(toQueueRow);
  }
}
