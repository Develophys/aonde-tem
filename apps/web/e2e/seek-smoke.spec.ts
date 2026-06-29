import { test, expect } from "@playwright/test";

test.describe("Seek smoke", () => {
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
    const searchInput = page.getByPlaceholder("Buscar produto…");
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
