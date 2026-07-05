import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { AppModule } from "../../app.module.js";
import { AllExceptionsFilter } from "../../shared/errors/all-exceptions.filter.js";
import { PrismaService } from "../../shared/prisma.service.js";

describe("Discovery edit/delete (integration)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  const ownerId = randomUUID();
  const otherId = randomUUID();
  const productId = randomUUID();
  const placeId = randomUUID();
  const updateTargetId = randomUUID();
  const deleteTargetId = randomUUID();

  let ownerToken: string;
  let otherToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = moduleRef.get(PrismaService);
    jwt = moduleRef.get(JwtService);

    ownerToken = jwt.sign({ sub: ownerId, email: `owner-${ownerId}@test.dev`, role: "user" });
    otherToken = jwt.sign({ sub: otherId, email: `other-${otherId}@test.dev`, role: "user" });

    await prisma.user.create({
      data: { id: ownerId, email: `owner-${ownerId}@test.dev`, role: "user" },
    });
    await prisma.user.create({
      data: { id: otherId, email: `other-${otherId}@test.dev`, role: "user" },
    });
    await prisma.$executeRaw`
      INSERT INTO products (id, name, "normalizedKey", "createdById")
      VALUES (${productId}, 'Produto Teste Edicao', ${"produto-teste-edicao-" + productId}, ${ownerId})
    `;
    await prisma.$executeRaw`
      INSERT INTO places (id, name, location, "createdById")
      VALUES (${placeId}, 'Loja Teste Edicao', ST_MakePoint(-46.6, -23.5)::geography, ${ownerId})
    `;

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    for (const id of [updateTargetId, deleteTargetId]) {
      await prisma.$executeRaw`
        INSERT INTO discoveries (id, "productId", "placeId", price, quantity, "reporterId", location, "expiresAt")
        VALUES (${id}, ${productId}, ${placeId}, 9.99, 5, ${ownerId}, ST_MakePoint(-46.6, -23.5)::geography, ${expiresAt})
      `;
    }
  });

  afterAll(async () => {
    await prisma.$executeRaw`DELETE FROM discoveries WHERE "placeId" = ${placeId}`;
    await prisma.$executeRaw`DELETE FROM places WHERE id = ${placeId}`;
    await prisma.$executeRaw`DELETE FROM products WHERE id = ${productId}`;
    await prisma.user.delete({ where: { id: ownerId } });
    await prisma.user.delete({ where: { id: otherId } });
    await app.close();
  });

  it("PATCH without a token returns 401", async () => {
    await request(app.getHttpServer())
      .patch(`/api/discoveries/${updateTargetId}`)
      .send({ priceBrl: 8.5, quantity: 3 })
      .expect(401);
  });

  it("PATCH as a non-owner returns 403", async () => {
    await request(app.getHttpServer())
      .patch(`/api/discoveries/${updateTargetId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ priceBrl: 8.5, quantity: 3 })
      .expect(403);
  });

  it("PATCH with an invalid price returns 400", async () => {
    await request(app.getHttpServer())
      .patch(`/api/discoveries/${updateTargetId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ priceBrl: -1, quantity: 3 })
      .expect(400);
  });

  it("PATCH as the owner updates the report and refreshes expiresAt", async () => {
    const before = await prisma.discovery.findUniqueOrThrow({ where: { id: updateTargetId } });

    const res = await request(app.getHttpServer())
      .patch(`/api/discoveries/${updateTargetId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ priceBrl: 8.5, quantity: 3, note: "preço baixou" })
      .expect(200);

    expect(res.body.priceBrl).toBe(8.5);
    expect(res.body.quantity).toBe(3);
    expect(res.body.note).toBe("preço baixou");
    expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(before.expiresAt.getTime());

    const after = await prisma.discovery.findUniqueOrThrow({ where: { id: updateTargetId } });
    expect(after.createdAt.getTime()).toBeGreaterThan(before.createdAt.getTime());
  });

  it("PATCH on an unknown id returns 404", async () => {
    await request(app.getHttpServer())
      .patch(`/api/discoveries/${randomUUID()}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ priceBrl: 1, quantity: 1 })
      .expect(404);
  });

  it("DELETE as a non-owner returns 403", async () => {
    await request(app.getHttpServer())
      .delete(`/api/discoveries/${deleteTargetId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(403);
  });

  it("DELETE as the owner returns 204, and the report stops being editable", async () => {
    await request(app.getHttpServer())
      .delete(`/api/discoveries/${deleteTargetId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .patch(`/api/discoveries/${deleteTargetId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ priceBrl: 1, quantity: 1 })
      .expect(404);
  });
});
