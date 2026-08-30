import { test, expect, type Page } from "@playwright/test";
import { seedAppState } from "./support/app-state.js";

// Search lives on its own tab now (features/seek/ui/SearchPage.tsx), not over the map.
// Choosing a product sends the term back to the map as an ?item= filter, so a test that
// wants a filtered map goes through here rather than typing on the map itself.
async function searchFor(page: Page, term: string) {
  await page.getByRole("link", { name: "Buscar" }).click();
  const input = page.getByPlaceholder("Buscar produto…");
  await input.fill(term);
  await input.press("Enter");
  await expect(page).toHaveURL(/\?item=/);
}

test.describe("Seek smoke", () => {
  // OnboardingGate redirects a profile that has never seen the intro to /onboarding, so a
  // fresh Playwright context would never reach the map. Seed the same flag the app itself
  // persists rather than bypassing the gate.
  test.beforeEach(async ({ page }) => {
    await seedAppState(page);
  });

  test("map canvas renders on load", async ({ page }) => {
    await page.context().setGeolocation({ latitude: -23.55, longitude: -46.63 });
    await page.context().grantPermissions(["geolocation"]);
    await page.goto("/");
    // Map renders as a canvas element
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10_000 });
  });

  test("searching a product filters the map without erroring", async ({ page }) => {
    await page.context().setGeolocation({ latitude: -23.55, longitude: -46.63 });
    await page.context().grantPermissions(["geolocation"]);
    await page.goto("/");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10_000 });

    await searchFor(page, "arroz");

    await expect(page.getByRole("button", { name: "Remover filtro arroz" })).toBeVisible();
    // Assert against the real failure copy, not the word "Erro" — SeekPage's fetch-error
    // card says "Não foi possível buscar relatos.", so the old check passed even while
    // every request was failing (it did, against a build with the production API URL
    // baked in).
    await expect(page.getByText("Não foi possível buscar relatos.")).toHaveCount(0);
  });

  test("empty state shows when no results", async ({ page }) => {
    await page.context().setGeolocation({ latitude: -23.55, longitude: -46.63 });
    await page.context().grantPermissions(["geolocation"]);
    await page.goto("/");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10_000 });
    await searchFor(page, "produto-inexistente-xyz-123");
    await page.waitForTimeout(1_500);
    await expect(page.getByText("Ninguém relatou")).toBeVisible();
  });

  test("geolocation denial shows fallback", async ({ page }) => {
    await page.context().clearPermissions();
    await page.goto("/");
    await expect(page.getByText("Localização negada")).toBeVisible({ timeout: 8_000 });
  });
});
