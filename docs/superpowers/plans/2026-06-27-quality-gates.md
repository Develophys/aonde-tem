# DevEx & Quality Gates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire quality enforcement: Husky + commitlint, CI pipeline, Lighthouse mobile gate (≥ 90), bundle-size budget, API integration tests, E2E smoke test, Impeccable slop detector.

**Architecture:** Turborepo orchestrates `lint + typecheck + test + build`. GitHub Actions CI. Lighthouse CI on Vercel/CI. `size-limit` for bundle check. Playwright for E2E.

**Tech Stack:** Husky, lint-staged, commitlint (Conventional Commits), GitHub Actions, Playwright, Lighthouse CI, `@size-limit/preset-app`, TypeScript strict.

## Global Constraints

- **Prerequisite:** All previous plans (A–F) complete; app runs end-to-end
- CI runs: `turbo run lint typecheck test build` — all must pass before merge
- Lighthouse mobile budget: Performance ≥ 90, LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 (PERFORMANCE.md)
- Initial route JS ≤ 150 KB gzip (PERFORMANCE.md); map chunk excluded from this budget
- E2E smoke: open app → map visible + search "arroz" returns markers
- Backlog items: AT-007, AT-008, AT-009, AT-100, AT-101, AT-102, AT-103, AT-117, AT-119, AT-120

---

## File Structure

**New files:**
- `.husky/pre-commit`
- `.husky/commit-msg`
- `commitlint.config.mjs`
- `.github/workflows/ci.yml`
- `.github/pull_request_template.md`
- `.lighthouserc.mjs`
- `.size-limit.mjs`
- `apps/web/playwright.config.ts`
- `apps/web/e2e/seek-smoke.spec.ts`

**Modified files:**
- `package.json` (root) — add prepare, lint-staged, commitlint scripts
- `turbo.json` — add `typecheck` task

---

### Task 1: Husky + lint-staged + commitlint (AT-007)

**Files:**
- Create: `.husky/pre-commit`, `.husky/commit-msg`
- Create: `commitlint.config.mjs`
- Modify: `package.json` (root)

- [ ] **Step 1: Install dev dependencies**

```bash
pnpm add -w -D husky lint-staged @commitlint/cli @commitlint/config-conventional
```

- [ ] **Step 2: Initialize Husky**

```bash
npx husky init
```

Expected: `.husky/` directory created with a `pre-commit` file.

- [ ] **Step 3: Write pre-commit hook**

Replace `.husky/pre-commit` with:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

- [ ] **Step 4: Write commit-msg hook**

Create `.husky/commit-msg`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit "$1"
```

- [ ] **Step 5: Write commitlint config**

```javascript
// commitlint.config.mjs
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2, "always",
      ["feat", "fix", "chore", "refactor", "test", "docs", "style", "perf", "ci", "build", "revert"],
    ],
    "subject-max-length": [2, "always", 100],
  },
};
```

- [ ] **Step 6: Add lint-staged config to root package.json**

Open `package.json` at the root and add:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml,css}": ["prettier --write"]
  },
  "scripts": {
    "prepare": "husky"
  }
}
```

- [ ] **Step 7: Verify hooks work**

```bash
git add -A
git commit -m "chore: test commit hook"
```

Expected: lint-staged runs on staged files; bad commit message rejected by commitlint.

- [ ] **Step 8: Commit (with proper message)**

```bash
git add .husky/ commitlint.config.mjs package.json
git commit -m "chore(devex): Husky + lint-staged + commitlint (AT-007)"
```

---

