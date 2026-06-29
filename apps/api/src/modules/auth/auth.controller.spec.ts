import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { Response } from "supertest";
import { AppModule } from "../../app.module.js";
import { AllExceptionsFilter } from "../../shared/errors/all-exceptions.filter.js";

describe("Auth (integration)", () => {
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

  it("POST /api/auth/send-code returns 2xx for valid email", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/send-code")
      .send({ email: "ci-test@example.com" })
      .expect((res: Response) => {
        expect([200, 201]).toContain(res.status);
      });
  });

  it("POST /api/auth/verify-code returns 401 for wrong code", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/verify-code")
      .send({ email: "ci-test@example.com", code: "000000" })
      .expect(401);
  });

  it("POST /api/auth/send-code returns 400 for invalid email", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/send-code")
      .send({ email: "notanemail" })
      .expect(400);
  });
});
