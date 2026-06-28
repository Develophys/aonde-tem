# Spec — Item Watchlist & Notifications

> Status: **Draft v0.1** · Owner: Mauricio · Last updated: 2026-06-27
> Feature spec / PRD for **Epic E11**, derived from [`PRODUCT.en.md`](../PRODUCT.en.md) (§8 user stories,
> §9 P1 *"Notify me when X appears nearby"*) and [`ROADMAP.md`](../ROADMAP.md) (Phase 2–3, E11).
> Builds on the MVP shared data model in [`MVP-OVERVIEW.md`](./MVP-OVERVIEW.md) §5 (the `Watchlist` entity
> deferred there) and **hard-depends** on the `Discovery` create/confirm event from
> [`report-discovery.spec.md`](./report-discovery.spec.md) and login from [`auth.spec.md`](./auth.spec.md).
> A Portuguese version is kept in sync at [`NOTIFICACOES.pt.md`](./NOTIFICACOES.pt.md).
>
> **Terminology:** the user-facing concept is a "Report" (PT: "Relato"); the MVP data model entity is
> **`Discovery`** (`MVP-OVERVIEW.md` §5 — lineage: Report → Sighting → Discovery). Technical sections below
> reference `Discovery`.

---

## 1. Summary

Let a signed-in user **watch a specific item** and get **alerted** when the community posts a fresh
Report that matches — either because the item just appeared **nearby**, or because someone reported it
**at or below a price the user set**. Alerts arrive as **Web Push** (works on the installed PWA, even
when the app is closed) and land in an **in-app notification inbox**. Watching and alerting are fully
**opt-in and reversible** — the user can pause or delete any watch, turn off the push channel, and revoke
push permission at any time. All location and contact data is handled under **LGPD**.

This closes the loop for the Seeker persona: instead of repeatedly re-opening the app to check whether an
item showed up, the item finds *them*.

---

## 2. Problem statement

Today a Seeker who can't find an item has only one option: come back later and search again. The product's
core value — *"don't waste a trip"* — breaks down for items that aren't available **right now**, because
there is no way to be told **when** they become available. Reports are time-sensitive and age out, so the
window to act on a fresh discovery is short; a Seeker who isn't looking at the map in that window misses it
entirely. The knowledge ("it's in stock at R$X near you") exists for a few hours and then evaporates
unseen. Without a notify-me mechanism, we lose the repeat-engagement that turns a one-off search into a
returning habit, and we leave real demand unmet.

---

## 3. Goals

- **G1 — Re-engagement:** a watch reliably brings the user back. Target: ≥ 35% of push notifications sent
  result in the user opening the app within 24h (notification → open rate).
- **G2 — Match usefulness:** alerts represent real, actionable discoveries. Target: ≥ 70% of delivered
  alerts are for Reports still considered *fresh* (un-expired) at delivery time.
- **G3 — Adoption of the loop:** watching becomes a normal Seeker behavior. Target: ≥ 20% of signed-in
  users create at least one watch within their first month.
- **G4 — Trust / low annoyance:** notifications help rather than spam. Target: watch-deletion-due-to-
  -too-many-alerts and push-permission-revocation each stay under 10% of watch creators per month.
- **G5 — Latency:** a matching Report reaches the user fast enough to act on. Target: median time from
  Report creation to notification delivery under 60 seconds.

---

## 4. Non-goals (explicitly out of scope for v1)

- **No email or SMS channel.** v1 is Web Push + in-app only. Email is a likely fast-follow (P2) but adds
  deliverability, templating, and consent surface we don't need to prove the concept. *(Deferred, not rejected.)*
- **No anonymous / device-only watches.** Watches require an account (see §6). Anonymous reporting stays
  unchanged; only *watching* needs identity. *(Keeps the consent + storage model clean for LGPD.)*
- **No "any new report anywhere" or restock-confirmation triggers in v1.** Only *nearby* and *price-at-or-
  below-target*. Other triggers were considered and parked. *(Avoids alert overload before we tune signal quality.)*
- **No rich/scheduled digests or "daily summary" emails.** Alerts are event-driven, near-real-time. *(Digest is a separate initiative.)*
- **No cross-item / category-level watches** (e.g. "any pharmacy item"). Watches are for one item. *(Category modeling is immature; revisit with E7.)*
- **No in-notification actions** beyond "open" (no reply, no one-tap "claim"). *(Keep payload and surface minimal first.)*

---

## 5. Personas & user stories

