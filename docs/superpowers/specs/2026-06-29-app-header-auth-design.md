# Design: App Header with Auth Button

**Date:** 2026-06-29
**Status:** Approved

## What we're building

A fixed overlay header that floats over every page of the app. It shows a "Login" button when the user is unauthenticated, and an avatar + name + logout dropdown when authenticated. Clicking "Login" navigates to the existing `SignInPage`.

## Scope

**In:** `AppHeader` component, mounting it in `main.tsx`, avatar/name display, logout, sign-in navigation.

**Out:** Modal sign-in, per-page header customization, notification badges, branding/logo in header (future), persistent session (JWT is already in-memory only).

## Architecture

### Where it lives

`features/auth/ui/AppHeader.tsx` — auth feature owns it since it reads auth state and drives the sign-in flow.

### Mounting point

`main.tsx` renders `<AppHeader>` once, positioned `fixed` over all page content. No changes to `SeekPage`, `ReportPage`, or `SignInPage`.

```tsx
// main.tsx (simplified)
<QueryClientProvider client={queryClient}>
  <AppHeader onSignIn={() => setPage("signin")} />
  {page === "seek"    && <SeekPage onReport={...} />}
  {page === "report"  && <ReportPage onBack={...} />}
  {page === "signin"  && <SignInPage onSuccess={...} />}
</QueryClientProvider>
```

## Component: `AppHeader`

### Props

```ts
interface AppHeaderProps {
  onSignIn: () => void;   // navigate to SignInPage
}
```

### Internal state

- `dropdownOpen: boolean` — controls the logout dropdown visibility (local `useState`)

### Auth state

Reads from Zustand `SessionSlice`:
- `sessionUser` — null when unauthenticated
- `clearSession()` — called on logout

### Render: unauthenticated

```
[                         ] [ Login → ]
          (transparent area)   (top-right, z-50)
```

Single pill button, top-right corner, brand green background (`#1a5c3a`), white text, `shadow-md` for map legibility.

```
position: fixed; top: env(safe-area-inset-top, 0) + 12px; right: 12px; z-index: 50
```

### Render: authenticated

```
[                         ] [ ● MA  Mauricio ▾ ]
                                    │
                                 [ Sair ]   ← dropdown
```

- **Avatar:** 32×32px circle, brand green bg, white initials (first 2 chars of `displayName`, uppercased; fallback to first char of email)
- **Name:** `displayName` truncated at 16 chars
- **Chevron:** small `▾` icon, rotates 180° when dropdown open
- **Dropdown:** white card, `shadow-lg`, `rounded-xl`, `z-50`, single "Sair" item in muted red; appears below the button; clicking outside closes it (via `useEffect` + `document` click listener)

### Logout action

Calls `clearSession()` from store + closes dropdown. Does NOT navigate — user stays on whichever page they were on (seeking is public).

## Visual style

- **No header bar** — just the floating button/avatar. Map stays fully visible beneath.
- **No glassmorphism.** Button/card have solid fills.
- **Button:** `bg-[#1a5c3a] text-white rounded-full px-4 py-2 text-sm font-medium shadow-md`
- **Avatar pill:** same green bg, flex row with avatar + name + chevron
- **Dropdown card:** `bg-white border border-[#e5e5e0] rounded-xl shadow-lg`
- **Safe-area aware:** `top` offset uses `env(safe-area-inset-top, 0)` for notch phones

## Data flow

```
SessionSlice.sessionUser ──► AppHeader renders avatar pill or login button
AppHeader "Login" click   ──► props.onSignIn() ──► main.tsx setPage("signin")
AppHeader "Sair" click    ──► clearSession() ──► re-render to login button
SignInPage success         ──► setSession(token, user) ──► AppHeader re-renders to avatar
```

## Edge cases

- `displayName` null/empty → fall back to first char of `sessionUser.email`
- Very long display name → truncate with `max-w-[120px] truncate`
- Dropdown open, user clicks "Login" on a different tab → dropdown auto-closes via `clearSession` re-render
- `SignInPage` already visible → "Login" button click still calls `onSignIn()`; `main.tsx` re-sets same page (no-op)

## Files touched

| Action | File |
|--------|------|
| Create | `apps/web/src/features/auth/ui/AppHeader.tsx` |
| Modify | `apps/web/src/main.tsx` (mount `AppHeader`, pass `onSignIn`) |
