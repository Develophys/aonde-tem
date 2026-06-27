import { Coordinates, Place, PlaceRepository, Logger } from "@aonde-tem/domain";

/** Use case: list places within a radius of a point. Depends only on ports. */
export class FindNearbyPlaces {
  constructor(
    private readonly places: PlaceRepository,
    private readonly log: Logger,
  ) {}

  async execute(input: { lat: number; lng: number; radius: number }): Promise<Place[]> {
    const center = Coordinates.create(input.lat, input.lng);
    this.log.info({ ...input }, "finding nearby places");
    const results = await this.places.findNearby(center, input.radius);
    this.log.info({ count: results.length }, "nearby places found");
    return results;
  }
}