Primary persona: **the Seeker** (signed in). Secondary: **the Reporter**, whose post *triggers* others'
alerts (no new behavior required of them).

### Creating & managing a watch
- As a Seeker, I want to tap "Notify me" on an item I searched for so that I'm told when it shows up,
  instead of checking the app repeatedly.
- As a Seeker, I want to set the **area** for a watch (use my current location + a radius) so that I only
  hear about discoveries I could actually reach.
- As a Seeker, I want to set a **maximum price** so that I'm only alerted when it's worth my trip.
- As a Seeker, I want to combine both ("within 3 km **and** at/below R$ 5,00") so that alerts match what I
  actually care about.
- As a Seeker, I want to see all my active watches in one place so that I can manage them.
- As a Seeker, I want to **pause** or **delete** a watch so that I stop alerts without losing my account.

### Receiving an alert
- As a Seeker, I want a push notification when a matching Report is posted so that I learn about it even
  when the app is closed.
- As a Seeker, I want tapping the notification to open the matching Report on the map so that I can act on
  it in one step.
- As a Seeker, I want every alert to also appear in an in-app inbox so that I can find it again if I
  dismissed the push.
- As a Seeker, I want to see which alerts I've already read so that I can triage them.

### Consent & control (LGPD)
- As a user, I want to explicitly grant notification permission, with a clear explanation of why, so that I
  understand what I'm agreeing to.
- As a user, I want a single **push on/off toggle** so that I can silence all interruptions at once while
  still keeping a record of discoveries in the app's inbox.
- As a user, I want to revoke push permission and have the app respect it so that I'm never messaged after
  I opt out.
- As a user, I want my watch areas (which carry my location) to be deletable so that I control my location
  footprint.

### Edge / empty / error states
- As a user with notifications blocked at the OS/browser level, I want the app to tell me clearly and still
  keep my alerts in the in-app inbox so that the feature degrades gracefully.
- As a Seeker, I want to be told if I already have a watch for this item so that I don't create duplicates.
- As a Seeker who created a watch but no match has happened yet, I want the watch list to show a clear
  "watching — no discoveries yet" state so that I know it's working.

---

## 6. Requirements

### Must-have — P0 (the watch ↔ alert loop)

**P0-1 · Create a watch (account required).**
A signed-in user can create a watch on a specific item with: the item, an **area** (center + radius), and
an optional **max price**. The area is always set — the radius **defaults to 2 km** (walkable / short-hop,
matching the hyperlocal "don't waste a trip" ethos) and is adjustable via a slider. Max price is optional:
a watch is a statement of *intent*, so a user who just wants to know an item is nearby "at any price" (e.g.
a scarce medication) must not be forced to invent a number. Alert volume is **not** controlled by
constraining the watch — it's handled at the delivery layer (see P0-8 batching).
- *Given* I'm signed in and viewing an item, *when* I save with the default (or adjusted) radius and an
  optional max price, *then* a watch is created and appears in my watch list as "active".
- *Given* I don't touch the price field, *then* the watch is created as a price-agnostic "nearby" watch
  (no validation error).
- *Given* I already have a watch for this item, *when* I try to create another, *then* I'm offered to edit
  the existing one instead of duplicating.

**P0-2 · Matching engine.**
When a Report is created (or confirmed "still there"), the system evaluates active watches and produces a
match when **all set conditions hold**: the Report's location is within the watch's radius of its center
**AND** the Report's price ≤ the watch's max price (price only checked if set). Only **fresh** (un-expired)
Reports can produce a match. A match is a candidate for delivery, which is then batched (see P0-8) — the
matching engine does not send directly. Note: because watches are per-item and P0-1 forbids a second watch
on the same item, a single Report can match **at most one** of a given user's watches in v1 (cross-watch
dedupe is therefore a non-issue; see §10).
- *Given* an active watch (radius 2 km, max price R$ 5,00), *when* a fresh Report for that item is posted
  1.5 km away at R$ 4,50, *then* exactly one match is generated for that watch.
- *Given* the same watch, *when* a Report is posted at R$ 6,00 (over budget) or 6 km away (out of area),
  *then* no match is generated.
- *Given* a matching Report, *when* the same Report is later confirmed "still there", *then* the user is
  **not** matched again for that same Report (dedupe by watch + report).

**P0-3 · Web Push delivery.**
A matched watch sends a Web Push notification to the user's subscribed devices. The notification shows the
item, price, and rough distance/area; tapping it deep-links to the matching Report on the map.
- *Given* I have push enabled and a match occurs, *when* the alert fires, *then* I receive a push within
  the G5 latency target, even with the app closed.
