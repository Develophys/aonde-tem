# Aonde Tem — MVP Spec (v1)

> Status: **Draft for review** · 2026-06-27 · Author: PM (write-spec)
> Derives from [`docs/PRODUCT.en.md`](../PRODUCT.en.md), [`ROADMAP.md`](../../ROADMAP.md),
> [`ARCHITECTURE.md`](../../ARCHITECTURE.md). Scopes the **first shippable app**.
> A Portuguese version can follow once this is approved.

---

## 1. Problem statement

People in Brazil can't easily find **where a specific item is available right now and for how much** —
that knowledge lives in people's heads and scattered chats. The MVP must let anyone **search an item
and see it on a map near them**, and let logged-in users **contribute** sightings, product info, and
moderation signals — while keeping illegal/inappropriate items out cheaply.

## 2. Goals

- **G1 — Core loop works:** a visitor can search an item and see fresh, nearby availability on a map without logging in.
- **G2 — Trusted contribution:** logged-in users can add a sighting (product @ place, price, qty) in under ~30s, and the item appears on the map.
- **G3 — Safe by default:** banned items are blocked at creation; users can flag (denunciar) anything; an admin can remove it. No illegal item stays visible > 24h after a valid flag.
- **G4 — Low-friction auth:** a new user can sign in with Google **or** a magic email code in under 1 minute, no password.

## 3. Non-goals (v1)

