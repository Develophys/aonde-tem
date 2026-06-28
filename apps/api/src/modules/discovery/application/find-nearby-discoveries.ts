import type {
  DiscoveryRepository,
  NearbyDiscoveriesQuery,
  NearbyDiscoveryRow,
  Logger,
} from "@aonde-tem/domain";

/** Use case: list enriched discovery rows within a radius of a point. Depends only on ports. */
export class FindNearbyDiscoveries {
  constructor(
    private readonly discoveries: DiscoveryRepository,
    private readonly log: Logger,
  ) {}

  async execute(query: NearbyDiscoveriesQuery): Promise<NearbyDiscoveryRow[]> {
    this.log.info(
      { lat: query.center.lat, lng: query.center.lng, item: query.itemQuery },
      "find nearby discoveries",
    );
    const results = await this.discoveries.findNearbyWithDetails(query);
    this.log.info({ count: results.length }, "nearby discoveries found");
    return results;
  }
}