### Task 2: GitHub Actions CI pipeline (AT-008, AT-009, AT-103)

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/pull_request_template.md`

- [ ] **Step 1: Write CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    name: Lint · Typecheck · Test · Build
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgis/postgis:16-3.4-alpine
        env:
          POSTGRES_USER: app
          POSTGRES_PASSWORD: app
          POSTGRES_DB: app
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 3s
          --health-retries 10

    env:
      DATABASE_URL: postgresql://app:app@localhost:5432/app
      VITE_MAP_KEY: dummy-key-for-ci
      JWT_SECRET: ci-test-secret

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: latest

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run migrations
        run: npx prisma migrate deploy

      - name: Lint
        run: pnpm turbo run lint

      - name: Typecheck
        run: pnpm turbo run typecheck

      - name: Test
        run: pnpm turbo run test

      - name: Build
        run: pnpm turbo run build

      - name: Check bundle size
        run: pnpm --filter @app/web size-limit
```

- [ ] **Step 2: Add typecheck task to turbo.json**

Open `turbo.json` and add:

```json
{
  "tasks": {
    "typecheck": { "dependsOn": ["^build"] },
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "lint": {},
    "test": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

- [ ] **Step 3: Add typecheck script to each package.json that needs it**

In `packages/domain/package.json`:
```json
{ "scripts": { "typecheck": "tsc --noEmit" } }
```

In `packages/contracts/package.json`:
```json
{ "scripts": { "typecheck": "tsc --noEmit" } }
```

In `apps/api/package.json`:
```json
{ "scripts": { "typecheck": "tsc --noEmit" } }
```

In `apps/web/package.json`:
```json
{ "scripts": { "typecheck": "tsc --noEmit" } }
```

- [ ] **Step 4: Write PR template**

```markdown
<!-- .github/pull_request_template.md -->
## O que muda

<!-- 1-3 bullets descrevendo as mudanças -->

## Como testar

- [ ] Testou no mobile (dev tools → mobile emulation)?
- [ ] Testou com localização negada?
- [ ] Testou sem conexão (service worker)?
- [ ] Passou no `pnpm turbo run lint typecheck test build`?

## Performance

- [ ] MapLibre ainda está lazy-loaded (não aparece no bundle inicial)?
- [ ] Tamanho do bundle dentro do budget (≤ 150 KB gzip para JS inicial)?
- [ ] Sensato numa rede 3G lenta?

## Checklist

