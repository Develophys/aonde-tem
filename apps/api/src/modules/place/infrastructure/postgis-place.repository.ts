import { Injectable } from "@nestjs/common";
import { Coordinates, Place, PlaceRepository } from "@aonde-tem/domain";
import { PrismaService } from "../../../shared/prisma.service";

interface Row {
  id: string;
  name: string;
  category: string;
  address: string | null;
  lat: number;
  lng: number;
}

@Injectable()
export class PostgisPlaceRepository implements PlaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(r: Row): Place {
    return Place.create({
      id: r.id,
      name: r.name,
      category: r.category,
      address: r.address ?? undefined,
      coords: Coordinates.create(r.lat, r.lng),
    });
  }

  async findById(id: string): Promise<Place | null> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT id, name, category, address,
             ST_Y(location::geometry) AS lat,
             ST_X(location::geometry) AS lng
      FROM places WHERE id = ${id} LIMIT 1;`;
    const row = rows[0];
    return row ? this.toDomain(row) : null;
  }

  async findNearby(center: Coordinates, radiusMeters: number): Promise<Place[]> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT id, name, category, address,
             ST_Y(location::geometry) AS lat,
             ST_X(location::geometry) AS lng
      FROM places
      WHERE ST_DWithin(location, ST_MakePoint(${center.lng}, ${center.lat})::geography, ${radiusMeters})
      ORDER BY location <-> ST_MakePoint(${center.lng}, ${center.lat})::geography
      LIMIT 50;`;
    return rows.map((r) => this.toDomain(r));
  }

  async save(place: Place): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO places (id, name, address, location, "updatedAt")
      VALUES (
        ${place.id}, ${place.name}, ${place.address ?? null},
        ST_SetSRID(ST_MakePoint(${place.coords.lng}, ${place.coords.lat}), 4326)::geography,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        location = EXCLUDED.location,
        "updatedAt" = CURRENT_TIMESTAMP;`;
  }
}
