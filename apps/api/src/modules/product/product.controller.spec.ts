import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module.js";
import { AllExceptionsFilter } from "../../shared/errors/all-exceptions.filter.js";

describe("Products (integration)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    // No ValidationPipe: controllers use Zod directly for validation
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/products?q=arroz returns results array", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/products?q=arroz")
      .expect(200);
    expect(res.body).toHaveProperty("results");
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  it("GET /api/products without q param returns 200 with empty results", async () => {
    // The controller short-circuits and returns { results: [] } when q is absent or empty
    const res = await request(app.getHttpServer())
      .get("/api/products")
      .expect(200);
    expect(res.body).toHaveProperty("results");
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results).toHaveLength(0);
  });
});
