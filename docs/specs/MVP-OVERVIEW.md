# Aonde Tem — MVP Overview

> Status: **Draft for review** · 2026-06-27 · The umbrella spec for the first shippable app.
> Cross-cutting context (goals, personas, **shared data model**, phasing) lives here **once**;
> each feature is specced in its own file (see §8). Derives from
> [`../PRODUCT.en.md`](../PRODUCT.en.md), [`../ROADMAP.md`](../ROADMAP.md),
> [`../ARCHITECTURE.md`](../ARCHITECTURE.md), [`../PERFORMANCE.md`](../PERFORMANCE.md).

---

## 1. Problem statement

People in Brazil can't easily find **where a specific item is available right now and for how much** —
that knowledge lives in people's heads and scattered chats. The MVP must let anyone **search an item
and see it on a map near them**, and let logged-in users **contribute** sightings, product info, and
moderation signals — while keeping illegal/inappropriate items out cheaply.

## 2. Goals

- **G1 — Core loop works:** a visitor can search an item and see fresh, nearby availability on a map without logging in.
- **G2 — Trusted contribution:** logged-in users can add a sighting (product @ place, price, qty) in under ~30s, and it appears on the map.
- **G3 — Safe by default:** banned items are blocked at creation; users can flag (denunciar) anything; an admin can remove it. No illegal item stays visible > 24h after a valid flag.
- **G4 — Low-friction auth:** sign in with Google **or** a magic email code in under 1 minute, no password.
- **G5 — Fast on weak phones/networks:** usable on a low-end Android over slow 4G — first useful result ≤ 3s, Lighthouse mobile ≥ 90 (see [`../PERFORMANCE.md`](../PERFORMANCE.md)).

## 3. Non-goals (v1)

