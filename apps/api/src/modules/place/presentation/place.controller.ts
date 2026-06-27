import { Controller, Get, Post, Body, Query, Param, Inject } from "@nestjs/common";
import {
  createPlaceSchema, nearbyQuerySchema,
  type PlaceResponse,
} from "@aonde-tem/contracts";
import { Place } from "@aonde-tem/domain";
import { FindNearbyPlaces } from "../application/find-nearby-places";
import { CreatePlace } from "../application/create-place";

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
  ) {}

  @Get("nearby")
  async nearby(@Query() query: unknown): Promise<PlaceResponse[]> {
    const { lat, lng, radius } = nearbyQuerySchema.parse(query); // validated at the boundary
    const places = await this.findNearby.execute({ lat, lng, radius });
    return places.map(toResponse);
  }

  @Post()
  async create(@Body() body: unknown): Promise<PlaceResponse> {
    const dto = createPlaceSchema.parse(body);
    const place = await this.createPlace.execute(dto);
    return toResponse(place);
  }
}
