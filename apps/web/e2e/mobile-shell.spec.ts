import { test, expect, type Locator, type Page } from "@playwright/test";
import { seedAppState } from "./support/app-state.js";
import {
  DEFAULT_COORDS,
  PLACE_ID,
  SUGGESTIONS,
  discoveryFixture,
  stubMapStyle,
  stubNearby,
  stubPlace,
  stubProductSearch,
} from "./support/api-stubs.js";

// Replaces the "open the device toolbar and look at it" step of the parity pass with
// numbers. Everything here runs on the Pixel 5 viewport and pt-BR locale configured in
// playwright.config.ts, and asserts against real boundingBox()/elementFromPoint() values
// rather than against what the CSS is assumed to compute to.

// The built app registers a service worker whose runtime caching would sit between these
// specs and page.route(). Blocking it keeps every stub authoritative.
test.use({ serviceWorkers: "block" });

const MIN_TOUCH_TARGET = 44;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function record(label: string, value: unknown): void {
  console.log(`[measure] ${label}: ${JSON.stringify(value)}`);
}

async function boxOf(locator: Locator, label: string): Promise<Box> {
  const box = await locator.boundingBox();
  expect(box, `${label} should have a bounding box`).not.toBeNull();
  const rounded = {
    x: Math.round(box!.x),
    y: Math.round(box!.y),
    width: Math.round(box!.width),
    height: Math.round(box!.height),
  };
  record(label, rounded);
  return rounded;
}

async function expectTouchTarget(locator: Locator, label: string): Promise<void> {
  const box = await boxOf(locator, `touch-target ${label}`);
  expect(box.width, `${label} width`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  expect(box.height, `${label} height`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
}

/** Asserts the element's bottom edge sits above the tab bar's top edge. */
function expectClearOfNav(box: Box, navTop: number, label: string): void {
  const bottom = box.y + box.height;
  record(`${label} bottom edge vs nav top`, { bottom, navTop, gap: navTop - bottom });
  expect(bottom, `${label} must not run under the tab bar`).toBeLessThanOrEqual(navTop);
}

function nav(page: Page): Locator {
  return page.getByRole("navigation", { name: "Navegação principal" });
}

function magnifier(page: Page): Locator {
  return page.getByRole("button", { name: "Buscar produto", exact: true });
}

/** The top-most element at a point, plus whether it lies inside `selector`. */
async function hitTest(
  page: Page,
  point: { x: number; y: number },
  selector: string,
): Promise<{ tag: string; text: string; insideSelector: boolean }> {
  return page.evaluate(
    ({ x, y, sel }) => {
      const el = document.elementFromPoint(x, y);
      const target = document.querySelector(sel);
      return {
        tag: el?.tagName ?? "none",
        text: (el?.textContent ?? "").trim().slice(0, 40),
        insideSelector: Boolean(el && target && (target === el || target.contains(el))),
      };
    },
    { x: point.x, y: point.y, sel: selector },
  );
}

interface FixedEntry {
  tag: string;
  label: string;
  role: string;
  top: number;
  height: number;
  pointerEvents: string;
}

/**
 * Every `position: fixed` element intersecting the top 120px of the current route.
 *
 * Reports `pointerEvents` as well as geometry: the first version of this probe only ran
 * online, where OfflineBanner returns null, and asserted the list was empty. That missed
 * the banner entirely — offline it is fixed at top:0 and ~44px tall, right over
 * ReportPage's back button. So the invariant is not "nothing is fixed up there" but
 * "nothing fixed up there is tappable".
 */
async function fixedElementsAtTop(page: Page): Promise<FixedEntry[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((el) => getComputedStyle(el).position === "fixed")
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          label: el.getAttribute("aria-label") ?? "",
          role: el.getAttribute("role") ?? "",
          top: Math.round(r.top),
          height: Math.round(r.height),
          pointerEvents: getComputedStyle(el).pointerEvents,
        };
      })
      .filter((entry) => entry.top < 120 && entry.height > 0),
  );
}

