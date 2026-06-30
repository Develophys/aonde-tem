# Design: Auth Overhaul + Map UX Fixes

**Date:** 2026-06-29
**Status:** Approved

## Overview

Four features:
1. Auth overhaul — Google OAuth + email+password login + magic-code sign-up
2. "Ver no mapa" — fly in-app map to place instead of opening Google Maps
3. AppHeader — hide login button on auth pages
4. Range slider — hide behind PlaceModal when a place is selected

---

## Feature 1 — Auth

### User flows

| Flow | Path | Steps |
|---|---|---|
| Login (existing user) | `/signin` | email + password → JWT → `/` |
| Sign up (new user) | `/signup` | email → magic code → name + password → JWT → `/` |
| Google (any user) | `/signin` | click Google → consent screen → callback → JWT → `/` |

### Backend

#### Prisma schema — `User` model additions
```prisma
password    String?   // bcrypt hash; null for Google-only accounts
googleId    String?   @unique
```

`displayName` already exists. Migration is additive (both columns nullable).

#### New use cases

**`LoginWithPassword`**
- Input: `{ email, password }`
- Find user by email; reject if not found or no `password` set
- Compare bcrypt hash; reject on mismatch
- Issue JWT (same shape as existing `VerifyMagicCode`)

**`CompleteRegistration`**
- Called after magic-code verification for new users
- Input: `{ email, displayName, password }` + verified identity from a short-lived registration token
- Hash password with bcrypt (rounds = 12)
- Update user row: `displayName`, `password`
- Issue full JWT

**`LoginWithGoogle`** (Passport strategy)
- Receives Google profile (`sub`, `email`, `name`)
- Find user by `googleId`; if not found, find by `email` and link `googleId`, or create new user
- Issue JWT

#### New endpoints

| Method | Path | Use case | Auth |
|---|---|---|---|
| `POST` | `/auth/login` | `LoginWithPassword` | public |
| `POST` | `/auth/complete-registration` | `CompleteRegistration` | registration token (short-lived JWT, `type: "registration"`) |
| `GET` | `/auth/google` | Passport redirect | public |
| `GET` | `/auth/google/callback` | Passport callback | public |

**Google callback response**: `302` redirect to `/?token=<jwt>`. The frontend root reads `?token=` on mount, calls `setSession`, strips the param from the URL.

#### Magic-code flow change for new users

After `POST /auth/verify-magic-code`:
- If user already has a `password` set → issue full JWT (existing behaviour)
- If user has no `password` → issue short-lived registration token (`expiresIn: "10m"`, `type: "registration"`) and respond with `{ registrationToken, email }` instead of a full JWT

Frontend detects `registrationToken` in the Step 2 response and advances the `SignUpPage` wizard to Step 3, holding the token in component state. No navigation occurs — the user stays on `/signup`.

#### New packages
- `bcrypt` + `@types/bcrypt`
- `@nestjs/passport`, `passport`, `passport-google-oauth20`, `@types/passport-google-oauth20`

#### New env vars
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

#### New contracts (`packages/contracts`)
```ts
loginSchema              // { email, password }
completeRegistrationSchema  // { registrationToken, displayName, password }
```

### Frontend

#### Route changes (`apps/web/src/app/router.tsx`)
- Add `/signup` route → `SignUpPage` (lazy)
- Add token-capture effect in `RootLayout` (reads `?token=` on mount)

#### `SignInPage.tsx` — login only
- Google OAuth button (top): `<a href="/auth/google">Entrar com Google</a>`
- Divider "ou"
- Email + password form with `useLoginWithPassword` mutation
- "Criar conta →" link to `/signup`
- Error states: wrong password, user not found, Google-only account ("Esta conta usa login com Google")

#### New `SignUpPage.tsx` — 3-step wizard
- **Step 1**: email field → `POST /auth/send-magic-code`
- **Step 2**: 6-digit code field → `POST /auth/verify-magic-code` → receives `registrationToken`
- **Step 3**: display name + password + confirm password → `POST /auth/complete-registration` → full JWT → navigate to `/`

State held in component (`useState`): `step`, `email`, `registrationToken`.

#### New mutations (`apps/web/src/features/auth/api/`)
- `useLoginWithPassword` — `POST /auth/login`
- `useCompleteRegistration` — `POST /auth/complete-registration`

