# App Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fixed floating header that shows an "Entrar" button when unauthenticated and an avatar + name + logout dropdown when authenticated, visible on every page of the app.

**Architecture:** `AppHeader` is a single `position: fixed` component that floats over all pages. It reads `sessionUser` from Zustand's `SessionSlice` and uses `useNavigate("/signin")` for login navigation. It is mounted via a `RootLayout` wrapper in `router.tsx` (a pathless parent route that renders `<AppHeader /> + <Outlet />`), which gives it router context and ensures it appears on all three routes without modifying any page component.

**Tech Stack:** React, React Router v7 (v6 API), Zustand (`useAppStore`), Tailwind CSS v4 CSS-first tokens, Jest + React Testing Library.

## Global Constraints

- All imports use `.js` extensions in import paths (Vite ESM convention)
- Portuguese copy only — UI strings in PT-BR (`"Entrar"` not `"Login"`, `"Sair"` not `"Logout"`)
- Brand colour token: `bg-brand` = `#1a5c3a`; use token, not hex literal
- No glassmorphism, no gradient slop — solid fills only
- TypeScript strict mode — no `any`, no unused variables
- Tests run with: `pnpm --filter @aonde-tem/web test`
- Typecheck: `pnpm --filter @aonde-tem/web typecheck`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/web/src/features/auth/ui/AppHeader.tsx` | Floating auth header — "Entrar" button or avatar+name+dropdown |
| Create | `apps/web/src/features/auth/ui/AppHeader.test.tsx` | Unit tests: unauthenticated state, authenticated state, logout |
| Modify | `apps/web/src/app/router.tsx` | Add pathless `RootLayout` route wrapping all three existing routes |

> **Spec deviation note:** The spec was written before the React Router migration and shows mounting `AppHeader` directly in `main.tsx`. With `RouterProvider`, `main.tsx` cannot host children alongside it. The correct approach is the RootLayout pattern — `AppHeader` moves inside the router context, which allows it to use `useNavigate`. No prop is needed (`onSignIn` from the old spec is replaced by `useNavigate("/signin")` directly inside the component).

---

### Task 1: AppHeader component + unit tests

**Files:**
- Create: `apps/web/src/features/auth/ui/AppHeader.tsx`
- Create: `apps/web/src/features/auth/ui/AppHeader.test.tsx`

**Interfaces:**
- Consumes:
  - `useAppStore((s) => s.sessionUser)` → `SessionUser | null` (type from `session.slice.ts`)
  - `useAppStore((s) => s.clearSession)` → `() => void`
  - `useNavigate()` from `react-router-dom`
- Produces: `export function AppHeader(): JSX.Element` — no props

**SessionUser shape** (from `packages/contracts/src/auth.ts`):
```ts
{
  id: string;         // UUID
  email: string;
  displayName: string | null;
  role: "user" | "admin";
}
```

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/features/auth/ui/AppHeader.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppHeader } from "./AppHeader.js";
import { useAppStore } from "../../../app/store/index.js";
import type { AppStore } from "../../../app/store/types.js";

jest.mock("../../../app/store/index.js");
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

type MockStorePartial = {
  sessionUser: AppStore["sessionUser"];
  clearSession?: jest.Mock;
};

function setupStore({ sessionUser, clearSession = jest.fn() }: MockStorePartial) {
  const store = { sessionUser, clearSession };
  mockUseAppStore.mockImplementation(
    (selector: (s: AppStore) => unknown) =>
      (selector as (s: typeof store) => unknown)(store),
  );
  return store;
}

function renderHeader() {
  return render(
    <MemoryRouter>
      <AppHeader />
    </MemoryRouter>,
  );
}

const authenticatedUser = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "user@example.com",
  displayName: "Mauricio",
  role: "user" as const,
};

describe("AppHeader — unauthenticated", () => {
  beforeEach(() => mockNavigate.mockReset());

  it("renders Entrar button when sessionUser is null", () => {
    setupStore({ sessionUser: null });
    renderHeader();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
  });

  it("navigates to /signin when Entrar is clicked", () => {
    setupStore({ sessionUser: null });
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(mockNavigate).toHaveBeenCalledWith("/signin");
  });
});

describe("AppHeader — authenticated", () => {
  beforeEach(() => mockNavigate.mockReset());

  it("renders initials from displayName (first 2 chars, uppercased)", () => {
    setupStore({ sessionUser: authenticatedUser });
    renderHeader();
    expect(screen.getByText("MA")).toBeInTheDocument();
  });

  it("falls back to first char of email when displayName is null", () => {
    setupStore({ sessionUser: { ...authenticatedUser, displayName: null } });
    renderHeader();
    expect(screen.getByText("U")).toBeInTheDocument();
  });

  it("does not show Sair before avatar is clicked", () => {
    setupStore({ sessionUser: authenticatedUser });
    renderHeader();
    expect(screen.queryByText("Sair")).not.toBeInTheDocument();
  });

  it("shows Sair dropdown after avatar pill is clicked", () => {
    setupStore({ sessionUser: authenticatedUser });
    renderHeader();
    fireEvent.click(screen.getByText("MA").closest("button")!);
    expect(screen.getByText("Sair")).toBeInTheDocument();
  });

  it("calls clearSession when Sair is clicked", () => {
    const store = setupStore({ sessionUser: authenticatedUser });
    renderHeader();
    fireEvent.click(screen.getByText("MA").closest("button")!);
    fireEvent.click(screen.getByText("Sair"));
    expect(store.clearSession).toHaveBeenCalledTimes(1);
  });

  it("hides dropdown after Sair is clicked", () => {
    setupStore({ sessionUser: authenticatedUser });
    renderHeader();
    fireEvent.click(screen.getByText("MA").closest("button")!);
    fireEvent.click(screen.getByText("Sair"));
    expect(screen.queryByText("Sair")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm --filter @aonde-tem/web test -- --testPathPattern=AppHeader
```

