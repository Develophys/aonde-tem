import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// The Prisma CLI runs as its own process (not through Nest's ConfigModule), so it
// needs its own .env loading — mirror the path Nest uses in app.module.ts.
loadEnv({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: "../../prisma/schema.prisma",
  datasource: {
    url: process.env["DATABASE_URL"] ?? "postgresql://aonde:aonde@localhost:5432/aonde",
  },
});