- ❌ **No payments / marketplace / orders.** We point to where items are; we don't transact. *(Not the core value.)*
- ❌ **No turn-by-turn navigation.** Hand off to the user's maps app. *(Maps do this well.)*
- ❌ **No store inventory integrations.** Community data only. *(No supply; premature.)*
- ❌ **No reputation/trust scores, no price history.** *(Design for later; not needed to prove the loop.)*
- ❌ **No rich admin dashboard.** Moderation can be a minimal queue / direct DB for v1. *(Build tooling once there's volume.)*
- ❌ **No nationwide push.** One pilot city/region first. *(Liquidity beats breadth.)*

## 4. Personas

- **Visitor (não logado):** searches and views availability. No account.
- **Contributor (logado):** reports sightings, adds product info, comments, flags. Auth via Google or magic code.
- **Admin:** reviews flags, removes content, manages the blocklist. (Internal, minimal UI for v1.)

---

## 5. Entity / data model

The scaffold's generic `Place` evolves into an explicit model. **Core entities for the MVP:**

### User
| Field | Notes |
|---|---|
| id | uuid |
| email | unique; the identity anchor (Google & magic-link both key off it) |
| displayName | optional |
| role | `user` \| `admin` (admin enables moderation) |
| createdAt | |

> Auth identities link to a User by email (Google `sub` or verified magic-code email).

### Product  *(free text + moderated)*
| Field | Notes |
|---|---|
| id | uuid |
| name | free-text, as typed by the user |
| normalizedKey | lowercased/stripped/deburred name for **dedup** (so "Arroz 5kg" ≈ "arroz 5 kg") |
| status | `active` \| `under_review` \| `blocked` |
| description | optional, user-contributed product info |
| imageUrl | optional |
| createdBy | User (or null pre-account if we allow it) |
| createdAt | |

> Creation runs the **blocklist check** (§7). A near-match to an existing `normalizedKey` reuses that Product instead of creating a duplicate.

### Place
| Field | Notes |
|---|---|
| id | uuid |
| name | user-typed (e.g., "Mercado do Zé") |
| location | PostGIS `geography(Point,4326)` — from pin or GPS |
| address | optional, reverse-geocoded later |
| createdBy | User |
| createdAt | |

### Sighting  *(the availability report — was "Report")*
| Field | Notes |
|---|---|
| id | uuid |
| productId | → Product |
| placeId | → Place |
| price | decimal (BRL) |
| quantity | int / availability |
| reporterId | → User |
| note | optional |
| createdAt | drives **freshness** |
| expiresAt | freshness TTL (configurable per category) |

> A Sighting is the join that answers *"this Product is at this Place for R$X, qty Y, as of time T."*

### Flag  *(denúncia / abuse report)*
| Field | Notes |
|---|---|
| id | uuid |
| targetType | `product` \| `sighting` |
| targetId | id of the flagged entity |
| reason | enum: `illegal`, `inappropriate`, `spam`, `wrong_info`, `other` |
| comment | optional free text |
| reporterId | → User |
| status | `open` \| `actioned` \| `dismissed` |
| createdAt | |

### Comment  *(feedback)*
| Field | Notes |
|---|---|
| id | uuid |
| targetType | `product` \| `sighting` |
| targetId | |
| body | text |
| authorId | → User |
| createdAt | |

### BlockedTerm  *(admin blocklist)*
| Field | Notes |
|---|---|
| id | uuid |
| pattern | term/regex for banned items (drugs, weapons, etc.) |
| action | `block` (reject) \| `review` (hold) |
| createdAt | |

**Do we need more entities?** For v1, no. Deliberately deferred (design-for, don't build): `Category`,
`ReputationScore`, `PriceHistory`, `Watchlist`, `Session` table (use stateless JWT instead).

---

## 6. User stories

**Visitor (no login)**
- As a visitor, I want to search for an item and see nearby sightings on a map so I can find it without an account.
- As a visitor, I want to tap a marker and see the product, price, quantity, and how fresh the info is so I can decide if it's worth going.
- As a visitor, I want to be prompted to sign in only when I try to contribute, so browsing stays frictionless.

**Contributor (login)**
- As a contributor, I want to sign in with Google or a magic email code so I don't manage a password.
- As a contributor, I want to report a sighting (pick/type a product, drop a pin or use GPS, set price & quantity) so others can find it.
- As a contributor, I want to add information to a product (description, photo) so the listing is more useful.
- As a contributor, I want to comment on a product or a sighting so I can give feedback (e.g., "already gone").
- As a contributor, I want to flag (denunciar) a product or sighting as illegal/inappropriate so bad content gets removed.

**Admin**
- As an admin, I want new products checked against a blocklist so banned items never go live.
- As an admin, I want a list of open flags so I can review and remove offending content.

**Edge/empty/error**
- As a visitor with no results, I see a clear empty state ("ninguém relatou isso por aqui ainda — seja o primeiro").
- As a contributor entering a banned product, I see a clear rejection explaining why.
- As a user who denies location, I can still search by typing/moving the map.

---

## 7. Requirements

### A. Auth (login)
**P0**
- Passwordless **magic code**: enter email → receive a 6-digit code (10-min TTL) → enter code → signed in. Creates/links a User by email.
  - *Given* I enter a valid email, *when* I submit, *then* I receive a code and, on entering it correctly, I'm logged in; an expired/wrong code shows a clear error and never logs me in.
- **Session**: stateless JWT (short-lived) returned to the app; kept in memory (Zustand), sent as `Authorization: Bearer`.
- **Open browsing**: all read/search works with no auth; contribute actions require a valid session (else prompt to sign in).

**P0 (recommended) / can fast-follow to P1**
- **Google login** (OAuth2): sign in with Google, link/create User by verified email.
  > *Scope note:* magic-code is the critical path (no OAuth app review). If Google setup risks the timeline, ship magic-code first and Google as the immediate fast-follow.

**P1** — refresh tokens / "remember me"; account screen; sign-out everywhere.

### B. Initial page (map + search)
**P0**
- Map centered on the user's location (geolocation; graceful denial → manual pan/search).
- A **search input** for an item; results = sightings of matching products rendered as **markers**.
- Tapping a marker opens a card: product name, price, quantity, freshness (age), place name.
  - *Given* I search "arroz" with location on, *when* results exist within range, *then* matching sightings appear as markers and the list updates; with none, I see the empty state.

**P1** — radius control, recenter/follow, marker clustering, list/map toggle.

### C. Product (free text + moderation)
**P0**
- Create a product by **free text**; on submit it's **checked against the blocklist** (§E): `block` → rejected with reason; `review` → created as `under_review` (not shown publicly) ; otherwise `active`.
- **Dedup**: normalize the name; if it matches an existing product, reuse it instead of duplicating.
- Minimal **product view**: name + its active sightings (where/price/qty/freshness).

**P1** — add/edit product **info** (description, photo); product page with comments.
**P2** — categories, attributes, canonical/merge tooling.

### D. Place
**P0**
- Create a place via **pin or current GPS** + typed name; stored as a PostGIS point.
- A sighting references a place (reuse a nearby existing place or create new).

**P1** — reverse-geocode to fill address; "places near me" reuse suggestions.

### E. Moderation, flags & feedback
**P0**
- **Blocklist** (`BlockedTerm`) enforced at product creation (block/review actions).
- **Flag (denúncia)** a product or a sighting with a reason; requires login.
- **Admin removal**: an admin can set a product/sighting hidden/removed and resolve flags. (Minimal UI or admin-only endpoint acceptable for v1.)
  - *Given* a product receives a valid `illegal` flag, *when* an admin actions it, *then* the product and its sightings are hidden from all read endpoints.

**P1** — **Comments** on products and sightings; flag thresholds (auto-hide after N flags pending review); notify reporter.
**P2** — reputation, rate-limit by trust, audit log.

### F. Add information about a product
**P1** (depends on C/A)
- A logged-in user can add a description and/or photo to a product.
  - *Given* I'm logged in on a product page, *when* I submit a description/photo, *then* it's saved and shown (subject to the same blocklist/flag rules).

---

## 8. Success metrics

**Leading (days–weeks)**
- % of searches returning ≥1 fresh sighting (**liquidity** — primary).
- Sightings created/day; contributor activation (% of new sign-ins who post within first session).
- Auth completion rate (started → signed in) for each method; median auth time.
- Time-to-first-useful-result.

**Lagging (weeks–months)**
- 7/30-day retention; active contributor base per city.
- Flag resolution time; share of content removed vs total (content health).
- Duplicate-product rate (dedup quality).

> Targets per pilot city, reviewed monthly. **Liquidity is the make-or-break metric.**

---

## 9. Open questions

| # | Question | Owner | Blocking? |
|---|---|---|---|
| Q1 | **Confirm: login required to contribute?** This supersedes product-doc decision D2 (anonymous reporting). Recommended for accountability/moderation; magic-link keeps friction low. | Founder/Product | **Yes** |
| Q2 | Transactional **email provider** for magic codes — which free tier (e.g. Resend ~3k/mo)? Adds a (small) dependency/cost. | Eng | Yes |
| Q3 | Initial **blocklist contents** — who curates the banned-terms list, and in which categories (drugs, weapons, etc.)? | Founder/Legal | Yes |
| Q4 | **Freshness TTL** default(s) — how long until a sighting expires? | Product/Data | No |
| Q5 | Pilot **city** and how we seed the first sightings (cold-start). | Founder | Yes |
| Q6 | Where are **product photos** stored on a budget (e.g., Cloudflare R2 free tier)? | Eng | No (P1) |
| Q7 | LGPD: storing email + location — minimal privacy notice & data handling for v1. | Legal/Eng | Yes |

---

## 10. Phasing & build order

**MVP slice (P0 only) — ship this first:**
1. Data model: `User`, `Product`(+blocklist), `Place`, `Sighting`, `Flag` + migrations (PostGIS).
2. Auth: magic-code end-to-end (email provider) → JWT session. *(Google = fast follow.)*
3. API: create product (with blocklist), create place, create sighting, `GET /sightings/nearby?item=`, flag, admin-hide.
4. Web: initial map+search page (open), sign-in screen, report-sighting flow (pin/GPS), flag action.
5. Minimal admin: list open flags + hide endpoint.

**Fast follow (P1):** Google login, product info/photos, comments, radius/clustering, reverse-geocode, flag thresholds.

### New backlog items this spec introduces
> Proposed additions to [`BACKLOG.en.md`](../backlog/BACKLOG.en.md) (new epic **E10 — Accounts, Products & Moderation**, plus extends E1–E4). I can fold these in on request.

- `User` entity + magic-code auth (email→code→JWT) — **P0, L**
- Email provider integration (transactional) — **P0, S** *(Q2)*
- Google OAuth login — **P0/P1, M**
- `Product` entity + free-text create + **blocklist** check + dedup (normalizedKey) — **P0, M**
- `Place` create via pin/GPS — **P0, S** *(extends existing AT-014)*
- `Sighting` links Product+Place (evolve `Report`) — **P0, M**
- `Flag` (denúncia) on product/sighting + admin hide — **P0, M**
- Initial map+search page (open browsing) — **P0, L** *(extends AT-053)*
- Report-sighting flow UI (pick product, pin place, price/qty) — **P0, L** *(extends AT-054)*
- Comments on product/sighting — **P1, M**
- Add product info (description/photo) — **P1, M**
- Minimal admin flag queue — **P0, S**

---

### Scope discipline
If everything above can't fit the first cut, the **irreducible MVP** is: *open map + item search showing
nearby sightings* (read) **+** *magic-code login* **+** *report a sighting (product+place+price+qty) with
blocklist enforcement* **+** *flag → admin hide*. Google login, comments, product photos, and clustering
are all explicitly deferrable without breaking the core loop.
