// prisma/seed.ts
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString =
  process.env["DATABASE_URL"] ?? "postgresql://aonde:aonde@localhost:5432/aonde";

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@aondetem.com.br" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      email: "admin@aondetem.com.br",
      role: "admin",
      displayName: "Admin",
    },
  });

  // Products
  const arroz = await prisma.product.upsert({
    where: { normalizedKey: "arroz 5kg" },
    update: {},
    create: {
      name: "Arroz 5kg",
      normalizedKey: "arroz 5kg",
      createdById: admin.id,
    },
  });
  const leite = await prisma.product.upsert({
    where: { normalizedKey: "leite integral 1l" },
    update: {},
    create: {
      name: "Leite Integral 1L",
      normalizedKey: "leite integral 1l",
      createdById: admin.id,
    },
  });
  const oleo = await prisma.product.upsert({
    where: { normalizedKey: "oleo de soja 900ml" },
    update: {},
    create: {
      name: "Óleo de Soja 900ml",
      normalizedKey: "oleo de soja 900ml",
      createdById: admin.id,
    },
  });

  // Places (São Paulo) — location via raw SQL since PostGIS uses Unsupported type
  // Columns in DB are camelCase (no @map annotations): id, name, location, createdById, createdAt
  await prisma.$executeRaw`
    INSERT INTO "places" ("id", "name", "location", "createdById")
    VALUES
      ('00000000-0000-0000-0000-000000000010', 'Mercado do Bairro',      ST_MakePoint(-46.638, -23.548)::geography, ${admin.id}),
      ('00000000-0000-0000-0000-000000000011', 'Supermercado Central',   ST_MakePoint(-46.625, -23.562)::geography, ${admin.id}),
      ('00000000-0000-0000-0000-000000000012', 'Mercearia São João',     ST_MakePoint(-46.642, -23.555)::geography, ${admin.id})
    ON CONFLICT ("id") DO NOTHING
  `;

  // Discoveries — columns are camelCase in DB
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.$executeRaw`
    INSERT INTO "discoveries" ("id", "productId", "placeId", "price", "quantity", "reporterId", "location", "expiresAt")
    VALUES
      ('00000000-0000-0000-0000-000000000020', ${arroz.id}, '00000000-0000-0000-0000-000000000010', 32.90, 15, ${admin.id}, ST_MakePoint(-46.638, -23.548)::geography, ${expiresAt}),
      ('00000000-0000-0000-0000-000000000021', ${arroz.id}, '00000000-0000-0000-0000-000000000011', 34.50, 8,  ${admin.id}, ST_MakePoint(-46.625, -23.562)::geography, ${expiresAt}),
      ('00000000-0000-0000-0000-000000000022', ${leite.id}, '00000000-0000-0000-0000-000000000010', 5.99,  20, ${admin.id}, ST_MakePoint(-46.638, -23.548)::geography, ${expiresAt}),
      ('00000000-0000-0000-0000-000000000023', ${leite.id}, '00000000-0000-0000-0000-000000000012', 6.20,  5,  ${admin.id}, ST_MakePoint(-46.642, -23.555)::geography, ${expiresAt}),
      ('00000000-0000-0000-0000-000000000024', ${oleo.id},  '00000000-0000-0000-0000-000000000011', 8.90,  12, ${admin.id}, ST_MakePoint(-46.625, -23.562)::geography, ${expiresAt}),
      ('00000000-0000-0000-0000-000000000025', ${arroz.id}, '00000000-0000-0000-0000-000000000012', 33.50, 6,  ${admin.id}, ST_MakePoint(-46.642, -23.555)::geography, ${expiresAt}),
      ('00000000-0000-0000-0000-000000000026', ${leite.id}, '00000000-0000-0000-0000-000000000011', 6.10,  18, ${admin.id}, ST_MakePoint(-46.625, -23.562)::geography, ${expiresAt}),
      ('00000000-0000-0000-0000-000000000027', ${oleo.id},  '00000000-0000-0000-0000-000000000010', 9.20,  9,  ${admin.id}, ST_MakePoint(-46.638, -23.548)::geography, ${expiresAt}),
      ('00000000-0000-0000-0000-000000000028', ${oleo.id},  '00000000-0000-0000-0000-000000000012', 8.75,  14, ${admin.id}, ST_MakePoint(-46.642, -23.555)::geography, ${expiresAt}),
      ('00000000-0000-0000-0000-000000000029', ${arroz.id}, '00000000-0000-0000-0000-000000000011', 35.00, 3,  ${admin.id}, ST_MakePoint(-46.625, -23.562)::geography, ${expiresAt})
    ON CONFLICT ("id") DO NOTHING
  `;

  // Verify counts
  const userCount = await prisma.user.count();
  const productCount = await prisma.product.count();
  const [placeResult] = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM "places"`;
  const [discoveryResult] = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM "discoveries"`;

  console.log(
    `Seed complete: ${userCount} user(s), ${productCount} product(s), ${placeResult.count} place(s), ${discoveryResult.count} discovery(s) in São Paulo`
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
