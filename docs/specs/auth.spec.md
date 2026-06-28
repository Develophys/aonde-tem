# Spec — Auth (login)

> Feature spec · part of [`MVP-OVERVIEW.md`](./MVP-OVERVIEW.md). **Goal link:** G4. **Epics:** E5/E10.

## Summary
Passwordless login so users can **contribute**. Viewing is always open; **logging in is only required to
contribute** (report, comment, flag, add info) — pending Q1 confirmation. Two methods: **magic email
code** (critical path) and **Google** (fast follow).

## User stories
- As a contributor, I want to sign in with a magic email code so I don't manage a password.
- As a contributor, I want to sign in with Google so it's one tap.
- As a visitor, I want to browse with no login and be prompted to sign in only when I try to contribute.

## Requirements

### P0 — Magic code
- Enter email → receive a **6-digit code** (10-min TTL) → enter code → signed in. Creates/links a User by email.
  - *Given* a valid email, *when* I submit, *then* I receive a code; entering it correctly logs me in; an expired/wrong code shows a clear error and **never** logs me in.
- **Session:** stateless **JWT** (short-lived) returned to the app, kept in memory (Zustand), sent as `Authorization: Bearer`.
- **Login gating:** all reads work with no auth; contribute endpoints require a valid session (else 401 → sign-in prompt).

### P0 (recommended) / can fast-follow to P1 — Google
- **Google OAuth2**: sign in with Google, link/create User by verified email.
  > Magic-code is the critical path (no OAuth app review). If Google setup risks the timeline, ship magic-code first.

### P1
- Refresh tokens / "remember me"; account screen; sign-out everywhere.

## Open questions
- **Q1 — Confirm login required to contribute** (cross-cutting; supersedes product-doc D2). **Blocking.**
- **Q2 — Transactional email provider** for magic codes (e.g., Resend free tier ~3k/mo) — adds a small dependency/cost. *(Eng, blocking for magic code.)*
- **Q7 — LGPD**: storing email; minimal privacy notice. *(Legal, blocking.)*

## Dependencies
- `User` entity & migration (E10). Email provider (Q2). Used by report/comment/flag specs as the gate.

## Backlog mapping
User entity + magic-code auth + email provider + JWT session (E10); Google OAuth (E10, P0/P1).
