import { test, expect, type Page } from "@playwright/test";
import { seedAppState } from "./support/app-state.js";

// The search bar rests as a 44x44 magnifier (see features/seek/ui/SearchBar.tsx); the
// input only exists once it is expanded. Every test that types has to go through here.
async function openSearch(page: Page) {
  await page.getByRole("button", { name: "Buscar produto" }).click();
  return page.getByPlaceholder("Buscar produto…");
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

  test("search input is present and accepts input", async ({ page }) => {
    await page.context().setGeolocation({ latitude: -23.55, longitude: -46.63 });
    await page.context().grantPermissions(["geolocation"]);
    await page.goto("/");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10_000 });
    // Type in the search box — it should not throw
    const searchInput = await openSearch(page);
    await searchInput.fill("arroz");
    await expect(searchInput).toHaveValue("arroz");
    // Wait briefly for any query to resolve; no error banner should appear
    await page.waitForTimeout(1_500);
    await expect(page.getByText("Erro")).not.toBeVisible();
  });

  test("empty state shows when no results", async ({ page }) => {
    await page.context().setGeolocation({ latitude: -23.55, longitude: -46.63 });
    await page.context().grantPermissions(["geolocation"]);
    await page.goto("/");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10_000 });
    const searchInput = await openSearch(page);
    await searchInput.fill("produto-inexistente-xyz-123");
    await page.waitForTimeout(1_500);
    await expect(page.getByText("Ninguém relatou")).toBeVisible();
  });

  test("geolocation denial shows fallback", async ({ page }) => {
    await page.context().clearPermissions();
    await page.goto("/");
    await expect(page.getByText("Localização negada")).toBeVisible({ timeout: 8_000 });
  });
});
