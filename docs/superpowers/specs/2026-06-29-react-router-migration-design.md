# Design: React Router v6 Migration

**Date:** 2026-06-29
**Status:** Approved
**Blocks:** `2026-06-29-app-header-auth-design.md`

## What we're building

Replace the `useState<"seek"|"report"|"signin">` page switcher in `main.tsx` with React Router v6 (`createBrowserRouter`). Routes are centralised in a dedicated `app/router.tsx` file; every page component is lazy-loaded. A `ProtectedRoute` wrapper redirects unauthenticated users to `/signin` and sends them back to their intended destination after login.

## Scope

**In:** `react-router-dom` install, `router.tsx`, `ProtectedRoute`, migrating three existing pages, removing all `setPage`/callback props.

**Out:** Nested layouts, data loaders, error boundaries per-route, scroll restoration, `<Link>` components inside pages (pages use `useNavigate` for programmatic nav only — links can be added later).

---

## Route map

| Path | Component | Protected |
|------|-----------|-----------|
| `/` | `SeekPage` | No |
| `/signin` | `SignInPage` | No |
| `/report` | `ReportPage` | Yes → redirect `/signin` |

New routes are added by appending one entry to the array in `router.tsx`. No changes elsewhere.

---

## Architecture

### `apps/web/src/app/router.tsx` (new)

Owns all route definitions. Uses `createBrowserRouter` (enables the v6 Data API for future loaders/actions). Each page is a `React.lazy()` import wrapped in a shared `<PageSuspense>` component.

```tsx
const SeekPage   = lazy(() => import("../features/seek/ui/SeekPage.js"));
const ReportPage = lazy(() => import("../features/report/ui/ReportPage.js"));
const SignInPage = lazy(() => import("../features/auth/ui/SignInPage.js"));

export const router = createBrowserRouter([
  {
    path: "/",
    element: <PageSuspense><SeekPage /></PageSuspense>,
  },
  {
    path: "/signin",
    element: <PageSuspense><SignInPage /></PageSuspense>,
  },
  {
    path: "/report",
    element: (
      <ProtectedRoute>
        <PageSuspense><ReportPage /></PageSuspense>
      </ProtectedRoute>
    ),
  },
]);
```

### `PageSuspense` (inline in `router.tsx`)

Thin wrapper reusing the fallback pattern already in `MapShell`:

```tsx
function PageSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-screen bg-surface-alt flex items-center justify-center">
          <span className="text-text-muted text-sm">Carregando…</span>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
```

### `apps/web/src/features/auth/ui/ProtectedRoute.tsx` (new)

```tsx
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated());
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}
```

`state={{ from: location }}` stores the blocked URL so `SignInPage` can redirect back after login.

### `apps/web/src/main.tsx` (modify)

Remove: `useState<Page>`, conditional page rendering, all callback props passed to pages.
Add: `RouterProvider` wrapping `QueryClientProvider`.

```tsx
root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
```

---

## Per-page changes

### `SeekPage`

- Remove `onReport` prop + its type
- FAB `onClick`: `const nav = useNavigate(); nav("/report")`
  - No auth check needed — `ProtectedRoute` handles the redirect

### `ReportPage`

- Remove `onBack` prop + its type
- Back button: `const nav = useNavigate(); nav(-1)`
  - Falls back to `/` if there's no history (direct URL access)

### `SignInPage`

- Remove `onSuccess` prop + its type
- After successful `verifyMagicCode` mutation: read `location.state?.from` and navigate there; default to `/`

```tsx
const location = useLocation();
const from = (location.state as { from?: Location })?.from?.pathname ?? "/";
// inside onSuccess callback:
navigate(from, { replace: true });
```

---

## Data flow

```
User visits /report (unauthenticated)
  → ProtectedRoute → <Navigate to="/signin" state={{ from: /report }} />
  → SignInPage (reads state.from = "/report")
  → user completes magic code
  → setSession(token, user)
  → navigate("/report", { replace: true })
  → ProtectedRoute: isAuthenticated = true → renders ReportPage
```

---

## Dependency

`react-router-dom` v6 added to `apps/web/package.json`.

Vite dev server already serves the SPA fallback via its built-in middleware. For production (nginx/Vercel/Netlify) a single redirect rule is needed:
- **Netlify/Vercel:** `/* → /index.html` (standard SPA config)
- **nginx:** `try_files $uri /index.html`

This is a deploy concern, not a code concern — out of scope for this migration.

---

## Files touched

| Action | File |
|--------|------|
| Create | `apps/web/src/app/router.tsx` |
| Create | `apps/web/src/features/auth/ui/ProtectedRoute.tsx` |
| Modify | `apps/web/src/main.tsx` |
| Modify | `apps/web/src/features/seek/ui/SeekPage.tsx` |
| Modify | `apps/web/src/features/report/ui/ReportPage.tsx` |
| Modify | `apps/web/src/features/auth/ui/SignInPage.tsx` |
| Modify | `apps/web/package.json` (add `react-router-dom`) |
