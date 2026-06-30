import { Controller, Get, Post, Body, Query, Param, Inject, ParseUUIDPipe } from "@nestjs/common";
import {
  createPlaceSchema,
  nearbyQuerySchema,
  type PlaceResponse,
  type PlaceWithDiscoveriesResponse,
} from "@aonde-tem/contracts";
import { Place } from "@aonde-tem/domain";
import { FindNearbyPlaces } from "../application/find-nearby-places.js";
import { CreatePlace } from "../application/create-place.js";
import { FindPlaceWithDiscoveries } from "../application/find-place-with-discoveries.js";

function toResponse(p: Place): PlaceResponse {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    address: p.address,
    coords: { lat: p.coords.lat, lng: p.coords.lng },
  };
}

@Controller("places")
export class PlaceController {
  constructor(
    @Inject(FindNearbyPlaces) private readonly findNearby: FindNearbyPlaces,
    @Inject(CreatePlace) private readonly createPlace: CreatePlace,
    @Inject(FindPlaceWithDiscoveries)
    private readonly findWithDiscoveries: FindPlaceWithDiscoveries,
  ) {}

  @Get("nearby")
  async nearby(@Query() query: unknown): Promise<PlaceResponse[]> {
    const { lat, lng, radius } = nearbyQuerySchema.parse(query);
    const places = await this.findNearby.execute({ lat, lng, radius });
    return places.map(toResponse);
  }

  @Get(":id")
  async getWithDiscoveries(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<PlaceWithDiscoveriesResponse> {
    const { place, rows } = await this.findWithDiscoveries.execute(id);
    return {
      id: place.id,
      name: place.name,
      address: place.address,
      coords: { lat: place.coords.lat, lng: place.coords.lng },
      discoveries: rows.map((r) => ({
        id: r.id,
        productId: r.productId,
        productName: r.productName,
        priceBrl: r.priceBrl,
        quantity: r.quantity,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
        expiresAt: r.expiresAt.toISOString(),
        ageMinutes: Math.floor((Date.now() - r.createdAt.getTime()) / 60_000),
      })),
    };
  }

  @Post()
  async create(@Body() body: unknown): Promise<PlaceResponse> {
    const dto = createPlaceSchema.parse(body);
    const place = await this.createPlace.execute(dto);
    return toResponse(place);
  }
}
