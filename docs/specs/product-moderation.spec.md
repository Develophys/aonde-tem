# Spec — Product (free text + moderation)

> Feature spec · part of [`MVP-OVERVIEW.md`](./MVP-OVERVIEW.md). **Goal link:** G2, G3. **Epics:** E1, E2, E10.

## Summary
A **Product** is created from free-text but is a real, deduplicated entity (so it can carry info,
comments, and flags). Creation is screened against a **blocklist** to keep illegal/inappropriate items
out cheaply, and similar names collapse to one product via a normalized key.

## User stories
- As a contributor, I want to type a product name and have it created (or matched to an existing one) so I don't make duplicates.
- As a contributor entering a banned product, I want a clear rejection explaining why so I understand it's not allowed.
- As a visitor, I want a simple product view (name + its active discoveries) so I can see where it's available.
- As a contributor, I want to add information to a product (description, photo) so the listing is more useful.
- As an admin, I want new products screened against a blocklist so banned items never go live.

## Requirements

### P0
- **Create product (free text)** → run **blocklist** check: `block` → reject with reason; `review` → create as `under_review` (hidden publicly); else `active`.
  - *Given* I submit a product whose name matches a `block` term, *when* I save, *then* it's rejected with a clear reason and **not** stored as active.
- **Dedup:** normalize the name (lowercase/strip accents & punctuation/deburr, collapse units "5kg"="5 kg") → if it matches an existing `normalizedKey`, reuse that Product instead of creating a duplicate.
- **Autocomplete on type (R-01):** as the user types a product, suggest existing products (trigram/`pg_trgm` match) so they **pick** rather than retype a variant — the single biggest lever against duplicates and missed search.
  - *Given* I start typing "coca", *when* matches exist, *then* I see existing products to pick; choosing one reuses it instead of creating a new product.
- **Minimal product view:** product name + its active discoveries (where/price/qty/freshness).
- **BlockedTerm** store, enforced at creation (admin-seeded list; UI can be DB-only for v1).

### P1
- Add/edit **product info** (description, photo) by logged-in users (same blocklist/flag rules).
- Product page with comments (see [`feedback-flags.spec.md`](./feedback-flags.spec.md)).

### P2
- Categories, attributes, canonical/merge tooling for near-duplicates.

## Open questions
- **Q3 — Blocklist contents & curation** (cross-cutting, see overview).
- **Q6 — Product photo storage** on a budget (e.g., Cloudflare R2 free tier). *(Eng, non-blocking, P1.)*

## Dependencies
- `Product` + `BlockedTerm` entities & migration (E1). Create/read endpoints (E2). Login for create (see [`auth.spec.md`](./auth.spec.md)).

## Backlog mapping
Product entity + free-text create + blocklist + dedup (E10/E1), product view (E2/E4), add-info (P1).
