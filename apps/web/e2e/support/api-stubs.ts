import type { Page, Route } from "@playwright/test";

// A minimal valid MapLibre style. The real style URL (OpenFreeMap / MapTiler) is an
// external network dependency; stubbing it keeps the map deterministic and offline, which
// matters here because these specs click rendered map features and need the style to have
// actually finished loading.
const BLANK_MAP_STYLE = {
  version: 8,
  name: "e2e-blank",
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#e8e6e1" } }],
};

export const PLACE_ID = "11111111-1111-4111-8111-111111111111";
const DISCOVERY_ID = "22222222-2222-4222-8222-222222222222";
const PRODUCT_ID = "33333333-3333-4333-8333-333333333333";

/** São Paulo centre — matches DEFAULT_COORDS in features/map/model/use-geolocation.ts. */
export const DEFAULT_COORDS = { lat: -23.5505, lng: -46.6333 };

export function discoveryFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: DISCOVERY_ID,
    productId: PRODUCT_ID,
    productName: "Arroz 5kg",
    placeId: PLACE_ID,
    placeName: "Mercado Central",
    priceBrl: 24.9,
    quantity: 3,
    note: null,
    lat: DEFAULT_COORDS.lat,
    lng: DEFAULT_COORDS.lng,
    distanceMeters: 0,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    ageMinutes: 5,
    ...overrides,
  };
}

export function placeFixture() {
  return {
    id: PLACE_ID,
    name: "Mercado Central",
    address: "Rua Teste, 100",
    coords: DEFAULT_COORDS,
    discoveries: [
      {
        id: DISCOVERY_ID,
        productId: PRODUCT_ID,
        productName: "Arroz 5kg",
        priceBrl: 24.9,
        quantity: 3,
        note: null,
        isMine: false,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        ageMinutes: 5,
      },
    ],
  };
}

export const SUGGESTIONS = [
  { id: PRODUCT_ID, name: "Arroz branco 5kg" },
  { id: "44444444-4444-4444-8444-444444444444", name: "Arroz integral 1kg" },
  { id: "55555555-5555-4555-8555-555555555555", name: "Arroz parboilizado 5kg" },
];

async function json(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export async function stubMapStyle(page: Page): Promise<void> {
  await page.route(/openfreemap|maptiler/, (route) => json(route, BLANK_MAP_STYLE));
}

interface NearbyOptions {
  readonly results?: ReturnType<typeof discoveryFixture>[];
  /** Fail the request, so SeekPage renders its fetch-error card instead of the empty state. */
  readonly fail?: boolean;
  /** Hold the response open for this long, to keep the "Buscando…" pill on screen. */
  readonly delayMs?: number;
}

export async function stubNearby(page: Page, options: NearbyOptions = {}): Promise<void> {
  const { results = [], fail = false, delayMs = 0 } = options;
  await page.route("**/api/discoveries/nearby*", async (route) => {
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    if (fail) {
      await json(
        route,
        { error: { code: "internal", message: "Algo deu errado. Tente novamente." } },
        500,
      );
      return;
    }
    await json(route, { results, total: results.length });
  });
}

export async function stubProductSearch(
  page: Page,
  results: { id: string; name: string }[] = SUGGESTIONS,
): Promise<void> {
  await page.route("**/api/products?*", (route) => json(route, { results }));
}

export async function stubPlace(page: Page): Promise<void> {
  await page.route(`**/api/places/${PLACE_ID}`, (route) => json(route, placeFixture()));
}

/**
 * The profile screen fetches the signed-in reporter's own history. Any test that visits
 * /perfil with a seeded session must stub it: the seeded token is not a real JWT, so an
 * unstubbed call reaches the API, comes back 401, and `http` clears the session — which
 * silently bounces the test to /signin several navigations later.
 */
export async function stubMyDiscoveries(
  page: Page,
  options: { results?: unknown[]; total?: number; active?: number } = {},
): Promise<void> {
  await page.route("**/api/discoveries/mine", (route) =>
    json(route, {
      results: options.results ?? [],
      stats: {
        total: options.total ?? 0,
        active: options.active ?? 0,
        memberSince: "2026-06-14T09:30:00.000Z",
      },
    }),
  );
}
