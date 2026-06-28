import { Controller, Get, Query, Inject, BadRequestException } from "@nestjs/common";
import { ZodError } from "zod";
import {
  nearbyDiscoveriesQuerySchema,
  type NearbyDiscoveriesResponse,
} from "@aonde-tem/contracts";
import { Coordinates } from "@aonde-tem/domain";
import { FindNearbyDiscoveries } from "../application/find-nearby-discoveries.js";

@Controller("discoveries")
export class DiscoveryController {
  constructor(
    @Inject(FindNearbyDiscoveries) private readonly findNearby: FindNearbyDiscoveries,
  ) {}

  @Get("nearby")
  async nearby(@Query() rawQuery: unknown): Promise<NearbyDiscoveriesResponse> {
    let query: ReturnType<typeof nearbyDiscoveriesQuerySchema.parse>;
    try {
      query = nearbyDiscoveriesQuerySchema.parse(rawQuery);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException(err.flatten());
      }
      throw err;
    }

    const center = Coordinates.create(query.lat, query.lng);
    const results = await this.findNearby.execute({
      center,
      radiusMeters: query.radius,
      itemQuery: query.item,
      limit: query.limit,
    });

    return {
      results: results.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        expiresAt: r.expiresAt.toISOString(),
        ageMinutes: Math.floor((Date.now() - r.createdAt.getTime()) / 60_000),
      })),
      total: results.length,
    };
  }
}
