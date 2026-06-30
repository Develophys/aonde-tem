import type { Place, PlaceRepository, NearbyDiscoveryRow } from "@aonde-tem/domain";
import { NotFoundError } from "@aonde-tem/domain";

/** Narrow port — only the method this use case needs from DiscoveryRepository. */
export interface DiscoveryByPlaceFinder {
  findByPlace(placeId: string): Promise<NearbyDiscoveryRow[]>;
}

export class FindPlaceWithDiscoveries {
  constructor(
    private readonly places: PlaceRepository,
    private readonly discoveries: DiscoveryByPlaceFinder,
  ) {}

  async execute(placeId: string): Promise<{ place: Place; rows: NearbyDiscoveryRow[] }> {
    const place = await this.places.findById(placeId);
    if (!place) throw new NotFoundError(`Place ${placeId} not found`);
    const rows = await this.discoveries.findByPlace(placeId);
    return { place, rows };
  }
}
