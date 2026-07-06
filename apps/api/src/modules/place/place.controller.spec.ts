import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { AppModule } from "../../app.module.js";
import { AllExceptionsFilter } from "../../shared/errors/all-exceptions.filter.js";
import { PrismaService } from "../../shared/prisma.service.js";

describe("GET /places/:id — isMine (integration)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  const ownerId = randomUUID();
  const productId = randomUUID();
  const placeId = randomUUID();
  const discoveryId = randomUUID();
  let ownerToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = moduleRef.get(PrismaService);
    jwt = moduleRef.get(JwtService);
    ownerToken = jwt.sign({ sub: ownerId, email: `owner-${ownerId}@test.dev`, role: "user" });

    await prisma.user.create({
      data: { id: ownerId, email: `owner-${ownerId}@test.dev`, role: "user" },
    });
    await prisma.$executeRaw`
      INSERT INTO products (id, name, "normalizedKey", "createdById")
      VALUES (${productId}, 'Produto Teste IsMine', ${"produto-teste-ismine-" + productId}, ${ownerId})
    `;
    await prisma.$executeRaw`
      INSERT INTO places (id, name, location, "createdById")
      VALUES (${placeId}, 'Loja Teste IsMine', ST_MakePoint(-46.6, -23.5)::geography, ${ownerId})
    `;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.$executeRaw`
      INSERT INTO discoveries (id, "productId", "placeId", price, quantity, "reporterId", location, "expiresAt")
      VALUES (${discoveryId}, ${productId}, ${placeId}, 4.5, 2, ${ownerId}, ST_MakePoint(-46.6, -23.5)::geography, ${expiresAt})
    `;
  });

  afterAll(async () => {
    await prisma.$executeRaw`DELETE FROM discoveries WHERE id = ${discoveryId}`;
    await prisma.$executeRaw`DELETE FROM places WHERE id = ${placeId}`;
    await prisma.$executeRaw`DELETE FROM products WHERE id = ${productId}`;
    await prisma.user.delete({ where: { id: ownerId } });
    await app.close();
  });

  function findItem(body: { discoveries: { id: string; isMine: boolean }[] }) {
    const item = body.discoveries.find((d) => d.id === discoveryId);
    if (!item) throw new Error("fixture discovery not found in response");
    return item;
  }

  it("marks the item isMine:false for an anonymous request", async () => {
    const res = await request(app.getHttpServer()).get(`/api/places/${placeId}`).expect(200);
    expect(findItem(res.body).isMine).toBe(false);
  });

  it("marks the item isMine:true when authenticated as the reporter", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/places/${placeId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    expect(findItem(res.body).isMine).toBe(true);
  });

  it("marks the item isMine:false for a different authenticated user", async () => {
    const otherToken = jwt.sign({ sub: randomUUID(), email: "other@test.dev", role: "user" });
    const res = await request(app.getHttpServer())
      .get(`/api/places/${placeId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(200);
    expect(findItem(res.body).isMine).toBe(false);
  });
});
