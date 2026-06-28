import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module.js";

describe("GET /discoveries/nearby", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with results array", async () => {
    const res = await request(app.getHttpServer())
      .get("/discoveries/nearby?lat=-23.55&lng=-46.63&radius=10000")
      .expect(200);
    expect(res.body).toHaveProperty("results");
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body).toHaveProperty("total");
    expect(typeof res.body.total).toBe("number");
  });

  it("filters by item query", async () => {
    const res = await request(app.getHttpServer())
      .get("/discoveries/nearby?lat=-23.55&lng=-46.63&radius=10000&item=arroz")
      .expect(200);
    const names: string[] = res.body.results.map((r: any) => r.productName.toLowerCase());
    expect(names.length).toBeGreaterThan(0);
    names.forEach((n) => expect(n).toContain("arroz"));
  });

  it("rejects missing lat/lng", async () => {
    await request(app.getHttpServer())
      .get("/discoveries/nearby?radius=5000")
      .expect(400);
  });
});
