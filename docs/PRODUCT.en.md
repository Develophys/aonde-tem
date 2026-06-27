# Aonde Tem — Product Document

> Status: **Draft v0.1** · Owner: Mauricio · Last updated: 2026-06-27
> This document explains *what we are building and why*. It is the source of truth that the
> [roadmap epics](../ROADMAP.md) are derived from. The section structure is reusable as a
> **template** for future product docs. A Portuguese version lives in [`PRODUTO.pt.md`](./PRODUTO.pt.md).

---

## 1. The main idea (one-liner)

**Aonde Tem is a community-powered, real-time map that helps people in Brazil find where a specific item is available nearby — and how much it costs.**

Instead of searching for *businesses*, people search for *things*. Anyone can post a sighting —
**what** the item is, **where** it is, **how much** it costs, and **how many** are available — and
everyone nearby sees it live on the map. Think **"Waze for product availability and prices."**

> **Elevator pitch:** "You need something *right now* and don't want to drive around guessing.
> Open Aonde Tem, search for the item, and see where people just found it near you — with the price
> and how much is left. Found it yourself? Drop a pin so the next person doesn't waste the trip."

---

## 2. Problem statement

Finding *where a specific item is available right now* is still painfully manual. Maps and search
engines tell you which businesses *exist*, not what they actually *have in stock today* or *at what
price*. So people call around, drive store to store, or ask in group chats — wasting time, fuel, and
money, especially for items that are in short supply, on promotion, or sold in informal/local spots.

The knowledge of "where to find X cheaply right now" already exists — it's just trapped in people's
heads and scattered WhatsApp groups. **No one has turned that local, real-time knowledge into a
shared, searchable map.**

---

## 3. Target users & personas

**Primary market:** general consumers in Brazil. Portuguese-first. Mobile-first (installable PWA).
Launch focused on **one city/region first** to build report density before expanding.

| Persona | Who they are | What they want |
|---|---|---|
| **The Seeker** (*Buscador*) | Someone who needs a specific item now and wants to avoid wasted trips | See where the item is available nearby, the price, and how fresh the info is — before leaving home |
| **The Reporter** (*Relator*) | Someone who just saw an item (in a store, market, stall) | Share it in seconds — item, location, price, quantity — and help the community |
| **The Local Regular** (future) | A power user who reports often and builds reputation | Recognition / trust; maybe perks later |
| **The Local Business** (future) | A shop owner who wants demand for their stock | Claim/confirm listings, signal availability and price |

Most early users will be **both** Seekers and Reporters — that two-way behavior is the heart of the product.

---

## 4. Value proposition & differentiation

**Why this beats just using Google Maps:** Google Maps answers *"what businesses are near me?"*
Aonde Tem answers *"where is **this item** available near me right now, and for how much?"* — a
question no business directory can answer because the data only exists in the community, in real time.

Our edge:

- **Real-time availability**, not static listings — reports are timestamped and age out.
- **Item-first search**, not business-first — you search for the thing, not the store.
- **Price transparency** — every report carries a price, so you can find the *cheapest* nearby.
- **Hyperlocal & community-curated** — the people reporting are the people who were just there.

---

## 5. How it works (the core concept)

The atomic unit of the product is a **Report** — a single community sighting of an item:

| Field | Meaning | Required? |
|---|---|---|
| **What** | The item (name / category) | Yes |
| **Where** | Location (map pin or current GPS) | Yes |
| **How much** | Price | Yes |
| **How many** | Quantity / availability | Yes |
| Photo / note | Optional context | No |
| Timestamp | When it was reported (drives freshness) | Auto |
| Reporter | Who posted it (anonymous or account) | Auto |

**The loop:**
1. A Reporter spots an item and posts a Report in seconds.
2. The Report appears on the live map for nearby Seekers.
3. A Seeker searches an item → sees fresh nearby Reports with price & quantity.
4. The community keeps Reports trustworthy (confirm "still there" / "gone"), and stale Reports expire.

This loop — **report ↔ seek** — is the entire MVP. Everything else is layered on top.

---

## 6. Goals (measurable outcomes)

These are **hypotheses with targets**, to validate after launch in the pilot city:

- **G1 — Liquidity:** ≥ 70% of item searches in the pilot area return at least one *fresh* (< 24h) Report within 3 months of launch.
- **G2 — Contribution:** ≥ 25% of active users post at least one Report per month (a healthy reporter-to-seeker ratio).
- **G3 — Usefulness:** median time from "open app" to "found a useful Report" under 30 seconds.
- **G4 — Retention:** ≥ 30% of users who post or use a Report return within 7 days.
- **G5 — Trust:** ≥ 80% of Reports that get a community signal are confirmed accurate (not flagged wrong/gone).

---

## 7. Non-goals (explicitly out of scope for v1)