- *Given* I tap the notification, *then* the app opens focused on that Report.

**P0-4 · In-app notification inbox.**
Every alert is also persisted to an in-app inbox showing item, price, location/distance, the triggering
condition, timestamp, and read/unread state. This is the source of truth even if push fails or is blocked.
- *Given* an alert was generated, *when* I open the inbox, *then* I see it with unread styling; *when* I
  open it, *then* it deep-links to the Report and is marked read.

**P0-5 · Permission & consent flow.**
The app requests Web Push permission **contextually** (at the moment the user creates their first watch or
explicitly enables push), with a plain-language rationale, never on first load. Declining is respected and
recoverable later.
- *Given* I create my first watch, *when* the app needs push permission, *then* I see a rationale screen
  before the browser prompt, and declining still creates the watch (alerts go to the in-app inbox only).

**P0-6 · Enable/disable controls.**
Rather than one ambiguous "master notifications" switch, control is split along the two distinct concepts —
*interruption* vs. *matching* — giving a clean, honest hierarchy that mirrors how the browser permission
already works:
- a **Push notifications channel toggle** (governs the interruptive push channel only — not data, not the inbox);
- per-watch **pause/resume** (governs whether a watch matches at all);
- per-watch **delete** (removes the watch and its data).

The inbox always reflects whatever watches are active; it is a passive record, never an interruption, so it
is not gated by the push toggle. This dissolves the "off but still collecting my data" ambiguity, because
collection is tied to a watch the user explicitly controls.
- *Given* I turn the push toggle off, *when* a match occurs, *then* no push is sent, but the watch still
  matches and the alert still appears in my inbox; turning push back on resumes future pushes with my
  history intact.
- *Given* I pause a watch, *when* a matching Report is posted, *then* no match, no push, and no inbox entry
  is generated for it; resuming makes it match future Reports.
- *Given* I delete a watch, *then* it stops matching immediately and is removed from my list.

> UX risk: users must understand inbox ≠ push. This is a copy/onboarding problem — the toggle label and
> first-run rationale must make clear that turning push off still keeps a record in the app.

**P0-7 · LGPD compliance for watch & subscription data.**
Watches store location (area center) and push subscriptions store device endpoints — both are personal
data. The feature must: capture explicit consent for notifications, store the legal basis and timestamp,
let the user **view and delete** their watches and registered push devices, and purge push subscriptions on
permission revocation or logout. Data retention and the rationale copy align with the R3 location-privacy /
LGPD risk in [`PRODUCT.en.md`](../PRODUCT.en.md) §12.
- *Given* I revoke push permission (in-app or browser), *then* the corresponding subscription is deleted
  server-side and no further pushes are attempted to it.
- *Given* I delete my account, *then* my watches and push subscriptions are deleted.