- ❌ **No payments / marketplace / orders.** *(Not the core value.)*
- ❌ **No turn-by-turn navigation.** Hand off to the user's maps app. *(Maps do this well.)*
- ❌ **No store inventory integrations.** Community data only. *(No supply; premature.)*
- ❌ **No reputation/trust scores, no price history.** *(Design for later.)*
- ❌ **No rich admin dashboard.** Minimal queue / direct DB for v1. *(Build tooling once there's volume.)*
- ❌ **No nationwide push.** One pilot city first. *(Liquidity beats breadth.)*

## 4. Personas

- **Visitor (não logado):** searches and views availability. No account.
- **Contributor (logado):** reports sightings, adds product info, comments, flags. Auth via Google or magic code.
- **Admin:** reviews flags, removes content, manages the blocklist. (Internal, minimal UI for v1.)

---

## 5. Shared data model

The scaffold's generic `Place` evolves into an explicit model. These entities are referenced by every
feature spec — **defined here once.**

### User
| Field | Notes |
|---|---|
| id | uuid |
| email | unique; identity anchor (Google & magic-link key off it) |
| displayName | optional |
| role | `user` \| `admin` |
| createdAt | |

### Product *(free text + moderated)*
| Field | Notes |
|---|---|
| id | uuid |
| name | free-text, as typed |
| normalizedKey | lowercased/stripped/deburred name for **dedup** |
| status | `active` \| `under_review` \| `blocked` |
| description | optional, user-contributed |
| imageUrl | optional |
| createdBy | User |
| createdAt | |

### Place
| Field | Notes |
|---|---|
| id | uuid |
| name | user-typed |
| location | PostGIS `geography(Point,4326)` (pin or GPS) |
| address | optional, reverse-geocoded later |
| createdBy | User |
| createdAt | |

### Sighting *(the availability report — was "Report")*
| Field | Notes |
|---|---|
| id | uuid |
| productId → Product · placeId → Place | the join |
| price | decimal (BRL) |
| quantity | int |
| reporterId → User | |
| note | optional |
| createdAt | drives **freshness** |
| expiresAt | freshness TTL |

> A Sighting answers *"this Product is at this Place for R$X, qty Y, as of time T."*

### Flag *(denúncia)*
| Field | Notes |
|---|---|
| id | uuid · targetType `product`\|`sighting` · targetId | |
| reason | `illegal`\|`inappropriate`\|`spam`\|`wrong_info`\|`other` |
| comment | optional · reporterId → User |
| status | `open`\|`actioned`\|`dismissed` · createdAt |

### Comment *(feedback)*
| Field | Notes |
|---|---|
| id · targetType `product`\|`sighting` · targetId | |
| body | text · authorId → User · createdAt |

### BlockedTerm *(admin blocklist)*
| Field | Notes |
|---|---|
| id · pattern | banned term/regex |
| action | `block` (reject) \| `review` (hold) · createdAt |

**More entities?** Not for v1. Deferred (design-for, don't build): `Category`, `ReputationScore`,
`PriceHistory`, `Watchlist`, `Session` table (use stateless JWT).

---

## 6. Success metrics

**Leading (days–weeks):** % of searches returning ≥1 fresh sighting (**liquidity — primary**);
sightings/day; contributor activation; auth completion rate & time; time-to-first-useful-result.
**Lagging (weeks–months):** 7/30-day retention; active contributors per city; flag resolution time;
duplicate-product rate. *Targets set per pilot city, reviewed monthly.*

## 7. Cross-cutting open questions

| # | Question | Owner | Blocking? |
|---|---|---|---|
| Q1 | **Confirm: login required to contribute?** Supersedes product-doc decision D2 (anonymous reporting). Recommended for accountability/moderation. | Founder/Product | **Yes** |
| Q3 | Initial **blocklist** contents & who curates it. | Founder/Legal | Yes |
| Q5 | Pilot **city** + how we seed first sightings (cold-start). | Founder | Yes |
| Q7 | **LGPD:** minimal privacy notice & handling for email + location. | Legal/Eng | Yes |

> Feature-specific open questions live in their own specs (e.g., email provider → auth; freshness TTL → report).

**Data-quality is a usability pillar.** Preventable issues — messy item names, bad prices, honest mistakes — are designed out via autocomplete/dedup, price validation, confirmation steps, place reuse, and fuzzy search. See [`../RISKS.md`](../RISKS.md) §1 (tracked as the backlog *Data-quality & UX safeguards* cluster).

---

## 8. Feature specs (build order)

Each is small and independently buildable; they map 1:1 to backlog epics.

| # | Spec | What it covers | Backlog |
|---|---|---|---|
| 1 | [`seek-map-search.spec.md`](./seek-map-search.spec.md) | Open initial page: map + search → nearby sightings | E3, E4 |
| 2 | [`product-moderation.spec.md`](./product-moderation.spec.md) | Free-text Product + blocklist + dedup + product view | E1, E2, E10 |
| 3 | [`report-sighting.spec.md`](./report-sighting.spec.md) | Contribute a sighting: product + place(pin/GPS) + price/qty | E1–E4, E10 |
| 4 | [`auth.spec.md`](./auth.spec.md) | Magic-code + Google login, sessions, login-gating | E5/E10 |
| 5 | [`feedback-flags.spec.md`](./feedback-flags.spec.md) | Flags (denúncia) + comments + minimal admin removal | E6, E10 |

### Phasing
- **Read first (prove the loop):** seek-map-search over seeded data → then product + report so real data flows in.
- **Then trust the contributions:** auth (gate contribution) → flags/moderation.
- **Fast follows (P1):** Google login, comments, product photos, radius/clustering, reverse-geocode.

### Irreducible MVP
*Open map + item search showing nearby sightings* **+** *magic-code login* **+** *report a sighting
(product+place+price+qty) with blocklist* **+** *flag → admin hide*. Everything else is deferrable
without breaking the core loop.

### New backlog epic
This MVP introduces **E10 — Accounts, Products & Moderation** (User+auth, Product+blocklist, Flag,
Comment, admin queue). Can be folded into [`../backlog/BACKLOG.en.md`](../backlog/BACKLOG.en.md) on request.
