import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Req,
  Inject,
  BadRequestException,
  UseGuards,
} from "@nestjs/common";
import { ZodError } from "zod";
import {
  nearbyDiscoveriesQuerySchema,
  type NearbyDiscoveriesResponse,
  createDiscoverySchema,
  type CreateDiscoveryResponse,
} from "@aonde-tem/contracts";
import { Coordinates } from "@aonde-tem/domain";
import { FindNearbyDiscoveries } from "../application/find-nearby-discoveries.js";
import { CreateDiscovery } from "../application/create-discovery.js";
import { CreateProduct } from "../../product/application/create-product.js";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard.js";

@Controller("discoveries")
export class DiscoveryController {
  constructor(
    @Inject(FindNearbyDiscoveries) private readonly findNearby: FindNearbyDiscoveries,
    @Inject(CreateDiscovery) private readonly createDiscovery: CreateDiscovery,
    @Inject(CreateProduct) private readonly createProduct: CreateProduct,
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

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: unknown, @Req() req: Request & { user: { sub: string } }): Promise<CreateDiscoveryResponse> {
    let dto: ReturnType<typeof createDiscoverySchema.parse>;
    try {
      dto = createDiscoverySchema.parse(body);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException(err.flatten());
      }
      throw err;
    }

    const reporterId = req.user.sub;

    // If productId is not provided, create or find the product by name
    let productId = dto.productId;
    if (!productId) {
      const product = await this.createProduct.execute(dto.productName!, reporterId);
      productId = product.id;
    }

    const discovery = await this.createDiscovery.execute(
      { ...dto, productId },
      reporterId,
    );

    return {
      id: discovery.id,
      productId: discovery.productId,
      placeId: discovery.placeId,
      createdAt: discovery.createdAt.toISOString(),
    };
  }
}