**P0-8 · Batched delivery (the core delivery primitive).**
Alert volume is solved in **one** place — the delivery layer — not by constraining watch definitions or
bolting on a throttle later. When matches for a watch arrive, delivery holds a short **batch window**
(default ~10–15 min) and collapses everything in it into a **single** push per watch (e.g. *"3 discoveries of
rice near you, from R$ 4,50"*), while still writing each individual discovery to the inbox. This single
mechanism subsumes the within-watch flood (many fresh Reports for one item in a short span), makes a
mandatory price cap and a tight radius unnecessary, and is a strictly better UX than several buzzes in a row.
- *Given* a watch and 4 matching fresh Reports posted within the batch window, *when* the window closes,
  *then* I receive **one** push summarizing them, and the inbox contains **4** individual entries.
- *Given* a single match in a window, *then* delivery is a normal single-item push (no artificial delay
  beyond the window's natural close / immediate-flush for the first match — see Q6).
- *Given* the push toggle is off, *then* batching still writes the inbox entries but sends no push.

### Should-have — P1 (fast follows)

- **Quiet hours:** user-set window during which pushes are held (and optionally delivered as one summary
  when the window ends); in-app inbox still updates silently.
- **"Watching" affordance on the map/search:** a bell toggle directly on item results so creating a watch
  is one tap from a search.
- **Edit a watch** (change radius/price) without delete-and-recreate.
- **Unread badge** on the app's notification icon reflecting inbox unread count.

### Could-have / future — P2 (design for, don't build yet)

- **Email channel** as an additional, separately-consented delivery method.
- **Restock / "still there" re-confirmation** trigger for a specific watched Report.
- **Category- or keyword-level watches** (depends on item taxonomy from E7).
- **Smart radius** ("near my route" / multiple saved areas like home + work).
- **Digest mode** (daily/weekly summary instead of real-time).

> **Design-for note:** model channels as an extensible set (push, in-app, future email) and triggers as
> typed conditions (`nearby`, `price_below`, future `restock`, `any`) from day one, so P2 additions don't
> require reshaping the schema.

---

## 7. Experience flow (high level)

1. **Discover → watch.** Seeker searches an item, finds no/insufficient fresh Reports, taps **"Notify me"**.
2. **Configure.** Sheet lets them set the **area** (current location + radius slider, default 2 km) and,
   optionally, a **max price**. Save.
3. **Consent (first time).** Rationale → browser push prompt. Decline still saves the watch (inbox-only).
4. **Wait.** Watch shows in the list as "watching — no discoveries yet".
5. **Match.** A Reporter posts a fresh, in-budget, in-area Report → matching engine fires → match enters the
   batch window.
6. **Alert.** Batch window closes → **one** Web Push lands (app closed or open) summarizing the discovery(s)
   **and** each gets an inbox entry.
7. **Act.** Tap → Report opens on the map → Seeker decides to go (hands off to their maps app per the
   product's no-navigation non-goal).
8. **Manage.** Anytime: pause, edit (P1), delete a watch, or flip the **push toggle** off (inbox keeps recording).

---

## 8. Success metrics

**Leading (days–weeks)**
- Watches created per signed-in user; % of signed-in users with ≥ 1 active watch (G3).
- Notification → app-open rate within 24h (G1).
- Delivery latency p50/p95 (G5).
- Push opt-in rate at the consent prompt; push permission revocation rate.

**Lagging (weeks–months)**
- 7-day / 30-day retention of watch creators vs. non-watchers (does watching lift retention?).
- Share of delivered alerts that were "fresh" at delivery (G2).
- Watch deletions attributed to alert volume; push-toggle-off rate (G4).
- Repeat watch creation (do users who get a useful alert make more watches?).

> Measurement: instrument watch create/pause/delete, permission grant/deny/revoke, push send/deliver/open,
> and inbox open/read. Evaluate at 1 week, 1 month, 1 quarter post-launch (PostHog per E9).

---

## 9. Technical considerations

These are constraints and notes for the eventual ADR / system-design pass — not a final design.

- **Data model (new):** a `Watch` entity (owner, **`productId`** → Product, `center` `geography(Point)` +
  `radiusM` (default 2 km), optional `maxPriceCents`, status, timestamps) and a `PushSubscription` entity
  (owner, endpoint, keys, userAgent, consent metadata, createdAt). A `Notification` (inbox) record per match
  (owner, watch ref, **`discoveryId`** ref, channel, readAt). Push on/off is a per-user preference, not
  per-watch. This realizes the `Watchlist` entity deferred in `MVP-OVERVIEW.md` §5. The matched entity is the
  **`Discovery`** (productId → Product, placeId → Place, `price`, `quantity`, `expiresAt`) defined there —
  this spec **depends on Discoveries existing** and on a domain event when a Discovery is created/confirmed
  (owned by [`report-discovery.spec.md`](./report-discovery.spec.md)).
- **Matching:** reuse PostGIS (`ST_DWithin` on `geography`) like `find-nearby-places`, but inverted — given a
  new Discovery's Place point and `productId`, find watches on that product whose `center` is within `radiusM`
  and whose `maxPriceCents` ≥ the Discovery's `price`. Freshness = the Discovery is not past `expiresAt`. Index
  watch centers with GiST. Evaluate on the Discovery-created/confirmed domain event.
- **Clean Architecture fit:** matching logic lives in `packages/domain` (pure: given report + watches →
  matches); push delivery and persistence are adapters behind ports (e.g. `PushSender`, `WatchRepository`,
  `NotificationRepository`). No web-push SDK in the domain. Validate watch input with Zod in
  `packages/contracts`.
- **Web Push specifics:** VAPID keys; service-worker `push` + `notificationclick` handlers in `apps/web`
  (the SW already exists for the PWA shell, E4). Subscriptions are per-device — a user may have several.
  Handle `410 Gone` / expired endpoints by pruning the subscription.
- **Delivery path:** Discovery-created event → enqueue match job → fan-out to matched watches → **inbox write
  immediately** + enqueue into the watch's **batch window** (P0-8) → on window close, collapse to one push
  per watch (if the user's push toggle is on). Keep it async so posting a Discovery stays fast (performance
  pillar). A lightweight queue/worker with a per-watch debounce/timer is sufficient; avoid blocking the
  `POST /discoveries` request. The batch window is the single chokepoint for alert volume — design it first.
- **Performance pillar:** notifications must not regress the Moto-G-on-3G experience — push payloads tiny,
  SW logic minimal, inbox list paginated and lean, respect `Save-Data`.
- **Abuse/cost:** matching and push fan-out are attack surface (someone could spam Reports to trigger mass
  pushes). Reuse API rate limiting (E2) and the batch window (P0-8) as guardrails.

---

## 10. Open questions

| # | Question | Owner | Blocking? |
|---|---|---|---|
| Q1 | The `Discovery` entity exists in the MVP model, but does [`report-discovery.spec.md`](./report-discovery.spec.md) **emit a "discovery created/confirmed" domain event** for E11 to consume? If not, that hook must be added there first. This is the hard dependency. | Eng | **Yes** |
| Q3 | Exact LGPD posture: retention period for push subscriptions and inbox history; consent record format; is a notification-specific consent string needed separate from account ToS? | Legal/Eng | Partly |
| Q6 | Batch window length (default ~10–15 min) and whether the *first* match in an empty window flushes immediately (lower latency) or always waits for window close (better batching). | Product/Eng | No |
| Q7 | iOS PWA Web Push support/limitations for the target audience — fallback expectations on unsupported browsers. | Eng | Partly |

**Resolved (folded into requirements):**

- ~~Q2 — master-switch semantics~~ → **Resolved:** no ambiguous master switch. Split into a push-channel
  toggle (interruption only; inbox keeps recording) + per-watch pause (matching). See P0-6.
- ~~Q4 — default radius / mandatory price~~ → **Resolved:** radius defaults to **2 km** (adjustable);
  max price stays **optional**. Volume is handled by batching (P0-8), not by constraining the watch. See P0-1.
- ~~Q5 — cross-watch dedupe~~ → **Resolved (non-issue in v1):** watches are per-item and duplicates are
  blocked (P0-1), so a Report can match at most one of a user's watches. Re-opens only if category/keyword
  watches (P2) ship. See P0-2.
- ~~Frequency cap~~ → **Promoted from P1 to P0** as the batch window (P0-8), the single delivery primitive
  for alert volume.

---

## 11. Timeline & phasing

This feature sits in **Phase 2 (Usable product)** and **hard-depends on**:
(a) **Accounts/Auth** (Epic E5) — watches require sign-in; and
(b) the **`Discovery`** create/confirm domain event from [`report-discovery.spec.md`](./report-discovery.spec.md)
— there is nothing to match against without it.

Suggested phasing once those land:

- **Phase A — Foundations:** `Watch` + `PushSubscription` + `Notification` schema, Zod contracts, domain
  matching logic + unit tests, VAPID setup, SW push/click handlers.
- **Phase B — Loop:** create-watch UI (2 km default radius, optional price), consent flow, matching on
  Report events, **batched** Web Push + inbox delivery, push-toggle + per-watch pause/delete controls.
  *(This is the P0 shippable — batching ships here, not later.)*
- **Phase C — Hardening (P1):** quiet hours, edit-watch, unread badge, map-side bell toggle.

No hard external deadline; gate the launch on G2 (match usefulness) and G4 (low annoyance) looking healthy
in dogfooding before exposing to the pilot city.

---

## 12. Glossary

- **Watch:** a user's standing request to be alerted about a specific item, scoped by an area (radius,
  default 2 km) and an optional max price.
- **Report / Discovery:** used interchangeably here; `Discovery` is the entity name in the MVP data model
  (`MVP-OVERVIEW.md` §5). A community discovery of a Product at a Place for a price/quantity.
- **Trigger / condition:** what makes a Discovery match a watch — `nearby` (within radius) and/or
  `price_below` (≤ max price) in v1.
- **Match:** a fresh Discovery that satisfies a watch's conditions; a candidate for delivery.
- **Batch window:** the short hold (default ~10–15 min) during which a watch's matches are collapsed into a
  single push; the core mechanism for controlling alert volume.
- **Push toggle:** the per-user on/off switch for the interruptive push channel; does not stop matching or
  inbox recording.
- **Inbox:** the in-app, persistent list of a user's matches (read/unread); always recording while a watch
  is active.
- **Push subscription:** a per-device Web Push endpoint the user consented to; personal data under LGPD.