Expected: `Cannot find module './AppHeader.js'`

- [ ] **Step 3: Create AppHeader component**

Create `apps/web/src/features/auth/ui/AppHeader.tsx`:

```tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../../app/store/index.js";

export function AppHeader() {
  const navigate = useNavigate();
  const sessionUser = useAppStore((s) => s.sessionUser);
  const clearSession = useAppStore((s) => s.clearSession);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  if (!sessionUser) {
    return (
      <button
        className="fixed right-3 z-50 bg-brand text-white rounded-full px-4 py-2 text-sm font-medium shadow-md"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
        onClick={() => navigate("/signin")}
      >
        Entrar
      </button>
    );
  }

  const initials = sessionUser.displayName
    ? sessionUser.displayName.slice(0, 2).toUpperCase()
    : sessionUser.email.slice(0, 1).toUpperCase();

  const displayName = sessionUser.displayName ?? sessionUser.email;

  return (
    <div
      ref={wrapperRef}
      className="fixed right-3 z-50"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
    >
      <button
        className="flex items-center gap-2 bg-brand text-white rounded-full px-3 py-1.5 shadow-md"
        onClick={() => setDropdownOpen((o) => !o)}
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
      >
        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">
          {initials}
        </span>
        <span className="text-sm font-medium max-w-30 truncate">
          {displayName}
        </span>
        <svg
          className={`w-3 h-3 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 bg-white border border-border rounded-xl shadow-lg py-1 min-w-30">
          <button
            type="button"
            className="w-full px-4 py-2 text-sm text-left text-error hover:bg-surface-alt"
            onClick={() => {
              clearSession();
              setDropdownOpen(false);
            }}
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm --filter @aonde-tem/web test -- --testPathPattern=AppHeader
```

Expected: `PASS src/features/auth/ui/AppHeader.test.tsx` (6 tests passing)

- [ ] **Step 5: Run full suite to confirm no regressions**

```bash
pnpm --filter @aonde-tem/web test
```

Expected: all tests pass (8 total — 2 ProtectedRoute + 6 AppHeader).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/auth/ui/AppHeader.tsx apps/web/src/features/auth/ui/AppHeader.test.tsx
git commit -m "feat(web): add AppHeader — floating login button and avatar+logout dropdown"
```

---

### Task 2: Wire AppHeader into router.tsx via RootLayout

**Files:**
- Modify: `apps/web/src/app/router.tsx`

**Interfaces:**
- Consumes: `AppHeader` from `../features/auth/ui/AppHeader.js`
- Consumes: `Outlet` from `react-router-dom`
- Produces: updated `router` export — pathless root layout wraps all three existing routes

- [ ] **Step 1: Replace the entire content of `apps/web/src/app/router.tsx`**

```tsx
import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import { ProtectedRoute } from "../features/auth/ui/ProtectedRoute.js";
import { AppHeader } from "../features/auth/ui/AppHeader.js";

const SeekPage = lazy(() =>
  import("../features/seek/ui/SeekPage.js").then((m) => ({ default: m.SeekPage })),
);
const ReportPage = lazy(() =>
  import("../features/report/ui/ReportPage.js").then((m) => ({ default: m.ReportPage })),
);
const SignInPage = lazy(() =>
  import("../features/auth/ui/SignInPage.js").then((m) => ({ default: m.SignInPage })),
);

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

function RootLayout() {
  return (
    <>
      <AppHeader />
      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/",
        element: (
          <PageSuspense>
            <SeekPage />
          </PageSuspense>
        ),
      },
      {
        path: "/signin",
        element: (
          <PageSuspense>
            <SignInPage />
          </PageSuspense>
        ),
      },
      {
        path: "/report",
        element: (
          <ProtectedRoute>
            <PageSuspense>
              <ReportPage />
            </PageSuspense>
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @aonde-tem/web typecheck
```

Expected: zero errors.

- [ ] **Step 3: Start dev server and verify header appears on all pages**

```bash
pnpm --filter @aonde-tem/web dev
```

Check:
| URL | Expected |
|-----|----------|
| `http://localhost:5173/` | Map renders; "Entrar" pill visible top-right |
| `http://localhost:5173/signin` | Sign-in form renders; "Entrar" pill visible top-right |
| `http://localhost:5173/report` | Redirects to `/signin`; "Entrar" pill visible top-right |

Stop the dev server after verification.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/router.tsx
git commit -m "feat(web): mount AppHeader on all routes via RootLayout"
```
