import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../shared/prisma.service.js";
import type {
  DiscoveryRepository,
  NearbyDiscoveriesQuery,
  NearbyDiscoveryRow,
} from "@aonde-tem/domain";
import { Discovery, Price, Coordinates, NotFoundError } from "@aonde-tem/domain";
import type { PlaceUpsertService } from "../application/create-discovery.js";

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
  distanceMeters: number;
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
        ) AS "distanceMeters",
        d."createdAt",
        d."expiresAt"
      FROM discoveries d
        JOIN products p  ON p.id = d."productId"
        JOIN places   pl ON pl.id = d."placeId"
      WHERE
        d."hiddenAt" IS NULL
        AND d."expiresAt" > ${now}
        AND p.status = 'active'
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
      distanceMeters: Math.round(r.distanceMeters),
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

  async save(discovery: Discovery): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO discoveries (id, "productId", "placeId", price, quantity, "reporterId", note, location, "expiresAt")
      VALUES (
        ${discovery.id},
        ${discovery.productId},
        ${discovery.placeId},
        ${discovery.price.cents / 100},
        ${discovery.quantity},
        ${discovery.reporterId},
        ${discovery.note ?? null},
        ST_MakePoint(${discovery.coords.lng}, ${discovery.coords.lat})::geography,
        ${discovery.expiresAt}
      )
    `;
  }

  /**
   * Atomically resolve/create the place and insert the discovery in a single
   * transaction — prevents orphan place rows if the discovery insert fails.
   */
  async saveWithPlace(
    discovery: Discovery,
    placeId: string | undefined,
    placeName: string,
    createdById: string,
  ): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Resolve or create place
      let resolvedPlaceId: string;
      if (placeId) {
        const exists = await tx.place.findUnique({ where: { id: placeId } });
        if (!exists) throw new NotFoundError(`Place ${placeId} not found`);
        resolvedPlaceId = placeId;
      } else {
        const { randomUUID } = await import("node:crypto");
        const newPlaceId = randomUUID();
        await tx.$executeRaw`
          INSERT INTO places (id, name, location, "createdById")
          VALUES (${newPlaceId}, ${placeName},
            ST_MakePoint(${discovery.coords.lng}, ${discovery.coords.lat})::geography,
            ${createdById})
        `;
        resolvedPlaceId = newPlaceId;
      }

      // 2. Insert discovery
      await tx.$executeRaw`
        INSERT INTO discoveries (id, "productId", "placeId", price, quantity, "reporterId", note, location, "expiresAt")
        VALUES (
          ${discovery.id},
          ${discovery.productId},
          ${resolvedPlaceId},
          ${discovery.price.cents / 100},
          ${discovery.quantity},
          ${discovery.reporterId},
          ${discovery.note ?? null},
          ST_MakePoint(${discovery.coords.lng}, ${discovery.coords.lat})::geography,
          ${discovery.expiresAt}
        )
      `;
      return resolvedPlaceId;
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.discovery.update({
      where: { id },
      data: { hiddenAt: new Date() },
    });
  }
}

@Injectable()
export class PlaceUpsertServiceImpl implements PlaceUpsertService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(
    placeId: string | undefined,
    name: string,
    lat: number,
    lng: number,
    createdById: string,
  ): Promise<string> {
    if (placeId) {
      const exists = await this.prisma.place.findUnique({ where: { id: placeId } });
      if (!exists) throw new NotFoundError(`Place ${placeId} not found`);
      return exists.id;
    }
    const { randomUUID } = await import("node:crypto");
    const id = randomUUID();
    await this.prisma.$executeRaw`
      INSERT INTO places (id, name, location, "createdById")
      VALUES (${id}, ${name}, ST_MakePoint(${lng}, ${lat})::geography, ${createdById})
    `;
    return id;
  }
}
