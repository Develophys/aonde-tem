# Aonde Tem — Performance

> **Performance is a product pillar, not an afterthought.** Our users are everyday Brazilians on
> **low-end Android phones** over **slow, intermittent connections**. If the app is heavy or slow, it
> simply doesn't get used. Every feature is built and reviewed against the budgets below.

Canonical reference. Linked from `CLAUDE.md`, `.github/copilot-instructions.md`, `PRODUCT.md`,
`ARCHITECTURE.md`, and the MVP spec. When a change risks a budget, that's a blocker, not a nit.

---

## 1. Target baseline (design for the worst, not the best)

- **Device:** low-end Android (≈ Moto G / Snapdragon 4xx class, 2–3 GB RAM). Test with **4× CPU throttling**.
- **Network:** **slow 4G and 3G**, high latency, frequent drops. Assume **Save-Data** may be on.
- **Reality:** prepaid data plans — bytes cost the user money. Treat every KB as a cost.

If it's fast on a Moto G on 3G, it's fast for everyone.

## 2. Performance budgets (enforced)

| Metric | Budget | Stretch |
|---|---|---|
| **Initial route JS** (gzip, excl. lazy map) | ≤ 150 KB | ≤ 120 KB |
| **Initial critical transfer** (HTML+CSS+JS) | ≤ 250 KB gzip | ≤ 200 KB |
| **LCP** (slow 4G, mid-tier mobile) | ≤ 2.5 s | ≤ 2.0 s |
| **INP** (interaction latency) | ≤ 200 ms | ≤ 150 ms |
| **CLS** (layout shift) | ≤ 0.1 | ≤ 0.05 |
| **Lighthouse mobile Performance** | ≥ 90 | ≥ 95 |
| **Time to first useful result** (search → markers) | ≤ 3 s on slow 4G | ≤ 2 s |
| **API `nearby` payload** (50 results) | ≤ 50 KB | ≤ 30 KB |
| **API `nearby` server time** (p95) | ≤ 300 ms | ≤ 150 ms |

> The **map library is lazy-loaded** and explicitly **not** counted in the initial JS budget — but it must
> never block first paint or search.

## 3. Frontend practices

### Loading & bundle
- **Code-split by route**; lazy-load heavy, non-critical UI. `React.lazy` + `Suspense`.
- **Lazy-load MapLibre** (it's the heaviest dependency). Render a lightweight skeleton first; import the map module on demand. The map must never be in the critical path of first paint.
- **Audit the bundle** (`rollup-plugin-visualizer`) every PR that adds deps. Prefer small libraries; question every dependency. Tree-shake; avoid moment/lodash-style full imports.
- **No render-blocking** third-party scripts. Defer analytics; load it after interactive.

### Network & data
- **Small payloads:** return only fields the UI needs; compute distance server-side; cap results (`LIMIT 50`) and paginate.
- **Brotli/gzip** compression on all responses.
- **TanStack Query** for caching, dedupe, and `staleTime` — don't refetch what's fresh. Debounce search input (~300 ms).
- **Respect the network:** read `navigator.connection` (`effectiveType`, `saveData`). On `2g`/`slow-2g`/Save-Data: fewer map tiles, skip non-essential images, smaller page sizes.
- **Avoid waterfalls:** parallelize independent requests; no request that waits on another it doesn't need.

### Rendering
- **Minimize re-renders:** narrow Zustand selectors + `useShallow`; memoize expensive components/lists; virtualize long lists.
- **Cap DOM markers:** cluster map markers; never render hundreds of DOM nodes — use the map's GL layer for large sets.
- **Optimistic & skeleton UI** for perceived speed; never block the whole screen on one request.

### Assets
- **Images:** responsive sizes, lazy-load (`loading="lazy"`), modern formats (WebP/AVIF), tiny thumbnails on lists. **Compress product photos client-side before upload** and cap dimensions/size. Serve via CDN (e.g., Cloudflare R2).
- **Fonts:** prefer a **system font stack** (zero download) or one self-hosted, subset font with `font-display: swap`. Never let fonts cause layout shift.
- **CSS:** Tailwind v4 keeps CSS tiny via automatic content detection — don't add large CSS frameworks on top.

### PWA / offline
- **Service worker** caches the app shell (precache) and uses **stale-while-revalidate** for read APIs and **cache-first** for map tiles — so repeat visits are instant and use fewer bytes.
- **Offline tolerance:** show last-known data with a "sem conexão" indicator rather than a blank error.

## 4. Backend practices

- **Fast geo queries:** PostGIS `geography` + **GiST index**; `ST_DWithin` + `ORDER BY <->` + `LIMIT`. One query, no N+1 — join product & place in the same statement.
- **Lean responses:** select only needed columns; precompute distance; no over-fetching.
- **HTTP caching:** `Cache-Control` (short TTL) + `ETag` on read endpoints; let the SW and CDN reuse responses.
- **Compression** (brotli/gzip) at the API/proxy layer.
- **Connection pooling** (Prisma); indexes on `Product.normalizedKey` and search paths.
- **Host in a Brazil region** (e.g., São Paulo) to cut latency — factor this into the hosting spike (AT-110). Put static assets and tiles behind a CDN.
- **Pagination everywhere** lists can grow.

## 5. Measurement & CI gates (make it stick)

- **Lighthouse CI** on the mobile preset with the §2 budgets → **fails the build** if Performance < 90 or budgets are exceeded.
- **Bundle-size budget** check in CI (e.g., `size-limit`) on the initial route JS.
- **Web Vitals in production:** ship the `web-vitals` lib; send LCP/INP/CLS to analytics (PostHog free tier) to watch **real-device** field data, not just lab.
- **Test throttled:** Lighthouse mobile = 4× CPU + slow 4G. Periodically test on a **real low-end Android**.
- Add a perf check to the PR checklist and the Definition of Done.

## 6. Anti-patterns (reject in review)

- Importing the map (or any heavy lib) eagerly into the initial bundle.
- Shipping full-size images or uncompressed user uploads.
- Unbounded lists / hundreds of DOM markers.
- Fetching more data than the screen shows; chatty request waterfalls.
- Adding a big dependency for a small job.
- Blocking first paint on fonts, analytics, or the map.
- Storing large server datasets in Zustand (it's not a cache — TanStack Query is).

---

### TL;DR for every PR
> Would this still feel fast on a **Moto G over 3G** with **Save-Data on**? If not, fix it before merging.