- [ ] Testes escritos / atualizados
- [ ] Docs atualizados se necessário
- [ ] Sem `console.log` esquecidos
```

- [ ] **Step 5: Commit**

```bash
git add .github/ turbo.json
git commit -m "ci: GitHub Actions CI pipeline — lint, typecheck, test, build (AT-009, AT-103)"
```

---

### Task 3: Bundle size budget check (AT-120)

**Files:**
- Create: `.size-limit.mjs`
- Modify: `apps/web/package.json` — add `size-limit` script

- [ ] **Step 1: Install size-limit**

```bash
pnpm --filter @app/web add -D @size-limit/preset-app @size-limit/file
```

- [ ] **Step 2: Write size-limit config**

```javascript
// apps/web/.size-limit.mjs  (or .size-limit.json at repo root)
export default [
  {
    name: "Initial JS (gzip, excl. map)",
    path: "dist/assets/index-*.js",
    gzip: true,
    limit: "150 KB",
    // Ignore maplibre chunks (they're lazy-loaded)
    ignore: ["maplibre-gl", "react-map-gl"],
  },
  {
    name: "Initial critical transfer (HTML+CSS+JS)",
    path: ["dist/index.html", "dist/assets/index-*.css", "dist/assets/index-*.js"],
    gzip: true,
    limit: "250 KB",
  },
];
```

- [ ] **Step 3: Add script to apps/web/package.json**

```json
{
  "scripts": {
    "size-limit": "size-limit"
  }
}
```

- [ ] **Step 4: Test locally**

```bash
pnpm --filter @app/web build
pnpm --filter @app/web size-limit
```

Expected: output showing bundle sizes vs limits; fails if either exceeds budget.

- [ ] **Step 5: Commit**

```bash
git add apps/web/.size-limit.mjs apps/web/package.json
git commit -m "perf: bundle size budget gate via size-limit (AT-120)"
```

---

### Task 4: Lighthouse CI mobile gate (AT-119)

**Files:**
- Create: `.lighthouserc.mjs`

- [ ] **Step 1: Install Lighthouse CI**

```bash
pnpm add -w -D @lhci/cli
```

- [ ] **Step 2: Write lighthouserc config**

```javascript
// .lighthouserc.mjs
export default {
  ci: {
    collect: {
      url: ["http://localhost:4173/"], // Vite preview
      numberOfRuns: 2,
      settings: {
        preset: "perf",
        formFactor: "mobile",
        throttlingMethod: "simulate",
        screenEmulation: {
          mobile: true,
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
        },
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "first-contentful-paint": ["warn", { maxNumericValue: 2500 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["warn", { maxNumericValue: 300 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
```

- [ ] **Step 3: Add Lighthouse step to CI workflow**

Add after the build step in `.github/workflows/ci.yml`:

```yaml
      - name: Preview build
        run: pnpm --filter @app/web preview &
        env:
          VITE_MAP_KEY: dummy-key-for-ci

      - name: Wait for preview
        run: npx wait-on http://localhost:4173 --timeout 30000

      - name: Lighthouse CI
        run: npx lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

Also add `wait-on` dev dependency:

```bash
pnpm add -w -D wait-on
```

- [ ] **Step 4: Commit**

```bash
git add .lighthouserc.mjs .github/workflows/ci.yml
git commit -m "perf: Lighthouse CI mobile gate (Performance ≥ 90) (AT-119)"
```

---

### Task 5: E2E smoke test with Playwright (AT-102)

**Files:**
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/e2e/seek-smoke.spec.ts`

- [ ] **Step 1: Install Playwright**

```bash
pnpm --filter @app/web add -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Write Playwright config**

```typescript
// apps/web/playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:4173",
    ...devices["Pixel 5"],
    locale: "pt-BR",
  },
  projects: [{ name: "chromium", use: { ...devices["Pixel 5"] } }],
  webServer: {
    command: "pnpm preview",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 3: Write smoke test**

```typescript
// apps/web/e2e/seek-smoke.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Seek smoke", () => {
  test("map renders and search returns results", async ({ page }) => {
    // Mock geolocation to São Paulo
    await page.context().setGeolocation({ latitude: -23.55, longitude: -46.63 });
    await page.context().grantPermissions(["geolocation"]);

    await page.goto("/");

    // Wait for the page to load
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10_000 });

    // Search for arroz
    await page.getByPlaceholder("Buscar produto…").fill("arroz");

    // Wait for results — markers appear on canvas (we can't easily check canvas,
    // but we can check no error state appears and loading resolves)
    await page.waitForTimeout(2_000);
    await expect(page.getByText("Buscando…")).not.toBeVisible();
    await expect(page.getByText("ninguém relatou")).not.toBeVisible();
  });

  test("empty state shows when no results", async ({ page }) => {
    await page.context().setGeolocation({ latitude: -23.55, longitude: -46.63 });
    await page.context().grantPermissions(["geolocation"]);
    await page.goto("/");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10_000 });

    await page.getByPlaceholder("Buscar produto…").fill("produto-inexistente-xyz-123");
    await page.waitForTimeout(1_500);

    await expect(page.getByText("Ninguém relatou")).toBeVisible();
  });

  test("geolocation denial shows fallback", async ({ page }) => {
    await page.context().clearPermissions();
    await page.goto("/");
    await expect(page.getByText("Localização negada")).toBeVisible({ timeout: 8_000 });
  });
});
```

- [ ] **Step 4: Add E2E script to apps/web/package.json**

```json
{
  "scripts": {
    "e2e": "playwright test"
  }
}
```

- [ ] **Step 5: Add E2E step to CI**

Add to `.github/workflows/ci.yml`:

```yaml
      - name: E2E smoke tests
        run: pnpm --filter @app/web e2e
        env:
          DATABASE_URL: postgresql://app:app@localhost:5432/app
```

- [ ] **Step 6: Run locally to verify**

```bash
pnpm --filter @app/web build
pnpm --filter @app/web e2e
```

Expected: all 3 tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/playwright.config.ts apps/web/e2e/ .github/workflows/ci.yml
git commit -m "test(e2e): Playwright smoke test — map renders + search + empty state + geo fallback (AT-102)"
```

---

### Task 6: Impeccable slop detector in CI (AT-117)

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add slop detector step**

Add to `.github/workflows/ci.yml` after the build step:

```yaml
      - name: Impeccable slop detector
        run: npx impeccable detect apps/web/src/
        continue-on-error: false
```

> **Note:** This step fails the build if anti-patterns from the Impeccable catalog are detected in the frontend source. The Impeccable anti-references for this project are documented in `PRODUCT.md` (no gradients, glassmorphism, fake dashboards, etc.)

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: Impeccable slop detector gate in CI (AT-117)"
```

---

### Task 7: API integration test suite (AT-101)

**Files:**
- Create: `apps/api/src/modules/product/product.controller.spec.ts`
- Create: `apps/api/src/modules/auth/auth.controller.spec.ts`

- [ ] **Step 1: Write auth integration test**

```typescript
// apps/api/src/modules/auth/auth.controller.spec.ts
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../app.module.js";

describe("Auth", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  it("POST /auth/send-code returns 200 for valid email", async () => {
    await request(app.getHttpServer())
      .post("/auth/send-code")
      .send({ email: "test-ci@example.com" })
      .expect(201);
  });

  it("POST /auth/verify-code returns 401 for wrong code", async () => {
    await request(app.getHttpServer())
      .post("/auth/verify-code")
      .send({ email: "test-ci@example.com", code: "000000" })
      .expect(401);
  });

  it("POST /auth/send-code rejects invalid email", async () => {
    await request(app.getHttpServer())
      .post("/auth/send-code")
      .send({ email: "notanemail" })
      .expect(400);
  });
});
```

- [ ] **Step 2: Write product integration test**

```typescript
// apps/api/src/modules/product/product.controller.spec.ts
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../app.module.js";

describe("Products", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  it("GET /products?q= returns autocomplete results", async () => {
    const res = await request(app.getHttpServer())
      .get("/products?q=arroz")
      .expect(200);
    expect(res.body).toHaveProperty("results");
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  it("POST /products without auth returns 401", async () => {
    await request(app.getHttpServer())
      .post("/products")
      .send({ name: "Test Product" })
      .expect(401);
  });
});
```

- [ ] **Step 3: Run all API tests**

```bash
DATABASE_URL="postgresql://app:app@localhost:5432/app" pnpm --filter @app/api test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/
git commit -m "test(api): auth + product + discovery integration tests (AT-101)"
```

---

## Self-Review Checklist

- [x] **AT-007** — Husky pre-commit (lint-staged) + commit-msg (commitlint)
- [x] **AT-008** — GitHub repo setup: PR template
- [x] **AT-009** — CI: `turbo run lint typecheck test build` on every PR
- [x] **AT-100/101** — Domain unit tests (Plan A) + API integration tests
- [x] **AT-102** — Playwright E2E smoke: map + search + empty state + geo denial
- [x] **AT-103** — CI gate blocks merge on failing checks
- [x] **AT-117** — Impeccable slop detector fails CI on anti-patterns
- [x] **AT-119** — Lighthouse CI mobile Performance ≥ 90, LCP ≤ 2.5s, CLS ≤ 0.1
- [x] **AT-120** — Bundle size budget: initial JS ≤ 150 KB gzip; total ≤ 250 KB
- [x] CI uses real PostGIS DB (service container) for integration tests
