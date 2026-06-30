import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env["DATABASE_URL"] ?? "postgresql://aonde:aonde@localhost:5432/aonde",
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// Fixed UUIDs so the seed is idempotent (re-running inserts nothing twice).
const SEED_USER_ID = "00000000-0000-0000-0000-000000000001";

const PRODUCTS = [
  {
    id: "00000000-0000-0000-0001-000000000001",
    name: "Arroz Tio João 5kg",
    normalizedKey: "arroz tio joao 5kg",
  },
  {
    id: "00000000-0000-0000-0001-000000000002",
    name: "Feijão Carioca 1kg",
    normalizedKey: "feijao carioca 1kg",
  },
  {
    id: "00000000-0000-0000-0001-000000000003",
    name: "Óleo de Soja 900ml",
    normalizedKey: "oleo de soja 900ml",
  },
  {
    id: "00000000-0000-0000-0001-000000000004",
    name: "Leite Integral 1L",
    normalizedKey: "leite integral 1l",
  },
  {
    id: "00000000-0000-0000-0001-000000000005",
    name: "Café Pilão 500g",
    normalizedKey: "cafe pilao 500g",
  },
] as const;

// São Paulo: near Av. Paulista / Pinheiros / Vila Madalena
const PLACES = [
  {
    id: "00000000-0000-0000-0002-000000000001",
    name: "Supermercado Extra Paulista",
    lat: -23.563,
    lng: -46.651,
  },
  {
    id: "00000000-0000-0000-0002-000000000002",
    name: "Carrefour Pinheiros",
    lat: -23.5663,
    lng: -46.6943,
  },
  {
    id: "00000000-0000-0000-0002-000000000003",
    name: "Pão de Açúcar Vila Madalena",
    lat: -23.5582,
    lng: -46.6896,
  },
] as const;

// [productIndex, placeIndex, priceBrl, quantity]
const DISCOVERIES: [number, number, number, number][] = [
  [0, 0, 26.9, 8],
  [0, 1, 24.5, 15],
  [0, 2, 27.8, 3],
  [1, 0, 8.99, 20],
  [1, 1, 7.49, 5],
  [2, 0, 6.89, 10],
  [3, 0, 4.99, 30],
  [3, 2, 5.29, 12],
  [4, 0, 19.9, 6],
  [4, 1, 18.5, 9],
];

async function main() {
  console.log("Seeding database…");

  // User (upsert — safe to re-run)
  await prisma.user.upsert({
    where: { id: SEED_USER_ID },
    create: {
      id: SEED_USER_ID,
      email: "seed@aonde-tem.dev",
      displayName: "Seed Bot",
      role: "user",
    },
    update: {},
  });

  // Products — conflict on normalizedKey (the true business key); if a product
  // with that key already exists from the app, leave it alone.
  for (const p of PRODUCTS) {
    await prisma.$executeRaw`
      INSERT INTO products (id, name, "normalizedKey", "createdById")
      VALUES (${p.id}, ${p.name}, ${p.normalizedKey}, ${SEED_USER_ID})
      ON CONFLICT ("normalizedKey") DO NOTHING
    `;
  }

  // Places — PostGIS geography column requires $executeRaw
  for (const pl of PLACES) {
    await prisma.$executeRaw`
      INSERT INTO places (id, name, location, "createdById")
      VALUES (
        ${pl.id},
        ${pl.name},
        ST_MakePoint(${pl.lng}, ${pl.lat})::geography,
        ${SEED_USER_ID}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }

  // Discoveries — 24 h TTL from now
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  for (let i = 0; i < DISCOVERIES.length; i++) {
    const [pIdx, plIdx, price, quantity] = DISCOVERIES[i];
    const id = `00000000-0000-0000-0003-${String(i + 1).padStart(12, "0")}`;
    const product = PRODUCTS[pIdx];
    const place = PLACES[plIdx];

    // Use a subquery to resolve the actual productId in case the product was
    // inserted by the app with a different UUID but the same normalizedKey.
    await prisma.$executeRaw`
      INSERT INTO discoveries (id, "productId", "placeId", price, quantity, "reporterId", location, "expiresAt")
      SELECT
        ${id},
        p.id,
        ${place.id},
        ${price},
        ${quantity},
        ${SEED_USER_ID},
        ST_MakePoint(${place.lng}, ${place.lat})::geography,
        ${expiresAt}
      FROM products p
      WHERE p."normalizedKey" = ${product.normalizedKey}
      ON CONFLICT (id) DO UPDATE SET "expiresAt" = EXCLUDED."expiresAt"
    `;
  }

  console.log(
    `Done: 1 user · ${PRODUCTS.length} products · ${PLACES.length} places · ${DISCOVERIES.length} discoveries`,
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
