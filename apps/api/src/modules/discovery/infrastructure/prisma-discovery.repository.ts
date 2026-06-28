import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../shared/prisma.service.js";
import type {
  DiscoveryRepository,
  NearbyDiscoveriesQuery,
  NearbyDiscoveryRow,
} from "@aonde-tem/domain";
import { Discovery, Price, Coordinates } from "@aonde-tem/domain";

interface RawDiscoveryRow {
  id: string;
  productId: string;
  productName: string;
  placeId: string;
  placeName: string;
  price: string; // Decimal comes back as string from raw query
  quantity: number;
  note: string | null;
  lat: number;
  lng: number;
  distance_meters: number;
  createdAt: Date;
  expiresAt: Date;
}

/** Prisma-backed implementation of the DiscoveryRepository port. */
@Injectable()
export class PrismaDiscoveryRepository implements DiscoveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findNearby(_query: NearbyDiscoveriesQuery): Promise<Discovery[]> {
    // Enriched queries use findNearbyWithDetails; plain findNearby is stubbed.
    return [];
  }

  async findNearbyWithDetails(
    query: NearbyDiscoveriesQuery,
  ): Promise<NearbyDiscoveryRow[]> {
    const { center, radiusMeters, itemQuery, limit = 50 } = query;
    const now = new Date();

    // Normalize the search query the same way products are normalized.
    const normalizedQuery = itemQuery
      ? itemQuery
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z0-9]/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      : null;

    const fuzzyFilter = normalizedQuery
      ? Prisma.sql`AND (
          p."normalizedKey" % ${normalizedQuery}
          OR p."normalizedKey" ILIKE ${"%" + normalizedQuery + "%"}
        )`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<RawDiscoveryRow[]>`
      SELECT
        d.id,
        d."productId",
        p.name             AS "productName",
        d."placeId",
        pl.name            AS "placeName",
        d.price,
        d.quantity,
        d.note,
        ST_Y(d.location::geometry)  AS lat,
        ST_X(d.location::geometry)  AS lng,
        ST_Distance(
          d.location,
          ST_MakePoint(${center.lng}, ${center.lat})::geography
        ) AS distance_meters,
        d."createdAt",
        d."expiresAt"
      FROM discoveries d
        JOIN products p  ON p.id = d."productId"
        JOIN places   pl ON pl.id = d."placeId"
      WHERE
        d."hiddenAt" IS NULL
        AND d."expiresAt" > ${now}
        AND ST_DWithin(
          d.location,
          ST_MakePoint(${center.lng}, ${center.lat})::geography,
          ${radiusMeters}
        )
        ${fuzzyFilter}
      ORDER BY d.location <-> ST_MakePoint(${center.lng}, ${center.lat})::geography
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.productName,
      placeId: r.placeId,
      placeName: r.placeName,
      priceBrl: parseFloat(r.price),
      quantity: r.quantity,
      note: r.note,
      lat: r.lat,
      lng: r.lng,
      distanceMeters: Math.round(r.distance_meters),
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
    }));
  }

  async findById(id: string): Promise<Discovery | null> {
    const row = await this.prisma.discovery.findUnique({
      where: { id },
    });
    if (!row) return null;

    // location is Unsupported geography — coords cannot be hydrated without a
    // raw query. Pass zero-zero as a sentinel; consumers that need coords
    // should use findNearbyWithDetails which projects lat/lng via ST_Y/ST_X.
    return Discovery.create({
      id: row.id,
      productId: row.productId,
      placeId: row.placeId,
      price: Price.create(parseFloat(row.price.toString())),
      quantity: row.quantity,
      reporterId: row.reporterId,
      coords: Coordinates.create(0, 0),
      note: row.note ?? undefined,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    });
  }

  async save(_discovery: Discovery): Promise<void> {
    // Implemented in Plan C (write API).
    throw new Error("save() not implemented — will be added in Plan C");
  }

  async delete(id: string): Promise<void> {
    await this.prisma.discovery.update({
      where: { id },
      data: { hiddenAt: new Date() },
    });
  }
}