test.describe("Bottom navigation", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`renders the four controls and marks the active tab (${theme})`, async ({ page }) => {
      await seedAppState(page, { theme });
      await stubMapStyle(page);
      await stubNearby(page);
      await page.goto("/");

      const html = page.locator("html");
      if (theme === "dark") {
        await expect(html).toHaveClass(/dark/);
      } else {
        await expect(html).not.toHaveClass(/dark/);
      }

      const bar = nav(page);
      await expect(bar).toBeVisible();
      await expect(bar.getByRole("link", { name: "Mapa" })).toBeVisible();
      await expect(bar.getByRole("link", { name: "Avisos" })).toBeVisible();
      await expect(bar.getByRole("link", { name: "Relatar produto" })).toBeVisible();
      await expect(bar.getByRole("link", { name: "Perfil" })).toBeVisible();
      expect(await bar.getByRole("link").count()).toBe(4);

      record(
        `nav background (${theme})`,
        await bar.evaluate((el) => getComputedStyle(el).backgroundColor),
      );
      await boxOf(bar, `nav (${theme})`);

      // Active tab on the map route, then on Perfil.
      await expect(bar.getByRole("link", { name: "Mapa" })).toHaveAttribute("aria-current", "page");
      await expect(bar.getByRole("link", { name: "Perfil" })).not.toHaveAttribute(
        "aria-current",
        "page",
      );

      await bar.getByRole("link", { name: "Perfil" }).click();
      await expect(page).toHaveURL(/\/perfil$/);
      await expect(bar.getByRole("link", { name: "Perfil" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(bar.getByRole("link", { name: "Mapa" })).not.toHaveAttribute(
        "aria-current",
        "page",
      );
    });
  }

  test("marks Avisos active for a signed-in visitor", async ({ page }) => {
    await seedAppState(page, {
      accessToken: "e2e-token",
      sessionUser: { id: PLACE_ID, email: "teste@exemplo.com", displayName: null, role: "user" },
    });
    await page.goto("/avisos");
    await expect(page).toHaveURL(/\/avisos$/);
    await expect(nav(page).getByRole("link", { name: "Avisos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("every tab, the raised report control and the search controls are 44x44 or larger", async ({
    page,
  }) => {
    await seedAppState(page);
    await stubMapStyle(page);
    await stubNearby(page);
    await stubProductSearch(page);
    await page.goto("/");

    const bar = nav(page);
    for (const name of ["Mapa", "Avisos", "Relatar produto", "Perfil"]) {
      await expectTouchTarget(bar.getByRole("link", { name }), name);
    }

    await expectTouchTarget(magnifier(page), "magnifier");
    await magnifier(page).click();
    await expectTouchTarget(page.getByRole("button", { name: "Fechar busca" }), "search close");
  });
});

test.describe("Map chrome clears the tab bar", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`radius pill and empty state sit above the bar (${theme})`, async ({ page }) => {
      await seedAppState(page, { theme });
      await stubMapStyle(page);
      await stubNearby(page, { results: [] });
      await page.goto("/");

      const navBox = await boxOf(nav(page), `nav (${theme})`);
      const pill = await boxOf(
        page.getByRole("slider", { name: "Raio de busca" }).locator(".."),
        `radius pill (${theme})`,
      );
      expectClearOfNav(pill, navBox.y, `radius pill (${theme})`);

      const empty = page.getByText("Ninguém relatou nada por aqui ainda");
      await expect(empty).toBeVisible();
      const emptyBox = await boxOf(
        empty.locator("xpath=ancestor::div[contains(@class,'flex-col')][1]"),
        `empty state (${theme})`,
      );
      expectClearOfNav(emptyBox, navBox.y, `empty state (${theme})`);
    });
  }

  test("the fetch-error card sits above the bar", async ({ page }) => {
    // Waits up to 20s for the query client's retry/backoff chain, inside a 30s default.
    // CI renders with swiftshader on a shared runner, so give this one room.
    test.setTimeout(60_000);
    await seedAppState(page);
    await stubMapStyle(page);
    await stubNearby(page, { fail: true });
    await page.goto("/");

    // The query client retries 5xx twice with backoff before the card renders.
    const card = page.getByText("Não foi possível buscar relatos.");
    await expect(card).toBeVisible({ timeout: 20_000 });
    const navBox = await boxOf(nav(page), "nav");
    const cardBox = await boxOf(card.locator(".."), "fetch-error card");
    expectClearOfNav(cardBox, navBox.y, "fetch-error card");

    // Its retry control is a real touch target, and also clear of the bar.
    const retry = page.getByRole("button", { name: "Tentar novamente" });
    await expectTouchTarget(retry, "retry");

    // A bounding box only proves the button is drawn somewhere sensible; it says nothing
    // about whether the radius pill (same z-10, later in DOM) is sitting on top of it and
    // eating the tap. click() runs Playwright's actionability check, which hit-tests the
    // click point and fails if another element intercepts — so this is the assertion that
    // keeps the two off each other's baseline.
    await retry.click();
  });

  test("the recenter control sits above the bar", async ({ page }) => {
    await seedAppState(page);
    await stubMapStyle(page);
    await stubNearby(page);
    await page.context().grantPermissions(["geolocation"]);
    await page.context().setGeolocation({
      latitude: DEFAULT_COORDS.lat,
      longitude: DEFAULT_COORDS.lng,
    });
    await page.goto("/");

    const recenter = page.getByRole("button", { name: "Centralizar em minha localização" });
    await expect(recenter).toBeVisible();
    const navBox = await boxOf(nav(page), "nav");
    const recenterBox = await boxOf(recenter, "recenter button");
    expectClearOfNav(recenterBox, navBox.y, "recenter button");
    await expectTouchTarget(recenter, "recenter");
  });
});

