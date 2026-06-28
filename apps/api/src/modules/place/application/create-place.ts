import { randomUUID } from "node:crypto";
import { Coordinates, Place, PlaceRepository, Logger } from "@aonde-tem/domain";

export class CreatePlace {
  constructor(
    private readonly places: PlaceRepository,
    private readonly log: Logger,
  ) {}

  async execute(input: {
    name: string;
    category?: string;
    address?: string;
    coords: { lat: number; lng: number };
  }): Promise<Place> {
    const place = Place.create({
      id: randomUUID(),
      name: input.name,
      category: input.category,
      address: input.address,
      coords: Coordinates.create(input.coords.lat, input.coords.lng),
    });
    await this.places.save(place);
    this.log.info({ placeId: place.id }, "place created");
    return place;
  }
}