- **No transactions / payments / marketplace.** We point people to where things are; we don't sell or process orders. *(Too complex; not the core value.)*
- **No turn-by-turn navigation.** We show location and hand off to the user's maps app. *(Maps already do this well.)*
- **No business inventory integrations.** v1 relies on community reports, not POS/stock feeds. *(No supply; premature.)*
- **No nationwide coverage at launch.** Start in one city to reach report density. *(Liquidity beats breadth early.)*
- **No heavy moderation/verification system in v1.** Lightweight community signals only. *(Build trust tooling once there's volume.)*

---

## 8. User stories

**Seeker**
- As a Seeker, I want to search for a specific item so that I can see where it's available near me.
- As a Seeker, I want to see each Report's price, quantity, and how long ago it was posted so that I can judge if it's worth the trip.
- As a Seeker, I want to see results on a map centered on my location so that I can pick the closest option.
- As a Seeker, I want to open the location in my maps app so that I can navigate there.

**Reporter**
- As a Reporter, I want to post a sighting in a few taps (item, price, quantity, location) so that sharing is effortless.
- As a Reporter, I want the app to use my current location so that I don't have to place the pin manually.
- As a Reporter, I want to optionally add a photo or note so that my Report is more trustworthy.

**Community / trust** *(P1)*
- As a user, I want to confirm a Report is "still there" or mark it "gone" so that others can trust fresh info.
- As a user, I want stale Reports to fade/expire so that I'm not misled by old data.

**Account / power user** *(P1–P2)*
- As a frequent Reporter, I want an account so that my contributions and reputation are tracked.
- As a Seeker, I want to be notified when an item I'm looking for appears nearby so that I don't have to keep checking.

---

## 9. Requirements

### Must-have — P0 (the MVP report↔seek loop)
- **Post a Report (no login required)**: item (name/category), location (GPS or pin), price, quantity; auto timestamp + reporter. Accounts are optional (P1) and only add reputation/history.
  - *Given* I'm on the app (signed in or not), *when* I submit an item with price, quantity, and a location, *then* it appears on the map within seconds.
- **Map of nearby Reports**: render Reports as markers around the user's location.
- **Item search/filter**: find Reports for a specific item.
- **Geolocation**: detect the user's location, with graceful permission-denied handling.
- **Report freshness**: every Report shows its age; very old Reports are visually de-emphasized or expired.
- **Installable PWA**: works on mobile, installable, basic offline shell.

### Should-have — P1 (fast follows)
- Community validation: confirm "still there" / mark "gone".
- Item autocomplete + categories.
- User accounts (attribute Reports, enable reputation).
- Photo/note on a Report.
- "Notify me when X appears nearby" (watchlist + push).

### Could-have / future — P2 (design for, don't build yet)
- Reporter reputation / trust scores.
- Price history & trend per item/area.
- Business-claimed listings and confirmed availability.
- Demand signals / anonymized insights (foundation for monetization).

---

## 10. Success metrics

**Leading indicators (days–weeks)**
- Reports created per day (per city).
- % of searches returning ≥ 1 fresh Report (**liquidity** — the make-or-break metric).
- Reporter activation: % of new users who post within their first week.
- Median time-to-useful-result.

**Lagging indicators (weeks–months)**
- 7-day and 30-day retention.
- Active reporter base growth per city.
- Report accuracy rate (confirmed vs flagged).
- Word-of-mouth / organic growth (k-factor) per city.

> Targets are set per-city and revisited monthly. Liquidity (G1) is the primary metric — without it, nothing else matters.

---

## 11. Business model

**Now: free, no ads, no monetization.** The priority is liquidity and growth — a dense, trusted map
of Reports in the pilot city. Revenue is deferred until the core loop is proven.

**Later candidates (in rough priority):**
1. **Business featured placement** — local shops pay to confirm/highlight their availability and prices.
2. **Aggregated demand & price insights** — anonymized data on what people search for and local pricing.
3. **Optional promoted Reports / premium features** — without compromising the trust of organic reports.

Explicitly avoided early: intrusive ads that would erode trust in community Reports.

---

## 12. Risks & open questions

| # | Risk / question | Owner | Blocking? |
|---|---|---|---|
| R1 | **Cold-start / chicken-and-egg**: Seekers get value only once there are enough Reports. How do we seed the first city? | Founder/Strategy | Yes |
| R2 | **Report accuracy & spam/abuse**: how do we keep data trustworthy without heavy moderation? | Product | Partly |
| R3 | **Location privacy**: how do we handle/store user location responsibly (LGPD)? | Legal/Eng | Yes |
| ✅ D1 | **Launch categories — DECIDED: open to all items.** No category restriction at launch; revisit if liquidity is too thin to seed. | Product | Resolved |
| ✅ D2 | **Reporting model — DECIDED: optional account.** Anyone can report anonymously (lowest friction); signing in unlocks reputation/history. | Product | Resolved |
| Q2 | How long until a Report is considered stale/expired (per category)? | Product/Data | No |
| Q4 | Which pilot city, and how do we recruit the first cohort of Reporters? | Founder | Yes |

> **The single biggest risk is R1 (cold-start).** With categories left open (D1), the bootstrap lever is the **pilot city + first cohort of Reporters (Q4)**: pick one city and seed early Reports ourselves (across whatever items have the most local pain) until the community loop is self-sustaining.

---

## 13. Phasing & roadmap link

Mapped to the epics in [`ROADMAP.md`](../ROADMAP.md):

- **Now (MVP):** the report↔seek loop — post a Report, see nearby Reports on the map, item search, geolocation, PWA. *(Epics E1–E4)*
- **Next:** community validation, accounts, search/autocomplete, watchlist notifications. *(Epics E5–E7)*
- **Later:** reputation, price history, business listings, monetization foundations. *(Epics E6 P2, E8–E9)*

---

## 14. Glossary

- **Report (Relato):** a single community sighting of an item — what / where / how much / how many.
- **Seeker (Buscador):** a user looking for an item.
- **Reporter (Relator):** a user who posts a Report.
- **Liquidity:** the share of searches that return a fresh, useful Report — the core health metric.
- **Freshness:** how recently a Report was posted/confirmed; drives trust and expiry.

---

### How to reuse this as a template
Keep the section headers (1–14) and replace the Aonde-Tem-specific content. The flow — *main idea →
problem → users → value → how it works → goals/non-goals → stories → requirements → metrics → model →
risks → roadmap* — works for any product doc and feeds directly into epic creation.