test.describe("Place sheet", () => {
  test("covers the tab bar and closes on Escape", async ({ page }) => {
    // Retries clicking a WebGL-rendered marker for up to 20s inside a 30s default. CI has
    // no GPU, so style load is slower there than the ~2s it takes locally.
    test.setTimeout(60_000);
    await seedAppState(page);
    await stubMapStyle(page);
    await stubNearby(page, { results: [discoveryFixture()] });
    await stubPlace(page);
    // Denied geolocation keeps the map centred on DEFAULT_COORDS and suppresses the user
    // pin, so the stubbed discovery's marker is exactly at the canvas centre with nothing
    // on top of it to intercept the click.
    await page.context().clearPermissions();
    await page.goto("/");

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    const canvasBox = await boxOf(canvas, "map canvas");
    const centre = {
      x: canvasBox.x + canvasBox.width / 2,
      y: canvasBox.y + canvasBox.height / 2,
    };
    // The marker is a WebGL-rendered circle layer, added once MapLibre reports its style
    // loaded — there is no DOM signal for that, so retry the click until it lands.
    const sheet = page.getByRole("dialog");
    await expect(async () => {
      if ((await sheet.count()) === 0) await page.mouse.click(centre.x, centre.y);
      await expect(sheet).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
    await expect(sheet).toHaveAttribute("aria-label", /Mercado Central/);

    const navBox = await boxOf(nav(page), "nav");
    const sheetBox = await boxOf(sheet, "place sheet");
    record("sheet z-index", await sheet.evaluate((el) => getComputedStyle(el).zIndex));
    record("nav z-index", await nav(page).evaluate((el) => getComputedStyle(el).zIndex));

    // Occlusion, not just paint order: what the user would actually tap in the middle of
    // the Mapa tab while the sheet is open.
    const navPoint = { x: navBox.width / 8, y: navBox.y + navBox.height / 2 };
    const covered = await hitTest(page, navPoint, "nav[aria-label='Navegação principal']");
    record("hit test over the Mapa tab while the sheet is open", covered);
    expect(covered.insideSelector, "the sheet/backdrop must cover the tab bar").toBe(false);

    // The sheet itself overlaps the bar's band, i.e. the bar is behind it rather than
    // merely being pushed out of the way.
    record("sheet bottom edge", sheetBox.y + sheetBox.height);
    expect(sheetBox.y + sheetBox.height).toBeGreaterThan(navBox.y);

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    const afterClose = await hitTest(page, navPoint, "nav[aria-label='Navegação principal']");
    record("hit test over the Mapa tab after Escape", afterClose);
    expect(afterClose.insideSelector, "the tab bar must be tappable again").toBe(true);
  });
});

test.describe("Collapsed search", () => {
  test("expands, suggests, and collapses again", async ({ page }) => {
    await seedAppState(page);
    await stubMapStyle(page);
    await stubNearby(page);
    await stubProductSearch(page);
    await page.goto("/");

    await expect(magnifier(page)).toBeVisible();
    await expect(page.getByPlaceholder("Buscar produto…")).toHaveCount(0);

    await magnifier(page).click();
    const input = page.getByPlaceholder("Buscar produto…");
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();

    await input.fill("arr");
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible();
    await expect(listbox.getByRole("option")).toHaveCount(SUGGESTIONS.length);
    await expect(listbox.getByRole("option").first()).toHaveText(SUGGESTIONS[0]!.name);

    await listbox.getByRole("option").first().click();
    await expect(input).toHaveValue(SUGGESTIONS[0]!.name);

    await page.getByRole("button", { name: "Fechar busca" }).click();
    await expect(page.getByPlaceholder("Buscar produto…")).toHaveCount(0);
    await expect(magnifier(page)).toBeVisible();
    await expect(magnifier(page)).toBeFocused();
  });

  test("the loading pill never paints over the first suggestion", async ({ page }) => {
    // Holds the nearby request open for 15s inside a 30s default; teardown of the pending
    // route handler eats into that too. Give it room on a shared CI runner.
    test.setTimeout(60_000);
    await seedAppState(page);
    await stubMapStyle(page);
    // Hold the nearby request open so "Buscando…" is on screen at the same time as the
    // dropdown — the exact overlap this asserts against.
    await stubNearby(page, { delayMs: 15_000 });
    await stubProductSearch(page);
    await page.context().grantPermissions(["geolocation"]);
    await page.context().setGeolocation({
      latitude: DEFAULT_COORDS.lat,
      longitude: DEFAULT_COORDS.lng,
    });
    await page.goto("/");

    await magnifier(page).click();
    await page.getByPlaceholder("Buscar produto…").fill("arr");

    const pill = page.getByText("Buscando…");
    await expect(pill).toBeVisible();
    const option = page.getByRole("option").first();
    await expect(option).toBeVisible();

    const pillBox = await boxOf(pill.locator(".."), "loading pill");
    const optionBox = await boxOf(option, "first suggestion");

    const overlap = {
      left: Math.max(pillBox.x, optionBox.x),
      right: Math.min(pillBox.x + pillBox.width, optionBox.x + optionBox.width),
      top: Math.max(pillBox.y, optionBox.y),
      bottom: Math.min(pillBox.y + pillBox.height, optionBox.y + optionBox.height),
    };
    const overlaps = overlap.right > overlap.left && overlap.bottom > overlap.top;
    record("pill/suggestion overlap", { ...overlap, overlaps });

    // The overlap is the premise of this regression test, not an incidental detail: if a
    // layout change ever separates the two, every assertion below would be skipped and
    // the test would pass green while guarding nothing. Fail loudly instead, so whoever
    // moves them has to decide whether the z-order fix is still needed.
    expect(overlaps, "the pill and the first suggestion must still overlap").toBe(true);

    const point = {
      x: (overlap.left + overlap.right) / 2,
      y: (overlap.top + overlap.bottom) / 2,
    };
    const hit = await hitTest(page, point, "[role='listbox']");
    record("hit test inside the overlap", { point, ...hit });
    expect(hit.insideSelector, "the suggestion list must paint above the loading pill").toBe(true);
  });
});

test.describe("Routing and gates", () => {
  test("signed out, /avisos redirects to sign-in while /perfil opens", async ({ page }) => {
    await seedAppState(page);
    await page.goto("/avisos");
    await expect(page).toHaveURL(/\/signin$/);

    await page.goto("/perfil");
    await expect(page).toHaveURL(/\/perfil$/);
    await expect(page.getByRole("heading", { name: "Perfil" })).toBeVisible();

    // The theme switch is Perfil's own control now, not a floating overlay.
    const html = page.locator("html");
    await expect(html).not.toHaveClass(/dark/);
    const themeSwitch = page.getByRole("switch", { name: "Modo escuro" });
    await expectTouchTarget(themeSwitch, "theme switch");
    await expect(themeSwitch).toHaveAttribute("aria-checked", "false");
    await themeSwitch.click();
    await expect(themeSwitch).toHaveAttribute("aria-checked", "true");
    await expect(html).toHaveClass(/dark/);
  });

  test("a device that has not seen onboarding lands on it, once", async ({ page }) => {
    // Deliberately no seedAppState: this is the first-run path.
    await stubMapStyle(page);
    await stubNearby(page);
    await page.goto("/");
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole("heading", { name: "Aonde Tem" })).toBeVisible();
    await expect(nav(page)).toHaveCount(0);

    await page.getByRole("button", { name: "Começar" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Agora não" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(nav(page)).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/\/$/);
    await expect(nav(page)).toBeVisible();
    record(
      "persisted hasSeenOnboarding after the flow",
      await page.evaluate(() => window.localStorage.getItem("aonde-tem")),
    );
  });

  test("the geolocation fallback banner shows above the collapsed magnifier", async ({ page }) => {
    await seedAppState(page);
    await stubMapStyle(page);
    await stubNearby(page);
    await page.context().clearPermissions();
    await page.goto("/");

    const banner = page.getByText("Localização negada — mostrando São Paulo. Pan para sua área.");
    await expect(banner).toBeVisible();
    // Collapsed: the magnifier is on screen and the input does not exist yet.
    await expect(magnifier(page)).toBeVisible();
    await expect(page.getByPlaceholder("Buscar produto…")).toHaveCount(0);

    const bannerBox = await boxOf(banner, "geolocation banner");
    const magnifierBox = await boxOf(magnifier(page), "collapsed magnifier");
    record("banner bottom vs magnifier top", {
      bannerBottom: bannerBox.y + bannerBox.height,
      magnifierTop: magnifierBox.y,
    });
    expect(bannerBox.y + bannerBox.height).toBeLessThanOrEqual(magnifierBox.y);
  });
});

test.describe("Report screen", () => {
  test("its header sits at the same inset as the other screens", async ({ page }) => {
    await seedAppState(page, {
      accessToken: "e2e-token",
      sessionUser: { id: PLACE_ID, email: "teste@exemplo.com", displayName: null, role: "user" },
    });
    await page.goto("/report");
    await expect(page).toHaveURL(/\/report$/);

    const title = page.getByRole("heading", { name: "Relatar produto" });
    await expect(title).toBeVisible();
    const titleBox = await boxOf(title, "report title");
    const root = page.locator("div.min-h-screen").first();
    const rootPadding = await root.evaluate((el) => getComputedStyle(el).paddingTop);
    record("report page root padding-top", rootPadding);
    // The root used to carry --header-clearance (68px) to clear an overlay that no
    // longer renders; the header row pads itself now.
    expect(rootPadding).toBe("0px");

    const reportHeader = page.getByRole("button", { name: "Voltar" }).locator("..");
    const reportHeaderBox = await boxOf(reportHeader, "report header row");
    const reportHeaderPadding = await reportHeader.evaluate(
      (el) => getComputedStyle(el).paddingTop,
    );
    record("report header padding-top", reportHeaderPadding);

    // Probed on /report as well as /perfil: the report screen is the one whose root
    // padding was removed, so it is the one that has to be measured, not just its
    // reference screen.
    const fixedOnReport = await fixedElementsAtTop(page);
    record("fixed elements in the top 120px (/report, online)", fixedOnReport);
    expect(fixedOnReport).toEqual([]);

    await page.goto("/perfil");
    const perfilTitle = page.getByRole("heading", { name: "Perfil" });
    await expect(perfilTitle).toBeVisible();
    const perfilBox = await boxOf(perfilTitle, "perfil title");
    const perfilHeader = page.locator("header");
    const perfilHeaderBox = await boxOf(perfilHeader, "perfil header row");
    const perfilHeaderPadding = await perfilHeader.evaluate(
      (el) => getComputedStyle(el).paddingTop,
    );
    record("perfil header padding-top", perfilHeaderPadding);

    // Same inset from the top of the screen, and the same padding token behind it.
    expect(reportHeaderBox.y).toBe(perfilHeaderBox.y);
    expect(reportHeaderPadding).toBe(perfilHeaderPadding);

    // The report title itself sits a little lower only because its row centres it
    // against a 44px back button; the row's own inset is identical.
    record("report vs perfil title top", { report: titleBox.y, perfil: perfilBox.y });
    expect(Math.abs(titleBox.y - perfilBox.y)).toBeLessThanOrEqual(10);

    // Nothing floating at the top of any screen: no fixed element overlaps the title.
    const fixedAtTop = await fixedElementsAtTop(page);
    record("fixed elements in the top 120px (/perfil, online)", fixedAtTop);
    expect(fixedAtTop).toEqual([]);
  });

  test("offline, the banner does not steal taps at the top of the screen", async ({ page }) => {
    await seedAppState(page, {
      accessToken: "e2e-token",
      sessionUser: { id: PLACE_ID, email: "teste@exemplo.com", displayName: null, role: "user" },
    });
    // Reached through the tab bar, not page.goto(), so "Voltar" has a client-side history
    // entry to pop — no network round trip once the context goes offline.
    await page.goto("/perfil");
    await nav(page).getByRole("link", { name: "Relatar produto" }).click();
    await expect(page).toHaveURL(/\/report$/);

    // The online probe above can never see OfflineBanner: it renders null when the tab is
    // online, which is how a fixed 44px strip over ReportPage's back button got through
    // the first measurement pass.
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));

    const banner = page.getByRole("status").filter({ hasText: "Sem conexão" });
    await expect(banner).toBeVisible();
    const bannerBox = await boxOf(banner, "offline banner");

    const back = page.getByRole("button", { name: "Voltar" });
    const backBox = await boxOf(back, "report back button");
    record("banner vs back button", {
      bannerBottom: bannerBox.y + bannerBox.height,
      backTop: backBox.y,
      overlaps: bannerBox.y + bannerBox.height > backBox.y,
    });

    // Everything fixed over the top of the screen while offline must be untappable.
    const fixedOffline = await fixedElementsAtTop(page);
    record("fixed elements in the top 120px (/report, offline)", fixedOffline);
    expect(fixedOffline.length, "the offline banner should be fixed at the top").toBeGreaterThan(0);
    for (const entry of fixedOffline) {
      expect(entry.pointerEvents, `${entry.tag}[${entry.role}] must not intercept taps`).toBe(
        "none",
      );
    }

    // And the back button is genuinely reachable at its own centre, banner or not.
    const centre = { x: backBox.x + backBox.width / 2, y: backBox.y + backBox.height / 2 };
    const hit = await hitTest(page, centre, "button[aria-label='Voltar']");
    record("hit test at the back button's centre while offline", { centre, ...hit });
    expect(hit.insideSelector, "the back button must receive its own taps while offline").toBe(
      true,
    );
    // click() re-runs the same hit test as an actionability check before dispatching, so
    // a future overlay that does intercept fails here rather than silently in the field.
    await back.click();
    await expect(page).toHaveURL(/\/perfil$/);
  });
});
