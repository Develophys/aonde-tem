# Spec — Feedback & flags (denúncia)

> Feature spec · part of [`MVP-OVERVIEW.md`](./MVP-OVERVIEW.md). **Goal link:** G3. **Epics:** E6, E10.

## Summary
Community signals that keep the data trustworthy and the catalog clean: logged-in users can **flag
(denunciar)** a product or discovery as illegal/inappropriate, and **comment** to give feedback. An admin
reviews flags and removes offending content. This is the reactive half of moderation (the proactive half
is the blocklist in [`product-moderation.spec.md`](./product-moderation.spec.md)).

## User stories
- As a contributor, I want to flag a product or discovery (illegal/inappropriate/spam/wrong info) so bad content gets removed.
- As a contributor, I want to comment on a product or discovery (e.g., "já acabou") so I can give feedback.
- As an admin, I want a list of open flags so I can review and remove offending content quickly.

## Requirements

### P0
- **Flag (denúncia)** a product or discovery with a `reason` (+ optional comment); **login required**.
  - *Given* I'm logged in, *when* I flag a target with a reason, *then* a `Flag` is recorded as `open`.
- **Admin removal:** an admin can hide/remove a flagged product/discovery and resolve the flag.
  - *Given* a product gets a valid `illegal` flag, *when* an admin actions it, *then* the product and its discoveries are hidden from all read endpoints.
- **Minimal admin surface:** a list of open flags + a hide/resolve action (admin-only endpoint or minimal UI is fine for v1).

### P1
- **Comments** on products and discoveries (display + post).
- **Flag thresholds:** auto-hide after N pending flags, awaiting review; notify the reporter on resolution.

### P2
- Reputation-weighted flags; audit log; appeal flow.

## Open questions
- **Q3 — Blocklist/curation** & who acts as admin at launch (cross-cutting, see overview).
- Auto-hide threshold value (N) for P1. *(Product, non-blocking.)*

## Dependencies
- `Flag` + `Comment` entities & migration (E10). Auth (login gate). Product/Discovery reads must honor hidden status.

## Backlog mapping
Flag (denúncia) + admin hide + minimal queue (E10/E6, P0); comments + thresholds (E6, P1).
