# Aonde Tem — Risk Register

> Living list of risks, gaps, and improvements to track. Companion to the product docs and specs.
> 🇧🇷 Versão em português: [`RISKS.pt.md`](./RISKS.pt.md).
> **Status legend:** `prevent-now` (close in MVP) · `mitigating` (specced/tracked) · `accepted` (known, carried as an open bet) · `watch` (monitor post-launch).

We deliberately launch with some **unanswered** strategic bets (cold-start, incentives). But anything
that's a **preventable usability or data-quality problem** — messy item names, bad prices, honest
mistakes — we close as much as possible *now*, because it directly decides whether the app is useful.

---

## 1. Data quality & usability — **prevent now** (highest priority)

These are the "make it actually useful and user-friendly" risks. Each is being designed into the specs.

| # | Risk / gap | Impact | Mitigation (preventive) | Tracked in |
|---|---|---|---|---|
| R-01 | **Messy item names** — "coca 2l" vs "Coca-Cola 2L" vs "refri" create duplicate products and make search miss real data. | High — kills perceived liquidity | **Autocomplete from existing products** on report & search (pick, don't retype); aggressive normalization (lowercase, strip accents/punct, collapse units); **fuzzy match** (`pg_trgm`). "Did you mean…". | `product-moderation.spec`, `seek-map-search.spec` |
| R-02 | **Wrong / absurd prices** — typos ("R$0,01"), wrong unit, trolls. | High — erodes trust instantly | **Validated numeric input** (BRL mask, min/max sane bounds, > 0); **outlier soft-warning** vs recent discoveries of same product; label clearly as "preço relatado". | `report-discovery.spec` |
| R-03 | **Honest mistakes / wrong info** — fat-finger qty, wrong place, posted then noticed. | High | **Confirmation/summary step** before submit; **edit/delete your own recent discovery**; community **"ainda tem? / acabou?"** self-correction; freshness/expiry. | `report-discovery.spec`, `feedback-flags.spec` |
| R-04 | **Place fragmentation** — same shop pinned twice 20 m apart → splits data. | Medium-High | **Suggest & reuse nearby existing places** (within N m) before creating new; confirm pin/GPS accuracy. | `report-discovery.spec` |
| R-05 | **Search doesn't find existing data** — exact-match only. | High — looks empty when it isn't | Fuzzy/trigram search + synonyms; "did you mean"; suggest reporting when truly empty. | `seek-map-search.spec` |
| R-06 | **Contribution lost on bad signal** — user in a store with no bars. | Medium-High (core audience!) | **Offline write-queue**: draft a report offline, sync on reconnect. | `report-discovery.spec`, `PERFORMANCE.md` |
| R-07 | **Quantity precision is fake** — users guess exact counts. | Medium | Offer a **qualitative availability** option (muito / pouco / acabando) alongside/instead of an exact number. | `report-discovery.spec` |

## 2. Marketplace & liquidity — **accepted bets** (carry, monitor, plan separately)

| # | Risk | Impact | Stance / next step | Status |
|---|---|---|---|---|
| R-10 | **Cold-start** — seekers get no value until there are enough discoveries. | Existential | Needs a **seeding/go-to-market strategy** (not a feature): one neighborhood, manual seeding, import from encartes/open data. Cheapest test: run the loop in one WhatsApp group for 2 weeks before building more. | `accepted` |
| R-11 | **Supply-side motivation** — why would anyone report (unpaid labor)? | Existential | Design the **contributor JTBD / incentive** (recognition "você ajudou N pessoas", reputation, streaks, 1-tap friction). | `accepted` |
| R-12 | **Retention** — no reason to come back between needs. | High | Re-evaluate **notifications/watchlist** ("avise quando X aparecer") as a core hook, not P2. | `watch` |

## 3. Trust & abuse

| # | Risk | Impact | Mitigation | Status |
|---|---|---|---|---|
| R-20 | **Price/availability manipulation** — store fakes low prices or rival "sold out". | High | Rate-limit per user/IP; price outlier checks (R-02); reputation later; flags. | `mitigating` |
| R-21 | **Flag (denúncia) abuse** — weaponized flagging. | Medium | Admin review before removal; thresholds tuned; track flagger accuracy later. | `mitigating` |
| R-22 | **Moderation operational load** — 24h removal SLA needs a human. | Medium-High | Define who is admin; auto-hide on threshold; keep blocklist strong to reduce inflow. | `watch` |

## 4. Safety & legal

| # | Risk | Impact | Mitigation | Status |
|---|---|---|---|---|
| R-30 | **PII in photos** — faces, plates, home interiors. | High | Strip EXIF/GPS; (later) blur/detect; report-photo flow guidance; allow flagging photos. | `mitigating` |
| R-31 | **Liability of user-attributed prices** — a store disputes a wrong price. | Medium | Frame as "preço relatado por usuário" + timestamp; **ToS / disclaimer**; easy correction (R-03). | `open` |
| R-32 | **LGPD** — email + precise location handling. | High | Minimal privacy notice; store only what's needed; consent for location; data-deletion path. | `open` |

## 5. Operational & measurement

| # | Risk | Impact | Mitigation | Status |
|---|---|---|---|---|
| R-40 | **Flying blind** — can't tell if MVP works without measuring liquidity. | High | **Instrument from day one**: log every search + whether it returned a fresh result; core funnel events. Move analytics earlier than P2. | `prevent-now` |
| R-41 | **No spam/rate controls at launch** — abuse floods data. | Medium | Basic rate limiting + input hardening on write endpoints. | `mitigating` |

---

## How we use this

- **prevent-now / data-quality** items are reflected as **requirements** in the feature specs and as **backlog items** (Data-quality & UX safeguards cluster).
- **accepted** bets are tracked here and revisited; they don't block the build but shape strategy.
- Review this register at each phase boundary; promote/demote risks as we learn. IDs are stable.