---

## Feature 2 — "Ver no mapa" flies in-app map

### Problem
`PlaceModal` opens `https://www.google.com/maps/...` in a new tab. The in-app MapLibre map should be used instead.

### Solution
`MapView` owns `mapRef`. Since `PlaceModal` renders as a child of `MapView`, pass a `flyTo` callback down as a prop.

```
MapView
  mapRef.current.flyTo({ center: [lng, lat], zoom: 17, duration: 800 })
  ↓ prop: onFlyTo(coords)
  PlaceModal
    "Ver no mapa" → clearSelectedPlace() + onFlyTo(data.coords)
```

The place coords (`data.coords`) already come from `usePlaceDiscoveries` — no new API call.

### Changes
- `PlaceModal` prop: `onFlyTo: (coords: { lat: number; lng: number }) => void`
- Button: `<button>` replaces `<a href={mapsUrl}>`, calls `clearSelectedPlace()` then `onFlyTo(data.coords)`
- `MapView`: passes `(coords) => mapRef.current?.flyTo({ center: [coords.lng, coords.lat], zoom: 17, duration: 800 })` as `onFlyTo`
- Remove `mapsUrl` construction from `PlaceModal` entirely

---

## Feature 3 — Hide login button on auth pages

### Problem
`AppHeader` renders in `RootLayout` for all routes. Unauthenticated users see "Entrar" even on `/signin` and `/signup`.

### Solution
`AppHeader` reads `useLocation()` and returns `null` for auth routes when user is not logged in:

```ts
const { pathname } = useLocation();
if (!sessionUser && (pathname === '/signin' || pathname === '/signup')) return null;
```

The logged-in avatar/dropdown still shows on all pages (user may want to log out from anywhere).

### Changes
- `AppHeader.tsx`: add `useLocation` import and one early-return guard

---

## Feature 4 — Range slider hidden behind PlaceModal

### Problem
The radius slider in `SeekPage` has `z-10` and renders after the `absolute inset-0` map container in the DOM. It paints on top of `PlaceModal` regardless of the modal's z-index.

### Solution
Hide the slider while a place is selected:

```tsx
// SeekPage.tsx
const selectedPlaceId = useAppStore((s) => s.selectedPlaceId);

{!selectedPlaceId && (
  <div className="absolute bottom-6 left-4 z-10 ...">
    {/* radius slider */}
  </div>
)}
```

### Changes
- `SeekPage.tsx`: read `selectedPlaceId` from store; wrap slider in conditional render

---

## Files touched

### Backend (`apps/api`)
- `prisma/schema.prisma` — add `password`, `googleId` to User
- `packages/domain/src/repositories/user-repository.ts` — add `findByGoogleId`, `updateCredentials`
- `apps/api/src/modules/auth/application/login-with-password.ts` — new
- `apps/api/src/modules/auth/application/complete-registration.ts` — new
- `apps/api/src/modules/auth/application/verify-magic-code.ts` — change: detect new vs returning user
- `apps/api/src/modules/auth/infrastructure/google.strategy.ts` — new Passport strategy
- `apps/api/src/modules/auth/presentation/auth.controller.ts` — new endpoints
- `apps/api/src/modules/auth/auth.module.ts` — wire new providers

### Contracts (`packages/contracts`)
- `src/auth.ts` — add `loginSchema`, `completeRegistrationSchema`

### Frontend (`apps/web`)
- `src/app/router.tsx` — add `/signup` route, token-capture effect
- `src/features/auth/ui/SignInPage.tsx` — login only (Google + email+password)
- `src/features/auth/ui/SignUpPage.tsx` — new, 3-step wizard
- `src/features/auth/api/auth.mutations.ts` — add `useLoginWithPassword`, `useCompleteRegistration`
- `src/features/auth/ui/AppHeader.tsx` — hide on auth routes
- `src/features/map/ui/PlaceModal.tsx` — `onFlyTo` prop, button replaces link
- `src/features/map/ui/MapView.tsx` — pass `onFlyTo` to `PlaceModal`
- `src/features/seek/ui/SeekPage.tsx` — hide slider when place selected

### Infrastructure
- `.env.example` — add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
