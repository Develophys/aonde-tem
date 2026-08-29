# Mobile Shell & Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the PWA's floating top-corner chrome with a bottom tab bar, collapse search into a magnifier that expands with product suggestions, and add a first-run onboarding flow.

**Architecture:** A nested react-router layout route (`AppShell`) owns the tab bar, so "has a tab bar" is structure rather than a `pathname` conditional. The theme toggle and the account/sign-in pills retire from the global layout into a new Perfil screen. Two new CSS custom properties (`--bottom-nav-height`, `--bottom-nav-clearance`) anchor every floating map control to the bar, mirroring the existing `--header-inset-top` / `--header-clearance` pair.

**Tech Stack:** React 18 + Vite, react-router-dom 7, Tailwind CSS v4 (CSS-first `@theme`), Zustand (slices + `persist`), TanStack Query, Jest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-29-mobile-shell-design.md`

## Global Constraints

- **Design tokens are the source of truth.** Never hardcode a color, radius, or z-index. Use the Tailwind utilities generated from `apps/web/src/app/index.css`: `bg-brand`, `bg-surface`, `bg-surface-alt`, `border-border`, `text-text`, `text-text-muted`, `text-accent`, `text-error`, `rounded-control`, `rounded-sheet`, `rounded-full`, and `z-(--z-sticky)` / `z-(--z-dropdown)` for z-index.
- **Two-Radius Rule.** Every rectangular control uses `rounded-control` (12px) or `rounded-sheet` (16px). `rounded-full` is for pills and circles. No third radius.
- **One Accent Rule.** Only one saturated color per screen. In the tab bar that is `text-accent` on the active tab plus `bg-brand` on the raised report button.
- **Floating-Only Rule.** Shadows belong only to things covering the map. The tab bar is edge-anchored, so it takes `border-t border-border`, not a shadow. The raised `+` does cover the map and keeps `shadow-lg`.
- **Touch targets: 44×44px minimum on every button, tab, chip, and icon-only control. No exceptions.**
- **Animations:** reuse only the keyframes already in `index.css` — `animate-slide-up`, `animate-backdrop-in`, `animate-toast-in`, `animate-badge-in`, `animate-success-pop`, `animate-check-draw`. Do not invent new ones. They are already neutralized under `prefers-reduced-motion`.
- **Copy is Portuguese and verbatim from the spec.** Exact strings: `Mapa`, `Avisos`, `Perfil`, `Relatar produto`, `Começar`, `Já tenho conta`, `Continuar`, `Permitir localização`, `Agora não`, `Entrar`, `Sair`, `Em breve`.
- **TypeScript strict.** No `any`. Props interfaces use `readonly` members, matching every existing component.
- **Imports use the `.js` extension** on relative and `@/`-aliased paths (NodeNext resolution). Copy the style of neighbouring files exactly.
- **Tests:** Jest + Testing Library, `fireEvent` (not `userEvent`), explicit `jest.mock` factories rather than bare automocks — follow `ProductPicker.test.tsx` and `AppHeader.test.tsx`.
- **Every task ends green:** `pnpm --filter @aonde-tem/web lint && pnpm --filter @aonde-tem/web typecheck && pnpm --filter @aonde-tem/web test`.

---

### Task 1: Layout tokens and the BottomNav component

Builds the bar as a standalone, fully tested component. It is not wired into the router yet — Task 3 does that, once the screens it points at exist.

**Files:**
- Modify: `apps/web/src/app/index.css` (the `:root` block, after `--header-clearance`)
- Create: `apps/web/src/features/shell/ui/BottomNav.tsx`
- Test: `apps/web/src/features/shell/ui/BottomNav.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `BottomNav()` — a zero-prop component rendering `<nav aria-label="Navegação principal">`. CSS: `--bottom-nav-height`, `--bottom-nav-clearance`.

**Design notes for the implementer:**
- Four grid columns in this order: Mapa tab, Avisos tab, the raised report button, Perfil tab. The `+` sits centered in **its own column**, not dead-center on the bar — dead-center would overlap a tab's label and break the 44×44 rule.
- The three tabs are `NavLink`s, which set `aria-current="page"` themselves when active. The `+` is a plain `Link`: it is an action, not a tab, so it must never be marked as the current page.
- `/avisos` is auth-gated by the router in Task 3 (wrapped in the existing `ProtectedRoute`, which redirects to `/signin`). Do **not** put session checks in this component — the nav stays presentational.
- Icons are Feather-style strokes matching `EmptyState.tsx`: `fill="none"`, `stroke="currentColor"`, `strokeWidth={2}`, round caps and joins, `aria-hidden="true"`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/features/shell/ui/BottomNav.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BottomNav } from "./BottomNav.js";

function renderNav(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <BottomNav />
    </MemoryRouter>,
  );
}

describe("BottomNav", () => {
  it("renders the three tabs plus the report action", () => {
    renderNav();

    expect(screen.getByRole("link", { name: "Mapa" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Avisos" })).toHaveAttribute("href", "/avisos");
    expect(screen.getByRole("link", { name: "Perfil" })).toHaveAttribute("href", "/perfil");
    expect(screen.getByRole("link", { name: "Relatar produto" })).toHaveAttribute(
      "href",
      "/report",
    );
  });

  it("marks only the tab matching the current route as the current page", () => {
    renderNav("/perfil");

    expect(screen.getByRole("link", { name: "Perfil" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Mapa" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Avisos" })).not.toHaveAttribute("aria-current");
  });

  it("never marks the report action as the current page", () => {
    renderNav("/report");

    expect(screen.getByRole("link", { name: "Relatar produto" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("labels the navigation landmark", () => {
    renderNav();

    expect(screen.getByRole("navigation", { name: "Navegação principal" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @aonde-tem/web test -- BottomNav`
Expected: FAIL — `Cannot find module './BottomNav.js'`.

- [ ] **Step 3: Add the layout tokens**

In `apps/web/src/app/index.css`, inside the existing `:root` block, immediately after the `--header-clearance` declaration and its comment, add:

```css
  /* The bottom tab bar's own height, and the offset anything floating above it must
     clear. Same discipline as --header-inset-top/--header-clearance at the top of the
     screen: the bar and the chrome sitting above it read from one token, so they can't
     drift apart when the bar's height changes. env() covers the iOS home indicator. */
  --bottom-nav-height: 56px;
  --bottom-nav-clearance: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 12px);
```

- [ ] **Step 4: Write the component**

Create `apps/web/src/features/shell/ui/BottomNav.tsx`:

```tsx
import { Link, NavLink } from "react-router-dom";
import type { ReactNode } from "react";

const ICON_PROPS = {
  className: "w-6 h-6",
  fill: "none",
  viewBox: "0 0 24 24",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function MapIcon() {
  return (
    <svg {...ICON_PROPS}>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

interface TabProps {
  readonly to: string;
  readonly label: string;
  readonly children: ReactNode;
}

function Tab({ to, label, children }: TabProps) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-0.5 min-h-11 text-[11px] font-medium ${
          isActive ? "text-accent" : "text-text-muted"
        }`
      }
    >
      {children}
      <span>{label}</span>
    </NavLink>
  );
}

// Global navigation. Deliberately presentational: /avisos and /report are auth-gated by
// ProtectedRoute in the router, so the bar never branches on session state and there is
// exactly one place where "signed out means /signin" is decided.
export function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-(--z-sticky) grid grid-cols-4 items-center bg-surface border-t border-border"
      style={{
        height: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <Tab to="/" label="Mapa">
        <MapIcon />
      </Tab>
      <Tab to="/avisos" label="Avisos">
        <BellIcon />
      </Tab>
      <div className="flex items-center justify-center">
        {/* Replaces SeekPage's old FAB. Raised above the bar's top edge, so it covers the
            map — the one element here that earns a shadow under the Floating-Only Rule. */}
        <Link
          to="/report"
          aria-label="Relatar produto"
          className="-translate-y-5 bg-brand text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center"
        >
          <svg {...ICON_PROPS} className="w-7 h-7">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>
      </div>
      <Tab to="/perfil" label="Perfil">
        <UserIcon />
      </Tab>
    </nav>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @aonde-tem/web test -- BottomNav`
Expected: PASS — 4 tests.

- [ ] **Step 6: Run the full gate**

Run: `pnpm --filter @aonde-tem/web lint && pnpm --filter @aonde-tem/web typecheck && pnpm --filter @aonde-tem/web test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/index.css apps/web/src/features/shell/
git commit -m "feat(web): add the bottom navigation bar and its layout tokens"
```

---

### Task 2: Avisos and Perfil screens

The two destinations the bar points at. Perfil is the new home for the theme toggle and the sign-in/sign-out controls, so it must exist before Task 3 removes them from the global layout — otherwise those controls are unreachable for a commit.

**Files:**
- Create: `apps/web/src/shared/ui/ComingSoon.tsx`
- Create: `apps/web/src/features/notifications/ui/AvisosPage.tsx`
- Create: `apps/web/src/features/profile/ui/PerfilPage.tsx`
- Test: `apps/web/src/features/profile/ui/PerfilPage.test.tsx`

**Interfaces:**
- Consumes: `useAppStore` from `@/app/store/index.js` — `theme`, `setTheme`, `sessionUser`, `clearSession`.
- Produces: `ComingSoon({ title, description })`, `AvisosPage()`, `PerfilPage()`.

**Design notes for the implementer:**
- `EmptyState.tsx` is **not** reusable here: its copy is hardcoded about reports ("Ninguém relatou nada por aqui ainda"). `ComingSoon` is a new shared component that borrows the same visual vocabulary — an 80px `bg-surface-alt` circle with a muted stroke icon and `animate-badge-in` — with the copy passed in.
- Perfil shows **no** avatar or name header in this plan. Those arrive with the separate Watchlist/Profile spec, along with the stat columns and the real report list.
- The theme control is a labeled row with a switch, not the old icon-only pill. `ThemeToggle.tsx` is `fixed`-positioned and cannot be reused inline; Task 3 deletes it.
- Both pages need `pb-(--bottom-nav-clearance)` on their scroll container so the bar never covers the last row.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/features/profile/ui/PerfilPage.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PerfilPage } from "./PerfilPage.js";
import { useAppStore } from "@/app/store/index.js";
import type { AppStore } from "@/app/store/types.js";

jest.mock("@/app/store/index.js");
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const authenticatedUser = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "user@example.com",
  displayName: "Mauricio",
  role: "user" as const,
};

function setupStore(overrides: {
  theme?: "light" | "dark";
  sessionUser?: AppStore["sessionUser"];
}) {
  const store = {
    theme: overrides.theme ?? "light",
    setTheme: jest.fn(),
    sessionUser: overrides.sessionUser ?? null,
    clearSession: jest.fn(),
  };
  mockUseAppStore.mockImplementation((selector: (s: AppStore) => unknown) =>
    selector(store as unknown as AppStore),
  );
  return store;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <PerfilPage />
    </MemoryRouter>,
  );
}

describe("PerfilPage — theme control", () => {
  it("switches to dark mode when toggled from light", () => {
    const store = setupStore({ theme: "light" });
    renderPage();

    fireEvent.click(screen.getByRole("switch", { name: "Modo escuro" }));

    expect(store.setTheme).toHaveBeenCalledWith("dark");
  });

  it("switches back to light mode when toggled from dark", () => {
    const store = setupStore({ theme: "dark" });
    renderPage();

    const toggle = screen.getByRole("switch", { name: "Modo escuro" });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    fireEvent.click(toggle);

    expect(store.setTheme).toHaveBeenCalledWith("light");
  });
});

describe("PerfilPage — session controls", () => {
  it("offers sign-in when there is no session", () => {
    setupStore({ sessionUser: null });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(mockNavigate).toHaveBeenCalledWith("/signin");
    expect(screen.queryByRole("button", { name: "Sair" })).not.toBeInTheDocument();
  });

  it("offers sign-out and shows the account e-mail when signed in", () => {
    const store = setupStore({ sessionUser: authenticatedUser });
    renderPage();

    expect(screen.getByText("user@example.com")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sair" }));

    expect(store.clearSession).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Entrar" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @aonde-tem/web test -- PerfilPage`
Expected: FAIL — `Cannot find module './PerfilPage.js'`.

- [ ] **Step 3: Write the shared ComingSoon component**

Create `apps/web/src/shared/ui/ComingSoon.tsx`:

```tsx
interface Props {
  readonly title: string;
  readonly description: string;
}

// Placeholder panel for routes whose data layer has not been built yet. Shares
// EmptyState's badge vocabulary (80px surface-alt circle, muted stroke icon,
// animate-badge-in) but takes its copy as props — EmptyState's own copy is
// hardcoded about reports and cannot be reused here.
export function ComingSoon({ title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="w-20 h-20 rounded-full bg-surface-alt flex items-center justify-center mb-4 animate-badge-in">
        <svg
          className="w-9 h-9 text-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 14" />
        </svg>
      </div>
      <p className="text-text font-semibold text-base mb-1">{title}</p>
      <p className="text-text-muted text-sm">{description}</p>
    </div>
  );
}
```

- [ ] **Step 4: Write the Avisos page**

Create `apps/web/src/features/notifications/ui/AvisosPage.tsx`:

```tsx
import { ComingSoon } from "@/shared/ui/ComingSoon.js";

// Placeholder for Epic E11 (Notifications & Watchlist). The route exists so the tab bar
// is complete and E11 has a slot to land in; the Watch / PushSubscription / Notification
// entities in docs/specs/NOTIFICATIONS.en.md do not exist yet, so there is nothing to fetch.
export function AvisosPage() {
  return (
    <div
      className="w-full min-h-screen bg-surface"
      style={{ paddingBottom: "var(--bottom-nav-clearance)" }}
    >
      <header className="px-4 pt-4 pb-2" style={{ paddingTop: "var(--header-inset-top)" }}>
        <h1 className="text-text text-lg font-semibold">Avisos</h1>
      </header>
      <ComingSoon
        title="Em breve"
        description="Aqui você vai acompanhar itens e receber um aviso quando alguém relatar um deles perto de você."
      />
    </div>
  );
}
```

- [ ] **Step 5: Write the Perfil page**

Create `apps/web/src/features/profile/ui/PerfilPage.tsx`:

```tsx
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/app/store/index.js";
import { ComingSoon } from "@/shared/ui/ComingSoon.js";

function ThemeRow() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const isDark = theme === "dark";

  return (
    <div className="flex items-center justify-between px-4 min-h-14">
      <span className="text-text text-base">Modo escuro</span>
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Modo escuro"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={`relative w-12 h-7 rounded-full transition-colors ${
          isDark ? "bg-brand" : "bg-surface-alt border border-border"
        }`}
      >
        <span
          className={`absolute top-1 w-5 h-5 rounded-full bg-surface shadow-sm transition-transform ${
            isDark ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function SessionRow() {
  const navigate = useNavigate();
  const sessionUser = useAppStore((s) => s.sessionUser);
  const clearSession = useAppStore((s) => s.clearSession);

  if (!sessionUser) {
    return (
      <div className="px-4 py-4">
        <button
          type="button"
          onClick={() => navigate("/signin")}
          className="w-full bg-brand text-white font-semibold py-3 rounded-full min-h-11"
        >
          Entrar
        </button>
        <p className="text-text-muted text-sm text-center mt-2">
          Entre para relatar e acompanhar itens.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <p className="text-text-muted text-sm mb-3 truncate">{sessionUser.email}</p>
      <button
        type="button"
        onClick={() => clearSession()}
        className="w-full text-error font-semibold py-3 rounded-full border border-border min-h-11"
      >
        Sair
      </button>
    </div>
  );
}

// New home for the theme toggle and the account controls, which used to live as fixed
// pills in the map's top corners (ThemeToggle / AppHeader). The avatar header, the stat
// columns and the real "meus relatos" list belong to the separate Watchlist/Profile spec.
export function PerfilPage() {
  return (
    <div
      className="w-full min-h-screen bg-surface"
      style={{ paddingBottom: "var(--bottom-nav-clearance)" }}
    >
      <header className="px-4 pt-4 pb-2" style={{ paddingTop: "var(--header-inset-top)" }}>
        <h1 className="text-text text-lg font-semibold">Perfil</h1>
      </header>

      <section aria-labelledby="perfil-ajustes" className="border-t border-border py-2">
        <h2 id="perfil-ajustes" className="px-4 py-2 text-text-muted text-xs font-semibold uppercase">
          Ajustes
        </h2>
        <ThemeRow />
        <SessionRow />
      </section>

      <section aria-labelledby="perfil-relatos" className="border-t border-border pt-2">
        <h2 id="perfil-relatos" className="px-4 py-2 text-text-muted text-xs font-semibold uppercase">
          Meus relatos
        </h2>
        <ComingSoon
          title="Em breve"
          description="Seus relatos ativos e suas estatísticas aparecem aqui."
        />
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter @aonde-tem/web test -- PerfilPage`
Expected: PASS — 4 tests.

- [ ] **Step 7: Run the full gate**

Run: `pnpm --filter @aonde-tem/web lint && pnpm --filter @aonde-tem/web typecheck && pnpm --filter @aonde-tem/web test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/shared/ui/ComingSoon.tsx apps/web/src/features/notifications/ apps/web/src/features/profile/
git commit -m "feat(web): add the Avisos and Perfil screens"
```

---

### Task 3: AppShell layout route, and retiring the floating chrome

Wires the bar into the router and deletes the two components whose contents moved into Perfil.

**Files:**
- Create: `apps/web/src/features/shell/ui/AppShell.tsx`
- Modify: `apps/web/src/app/router.tsx`
- Delete: `apps/web/src/features/auth/ui/AppHeader.tsx`
- Delete: `apps/web/src/features/auth/ui/AppHeader.test.tsx`
- Delete: `apps/web/src/shared/ui/ThemeToggle.tsx`

**Interfaces:**
- Consumes: `BottomNav()` (Task 1); `AvisosPage()`, `PerfilPage()` (Task 2); the existing `ProtectedRoute`, `PageSuspense`, `RootLayout`.
- Produces: `AppShell()` — a zero-prop layout-route element rendering `<Outlet />` plus `<BottomNav />`.

**Design notes for the implementer:**
- `AppHeader` and `ThemeToggle` contain nothing but the theme pill, the account chip with its "Sair" menu, and the "Entrar" pill — all now in Perfil. They are deleted, not emptied. `ProtectedRoute` stays exactly as it is.
- `/avisos` goes inside `ProtectedRoute`, which already redirects to `/signin` with `state.from`. That is what makes the signed-out behaviour work without any session logic in `BottomNav`.
- `/perfil` is **not** protected: a signed-out visitor must reach it to change the theme or sign in.
- `/onboarding` is added in Task 6. Do not add it here.

- [ ] **Step 1: Write the AppShell component**

Create `apps/web/src/features/shell/ui/AppShell.tsx`:

```tsx
import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav.js";

// Layout route for the tabbed part of the app. Routes nested under it get the bottom
// bar; routes outside it (onboarding, auth, the report flow) do not — so "has a tab bar"
// is a structural fact about the route tree rather than a pathname check every new route
// has to remember to update.
export function AppShell() {
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
}
```

- [ ] **Step 2: Rewire the router**

In `apps/web/src/app/router.tsx`:

Remove these three imports:

```tsx
import { AppHeader } from "../features/auth/ui/AppHeader.js";
import { ThemeToggle } from "../shared/ui/ThemeToggle.js";
```

(`ProtectedRoute`, `OfflineBanner`, `ToastViewport` and `useThemeSync` all stay.)

Add:

```tsx
import { AppShell } from "../features/shell/ui/AppShell.js";
```

Add the two lazy imports next to the existing ones:

```tsx
const AvisosPage = lazy(() =>
  import("../features/notifications/ui/AvisosPage.js").then((m) => ({ default: m.AvisosPage })),
);
const PerfilPage = lazy(() =>
  import("../features/profile/ui/PerfilPage.js").then((m) => ({ default: m.PerfilPage })),
);
```

Replace the body of `RootLayout` with:

```tsx
function RootLayout() {
  useThemeSync();
  return (
    <>
      <GoogleTokenCapture />
      <OfflineBanner />
      <Outlet />
      <ToastViewport />
    </>
  );
}
```

Replace the `children` array of the root route with:

```tsx
    children: [
      {
        element: <AppShell />,
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
            path: "/avisos",
            element: (
              <ProtectedRoute>
                <PageSuspense>
                  <AvisosPage />
                </PageSuspense>
              </ProtectedRoute>
            ),
          },
          {
            path: "/perfil",
            element: (
              <PageSuspense>
                <PerfilPage />
              </PageSuspense>
            ),
          },
        ],
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
        path: "/signup",
        element: (
          <PageSuspense>
            <SignUpPage />
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
```

- [ ] **Step 3: Delete the retired components**

```bash
git rm apps/web/src/features/auth/ui/AppHeader.tsx apps/web/src/features/auth/ui/AppHeader.test.tsx apps/web/src/shared/ui/ThemeToggle.tsx
```

- [ ] **Step 4: Verify nothing still references them**

Run: `grep -rn "AppHeader\|ThemeToggle" apps/web/src`
Expected: no output. If anything matches, remove that reference before continuing.

- [ ] **Step 5: Run the full gate**

Run: `pnpm --filter @aonde-tem/web lint && pnpm --filter @aonde-tem/web typecheck && pnpm --filter @aonde-tem/web test`
Expected: PASS. The `AppHeader` suite is gone; every other suite still passes.

- [ ] **Step 6: Commit**

```bash
git add -A apps/web/src
git commit -m "feat(web): route the tabbed screens through AppShell and retire the floating chrome"
```

---

### Task 4: Adapt the map's floating chrome to the bar

`SeekPage` still paints a FAB that the bar has replaced, and pins three floating elements to hardcoded bottom offsets that the bar now covers.

**Files:**
- Modify: `apps/web/src/features/seek/ui/SeekPage.tsx`
- Test: `apps/web/src/features/seek/ui/SeekPage.test.tsx` (add a case)

**Interfaces:**
- Consumes: `--bottom-nav-clearance` (Task 1); `BottomNav`'s report link (Task 1) now owns the "relatar" action.
- Produces: no new exports.

**Design notes for the implementer:**
- Deleting the FAB leaves `useNavigate` unused in `SeekPage`. Remove both the `navigate` constant and the `useNavigate` import, or lint will fail.
- `bottom-6` on the radius pill and `bottom-20` on the error card and the empty state all become `bottom-(--bottom-nav-clearance)`. That Tailwind v4 shorthand resolves to `bottom: var(--bottom-nav-clearance)`, the same form as the `z-(--z-sticky)` already used across the codebase.
- The `SeekPage.test.tsx` mock of `react-router-dom` supplies `useNavigate`; leave that mock in place, since removing it would touch unrelated setup. Only add the new assertion.

- [ ] **Step 1: Write the failing test**

In `apps/web/src/features/seek/ui/SeekPage.test.tsx`, append this suite at the end of the file:

```tsx
describe("SeekPage — report action", () => {
  it("no longer renders its own report FAB, since BottomNav owns that action", () => {
    setupGeolocation({ coords: { lat: -23.5, lng: -46.6, accuracy: 10 }, denied: false, loading: false });
    setup();

    expect(screen.queryByRole("button", { name: "Relatar produto" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @aonde-tem/web test -- SeekPage`
Expected: FAIL — the FAB is still found.

- [ ] **Step 3: Delete the FAB**

In `apps/web/src/features/seek/ui/SeekPage.tsx`, delete this whole block (currently the last element before the closing `</div>`):

```tsx
      {/* FAB — report discovery */}
      <button
        type="button"
        className="absolute bottom-6 right-4 z-10 bg-brand text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl"
        aria-label="Relatar produto"
        onClick={() => navigate("/report")}
      >
        +
      </button>
```

Then delete the now-unused navigation wiring — the import line:

```tsx
import { useNavigate } from "react-router-dom";
```

and, inside the component, the line:

```tsx
  const navigate = useNavigate();
```

- [ ] **Step 4: Re-anchor the three floating elements**

Still in `SeekPage.tsx`, make these three substitutions:

The fetch-error card:

```tsx
        <div className="absolute bottom-20 left-0 right-0 z-10 px-6">
```

becomes

```tsx
        <div className="absolute bottom-(--bottom-nav-clearance) left-0 right-0 z-10 px-6">
```

The empty state:

```tsx
        <div className="absolute bottom-20 left-0 right-0 z-10">
```

becomes

```tsx
        <div className="absolute bottom-(--bottom-nav-clearance) left-0 right-0 z-10">
```

The radius pill, whose comment also needs correcting now that the FAB is gone:

```tsx
      {/* Radius slider — bottom-left, above FAB */}
      {!selectedPlaceId && (
        <div className="absolute bottom-6 left-4 z-10 bg-surface/95 rounded-full px-4 py-2 shadow-sm border border-border flex items-center gap-2.5">
```

becomes

```tsx
      {/* Radius slider — bottom-left, clearing the bottom nav */}
      {!selectedPlaceId && (
        <div className="absolute bottom-(--bottom-nav-clearance) left-4 z-10 bg-surface/95 rounded-full px-4 py-2 shadow-sm border border-border flex items-center gap-2.5">
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @aonde-tem/web test -- SeekPage`
Expected: PASS — the existing suites plus the new one.

- [ ] **Step 6: Run the full gate**

Run: `pnpm --filter @aonde-tem/web lint && pnpm --filter @aonde-tem/web typecheck && pnpm --filter @aonde-tem/web test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/seek/ui/SeekPage.tsx apps/web/src/features/seek/ui/SeekPage.test.tsx
git commit -m "feat(web): anchor the map chrome to the bottom nav and drop the report FAB"
```

---

### Task 5: Collapsible search with product suggestions

Two changes that travel together: `useProductSearch` moves to a slice both consumers can import, and `SearchBar` gains its collapsed state plus a suggestion dropdown.

**Files:**
- Create: `apps/web/src/features/product/api/product-autocomplete.api.ts` (moved)
- Delete: `apps/web/src/features/report/api/product-autocomplete.api.ts`
- Modify: `apps/web/src/features/report/ui/ProductPicker.tsx` (import path)
- Modify: `apps/web/src/features/report/ui/ProductPicker.test.tsx` (mock path)
- Modify: `apps/web/src/features/seek/ui/SearchBar.tsx`
- Test: `apps/web/src/features/seek/ui/SearchBar.test.tsx`

**Interfaces:**
- Consumes: `useProductSearch(query: string)` → `{ data?: { results: { id: string; name: string }[] } }`, debounced 300ms internally, disabled below 2 characters.
- Produces: `SearchBar({ onSearch, placeholder? })` — the prop contract is unchanged, so `SeekPage` needs no edit.

**Design notes for the implementer:**
- Moving the hook is a pure relocation: the file's contents do not change, only its path. `seek` importing from `features/report/api/` would be a cross-slice dependency; `features/product/api/` is a slice both may consume.
- Collapse rules, exactly: Escape closes the dropdown when it is open, and collapses the bar when it is not — the standard two-stage combobox behaviour that `ProductPicker` already uses. The `×` button clears the query and collapses in one press. Choosing a suggestion closes only the dropdown and keeps the bar expanded with the term in it, so the active filter is always visible and one press from being cleared.
- Focus discipline mirrors `BottomSheet`: focus moves into the input on expand and back to the magnifier button on collapse. Because the button does not exist in the DOM while expanded, the return focus has to happen in an effect after the re-render — a ref flag, not a call inside the collapse handler.
- The outside-click listener uses `mousedown` on `document`, and options select on `onMouseDown` rather than `onClick`. This is not stylistic: blur fires before `onClick` would register, which is the race `ProductPicker.tsx` documents.
- Keep the existing debounced `onSearch` behaviour untouched — suggestions are additive, not a replacement for typing.

- [ ] **Step 1: Move the autocomplete hook**

```bash
mkdir -p apps/web/src/features/product/api
git mv apps/web/src/features/report/api/product-autocomplete.api.ts apps/web/src/features/product/api/product-autocomplete.api.ts
```

In `apps/web/src/features/report/ui/ProductPicker.tsx`, change:

```tsx
import { useProductSearch } from "../api/product-autocomplete.api.js";
```

to:

```tsx
import { useProductSearch } from "@/features/product/api/product-autocomplete.api.js";
```

In `apps/web/src/features/report/ui/ProductPicker.test.tsx`, change the import and the `jest.mock` path the same way — both currently read `"../api/product-autocomplete.api.js"` and must become `"@/features/product/api/product-autocomplete.api.js"`.

- [ ] **Step 2: Verify the move did not break anything**

Run: `pnpm --filter @aonde-tem/web test -- ProductPicker`
Expected: PASS — the existing suite, unchanged.

- [ ] **Step 3: Write the failing test**

Create `apps/web/src/features/seek/ui/SearchBar.test.tsx`:

```tsx
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SearchBar } from "./SearchBar.js";
import { useProductSearch } from "@/features/product/api/product-autocomplete.api.js";

jest.mock("@/features/product/api/product-autocomplete.api.js", () => ({
  useProductSearch: jest.fn(),
}));
const mockUseProductSearch = useProductSearch as jest.MockedFunction<typeof useProductSearch>;

function setupSuggestions(results: { id: string; name: string }[]) {
  mockUseProductSearch.mockReturnValue({ data: { results } } as unknown as ReturnType<
    typeof useProductSearch
  >);
}

const SUGGESTIONS = [
  { id: "p1", name: "Arroz 5kg" },
  { id: "p2", name: "Arroz integral 1kg" },
];

function renderBar(onSearch = jest.fn()) {
  render(<SearchBar onSearch={onSearch} />);
  return onSearch;
}

function expand() {
  fireEvent.click(screen.getByRole("button", { name: "Buscar produto" }));
}

describe("SearchBar — collapsing", () => {
  beforeEach(() => setupSuggestions([]));

  it("starts collapsed as a magnifier button with no input", () => {
    renderBar();

    expect(screen.getByRole("button", { name: "Buscar produto" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("expands into a focused input when the magnifier is pressed", () => {
    renderBar();
    expand();

    const input = screen.getByRole("combobox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it("collapses on Escape and returns focus to the magnifier", () => {
    renderBar();
    expand();

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });

    const trigger = screen.getByRole("button", { name: "Buscar produto" });
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("clears the query when it collapses", () => {
    renderBar();
    expand();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "arroz" } });
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });

    expand();
    expect(screen.getByRole("combobox")).toHaveValue("");
  });
});

describe("SearchBar — suggestions", () => {
  it("lists matching products once there is a query", () => {
    setupSuggestions(SUGGESTIONS);
    renderBar();
    expand();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "arroz" } });

    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true");
  });

  it("fills the input from a chosen suggestion and keeps the bar expanded", () => {
    setupSuggestions(SUGGESTIONS);
    renderBar();
    expand();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "arroz" } });

    fireEvent.mouseDown(screen.getAllByRole("option")[0]!);

    expect(screen.getByRole("combobox")).toHaveValue("Arroz 5kg");
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("closes only the dropdown on the first Escape, keeping the bar expanded", () => {
    setupSuggestions(SUGGESTIONS);
    renderBar();
    expand();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "arroz" } });

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("selects the highlighted suggestion with the keyboard", () => {
    setupSuggestions(SUGGESTIONS);
    renderBar();
    expand();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "arroz" } });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByRole("combobox")).toHaveValue("Arroz integral 1kg");
  });
});

describe("SearchBar — filtering", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setupSuggestions([]);
  });
  afterEach(() => jest.useRealTimers());

  it("reports the debounced query to its parent", () => {
    const onSearch = renderBar();
    expand();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "  arroz  " } });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(onSearch).toHaveBeenCalledWith("arroz");
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm --filter @aonde-tem/web test -- SearchBar`
Expected: FAIL — no magnifier button; `SearchBar` still renders a bare `type="search"` input.

- [ ] **Step 5: Rewrite SearchBar**

Replace the entire contents of `apps/web/src/features/seek/ui/SearchBar.tsx` with:

```tsx
import { useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import { useProductSearch } from "@/features/product/api/product-autocomplete.api.js";

interface Props {
  readonly onSearch: (query: string) => void;
  readonly placeholder?: string;
}

const LISTBOX_ID = "search-suggestions-listbox";

function optionId(productId: string): string {
  return `search-suggestion-${productId}`;
}

// Collapsed by default so the map keeps its full canvas: the top-left corner holds a
// single 44x44 affordance instead of a permanent full-width bar. Expanding reveals the
// same debounced live filter as before, now with a product-suggestion dropdown fed by
// the shared autocomplete hook — suggestions are additive, typing alone still works.
export function SearchBar({ onSearch, placeholder = "Buscar produto…" }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [debouncedValue] = useDebounce(value, 300);

  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // The magnifier is unmounted while expanded, so focus can only return to it after the
  // collapse has rendered — hence a flag read in an effect, not a call in the handler.
  const returnFocusRef = useRef(false);

  const { data } = useProductSearch(value);
  const results = data?.results ?? [];
  const dropdownOpen = showDropdown && results.length > 0;

  useEffect(() => {
    onSearch(debouncedValue.trim());
  }, [debouncedValue, onSearch]);

  useEffect(() => {
    if (expanded) {
      inputRef.current?.focus();
      return;
    }
    if (returnFocusRef.current) {
      triggerRef.current?.focus();
      returnFocusRef.current = false;
    }
  }, [expanded]);

  // Same outside-click discipline as ProductPicker: a document-level mousedown listener
  // rather than onBlur, because blur fires before an option's own mousedown can register.
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  function collapse() {
    returnFocusRef.current = true;
    setValue("");
    setShowDropdown(false);
    setHighlightedIndex(-1);
    setExpanded(false);
  }

  function selectSuggestion(product: { id: string; name: string }) {
    setValue(product.name);
    setShowDropdown(false);
    setHighlightedIndex(-1);
  }

  function handleChange(next: string) {
    setValue(next);
    setShowDropdown(true);
    setHighlightedIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      // Two-stage: the dropdown goes first, the bar only on a second press.
      if (dropdownOpen) {
        setShowDropdown(false);
        setHighlightedIndex(-1);
      } else {
        collapse();
      }
      return;
    }
    if (!dropdownOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      const option = results[highlightedIndex];
      if (option) selectSuggestion(option);
    }
  }

  if (!expanded) {
    return (
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setExpanded(true)}
        aria-label="Buscar produto"
        className="bg-surface border border-border text-text-muted rounded-full w-11 h-11 flex items-center justify-center shadow-md"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="6" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>
    );
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="flex items-center gap-2 bg-surface rounded-full shadow px-4 py-3 border border-border">
        <svg
          className="w-5 h-5 text-text-muted shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="6" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={dropdownOpen}
          aria-controls={LISTBOX_ID}
          aria-activedescendant={
            dropdownOpen && highlightedIndex >= 0
              ? optionId(results[highlightedIndex]!.id)
              : undefined
          }
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-text placeholder:text-text-muted outline-none text-base min-w-0"
          autoComplete="off"
          aria-label={placeholder}
        />
        <button
          type="button"
          onClick={collapse}
          className="p-3 -mr-3 text-text-muted text-xl leading-none flex items-center justify-center min-w-11 min-h-11"
          aria-label="Fechar busca"
        >
          ×
        </button>
      </div>

      {dropdownOpen && (
        <ul
          id={LISTBOX_ID}
          role="listbox"
          className="absolute z-(--z-dropdown) left-0 right-0 top-full mt-1 bg-surface border border-border rounded-control shadow-lg overflow-hidden"
        >
          {results.map((p, i) => (
            <li
              key={p.id}
              id={optionId(p.id)}
              role="option"
              aria-selected={i === highlightedIndex}
              onMouseDown={() => selectSuggestion(p)}
              className={`w-full text-left px-4 py-3 min-h-11 text-text text-sm cursor-pointer ${
                i === highlightedIndex ? "bg-surface-alt" : ""
              }`}
            >
              {p.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter @aonde-tem/web test -- SearchBar`
Expected: PASS — 10 tests.

- [ ] **Step 7: Run the full gate**

Run: `pnpm --filter @aonde-tem/web lint && pnpm --filter @aonde-tem/web typecheck && pnpm --filter @aonde-tem/web test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A apps/web/src
git commit -m "feat(web): collapse the search bar into a magnifier with product suggestions"
```

---

### Task 6: Onboarding slice, screens, and route

Three screens plus the persisted flag they set. The redirect that sends first-time visitors here is Task 7 — this task's deliverable is a route you can visit directly.

**Files:**
- Create: `apps/web/src/features/onboarding/model/onboarding.slice.ts`
- Create: `apps/web/src/features/onboarding/ui/OnboardingPage.tsx`
- Test: `apps/web/src/features/onboarding/ui/OnboardingPage.test.tsx`
- Modify: `apps/web/src/app/store/types.ts`
- Modify: `apps/web/src/app/store/index.ts`
- Modify: `apps/web/src/app/router.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `OnboardingSlice` — `{ hasSeenOnboarding: boolean; completeOnboarding: () => void }`
  - `createOnboardingSlice: SliceCreator<OnboardingSlice>`
  - `OnboardingPage()` — a zero-prop route element.

**Design notes for the implementer:**
- `completeOnboarding()` is called on **both** finishing and skipping. Onboarding must never repeat.
- The welcome screen is the app's only full-bleed `bg-brand` screen. That is deliberate and reserved for this first impression — do not reuse the treatment anywhere else.
- **Do not use the `useGeolocation` hook here.** It requests position on mount, which would fire the browser's permission prompt the moment onboarding opens rather than on the tap. Screen 3 calls `navigator.geolocation.getCurrentPosition` directly from its click handler, which is what attributes the prompt to a real user gesture. `SeekPage` then picks the granted permission up through its own `useGeolocation` on the very next screen.
- Both outcomes of the location ask finish onboarding: a refusal is already handled by the map's São Paulo fallback and its existing banner.
- Copy is verbatim from the spec. Do not paraphrase.
- No bottom nav on this route — it lives outside `AppShell`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/features/onboarding/ui/OnboardingPage.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OnboardingPage } from "./OnboardingPage.js";
import { useAppStore } from "@/app/store/index.js";
import type { AppStore } from "@/app/store/types.js";

jest.mock("@/app/store/index.js");
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

function setupStore() {
  const store = { completeOnboarding: jest.fn() };
  mockUseAppStore.mockImplementation((selector: (s: AppStore) => unknown) =>
    selector(store as unknown as AppStore),
  );
  return store;
}

function renderPage() {
  const store = setupStore();
  render(
    <MemoryRouter>
      <OnboardingPage />
    </MemoryRouter>,
  );
  return store;
}

function advanceToLocationStep() {
  fireEvent.click(screen.getByRole("button", { name: "Começar" }));
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
}

describe("OnboardingPage — steps", () => {
  beforeEach(() => mockNavigate.mockReset());

  it("opens on the welcome screen", () => {
    renderPage();

    expect(screen.getByText("Aonde Tem")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Começar" })).toBeInTheDocument();
  });

  it("advances through the value prop to the location ask", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    expect(screen.getByText("Relatos da comunidade")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Ative sua localização")).toBeInTheDocument();
  });

  it("reports progress to assistive technology", () => {
    renderPage();

    expect(screen.getByText("Passo 1 de 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    expect(screen.getByText("Passo 2 de 3")).toBeInTheDocument();
  });
});

describe("OnboardingPage — completion", () => {
  beforeEach(() => mockNavigate.mockReset());

  it("finishes and goes to the map after allowing location", () => {
    const store = renderPage();
    advanceToLocationStep();

    fireEvent.click(screen.getByRole("button", { name: "Permitir localização" }));

    expect(store.completeOnboarding).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("finishes and goes to the map when location is skipped", () => {
    const store = renderPage();
    advanceToLocationStep();

    fireEvent.click(screen.getByRole("button", { name: "Agora não" }));

    expect(store.completeOnboarding).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("finishes before sending an existing user to sign in", () => {
    const store = renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Já tenho conta" }));

    expect(store.completeOnboarding).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/signin", { replace: true });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @aonde-tem/web test -- OnboardingPage`
Expected: FAIL — `Cannot find module './OnboardingPage.js'`.

- [ ] **Step 3: Write the slice**

Create `apps/web/src/features/onboarding/model/onboarding.slice.ts`:

```ts
import type { SliceCreator } from "@/app/store/types.js";

export interface OnboardingSlice {
  hasSeenOnboarding: boolean;
  completeOnboarding: () => void;
}

// Persisted (see app/store/index.ts partialize) so the first-run flow shows exactly once
// per device. Set on skipping as well as finishing — a visitor who declines location must
// not be shown the intro again on their next visit.
export const createOnboardingSlice: SliceCreator<OnboardingSlice> = (set) => ({
  hasSeenOnboarding: false,
  completeOnboarding: () =>
    set({ hasSeenOnboarding: true }, undefined, "onboarding/completeOnboarding"),
});
```

- [ ] **Step 4: Register the slice in the store**

In `apps/web/src/app/store/types.ts`, add the import:

```ts
import type { OnboardingSlice } from "../../features/onboarding/model/onboarding.slice.js";
```

and extend the union:

```ts
export type AppStore = MapSlice &
  SessionSlice &
  ReportDraftSlice &
  OnboardingSlice &
  UiSlice &
  ToastSlice;
```

In `apps/web/src/app/store/index.ts`, add the import:

```ts
import { createOnboardingSlice } from "../../features/onboarding/model/onboarding.slice.js";
```

add it to the composed state:

```ts
        ...createOnboardingSlice(...a),
```

and add the flag to `partialize`:

```ts
          hasSeenOnboarding: s.hasSeenOnboarding,
```

- [ ] **Step 5: Write the onboarding screens**

Create `apps/web/src/features/onboarding/ui/OnboardingPage.tsx`:

```tsx
import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/app/store/index.js";

const TOTAL_STEPS = 3;

function Dots({ step }: { readonly step: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === step ? "w-5 bg-brand" : "w-1.5 bg-border"
          }`}
        />
      ))}
    </div>
  );
}

function BadgeIcon({ children }: { readonly children: ReactNode }) {
  return (
    <div className="w-20 h-20 rounded-full bg-surface-alt flex items-center justify-center mb-6 animate-badge-in">
      <svg
        className="w-9 h-9 text-text-muted"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </div>
  );
}

// First-run intro, gated by hasSeenOnboarding. Lives outside AppShell, so it has no tab
// bar: it is a one-time flow, not a destination.
export function OnboardingPage() {
  const navigate = useNavigate();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);

  function finish(to: string) {
    completeOnboarding();
    navigate(to, { replace: true });
  }

  // Asking from inside the tap handler is what attributes the browser's permission
  // prompt to a real user gesture. Either outcome finishes onboarding — a refusal is
  // already handled by the map's São Paulo fallback and its banner.
  function askForLocation() {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => undefined,
        () => undefined,
      );
    }
    finish("/");
  }

  return (
    <div className="w-full min-h-screen flex flex-col">
      <p className="sr-only" aria-live="polite">{`Passo ${step + 1} de ${TOTAL_STEPS}`}</p>

      {step === 0 && (
        <div className="flex-1 flex flex-col bg-brand text-white px-6 pt-16 pb-8">
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-6 animate-badge-in">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">Aonde Tem</h1>
            <p className="text-white/85 text-base">
              Ache onde um produto está disponível agora, e por quanto.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Dots step={step} />
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full bg-surface text-brand font-semibold py-3 rounded-full min-h-11"
            >
              Começar
            </button>
            <button
              type="button"
              onClick={() => finish("/signin")}
              className="text-white/85 text-sm font-medium min-h-11 px-4"
            >
              Já tenho conta
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex-1 flex flex-col bg-surface px-6 pt-16 pb-8">
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <BadgeIcon>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </BadgeIcon>
            <h1 className="text-text text-xl font-bold mb-2">Relatos da comunidade</h1>
            <p className="text-text-muted text-base">
              Quem viu, reporta em segundos. Relatos antigos somem — você só vê o que está
              fresco.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Dots step={step} />
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full bg-brand text-white font-semibold py-3 rounded-full min-h-11"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 flex flex-col bg-surface px-6 pt-16 pb-8">
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <BadgeIcon>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </BadgeIcon>
            <h1 className="text-text text-xl font-bold mb-2">Ative sua localização</h1>
            <p className="text-text-muted text-base">
              Para mostrar relatos perto de você e preencher o local automaticamente ao
              relatar.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Dots step={step} />
            <button
              type="button"
              onClick={askForLocation}
              className="w-full bg-brand text-white font-semibold py-3 rounded-full min-h-11"
            >
              Permitir localização
            </button>
            <button
              type="button"
              onClick={() => finish("/")}
              className="text-text-muted text-sm font-medium min-h-11 px-4"
            >
              Agora não
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Add the route**

In `apps/web/src/app/router.tsx`, add the lazy import beside the others:

```tsx
const OnboardingPage = lazy(() =>
  import("../features/onboarding/ui/OnboardingPage.js").then((m) => ({
    default: m.OnboardingPage,
  })),
);
```

and add this route to the root route's `children`, as a sibling of `/signin` (outside
`AppShell`, so it has no tab bar):

```tsx
      {
        path: "/onboarding",
        element: (
          <PageSuspense>
            <OnboardingPage />
          </PageSuspense>
        ),
      },
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm --filter @aonde-tem/web test -- OnboardingPage`
Expected: PASS — 6 tests.

- [ ] **Step 8: Run the full gate**

Run: `pnpm --filter @aonde-tem/web lint && pnpm --filter @aonde-tem/web typecheck && pnpm --filter @aonde-tem/web test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A apps/web/src
git commit -m "feat(web): add the first-run onboarding flow"
```

---

### Task 7: First-run gate

Sends a visitor with no `hasSeenOnboarding` flag to the intro — but only when they land on the map, so a shared link or a push notification is never hijacked.

**Files:**
- Create: `apps/web/src/features/onboarding/ui/OnboardingGate.tsx`
- Test: `apps/web/src/features/onboarding/ui/OnboardingGate.test.tsx`
- Modify: `apps/web/src/app/router.tsx`

**Interfaces:**
- Consumes: `hasSeenOnboarding` from the store (Task 6).
- Produces: `OnboardingGate({ children })` — renders `children` when the flag is set, otherwise `<Navigate to="/onboarding" replace />`.

**Design notes for the implementer:**
- This wraps **only** the `/` route element. Wrapping `AppShell` would bounce `/avisos` and `/perfil` too, which the spec explicitly rules out.
- `replace` matters: a first-time visitor must not be able to press Back into a redirect loop.
- The pattern mirrors `ProtectedRoute` deliberately — same shape, same `Navigate` usage.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/features/onboarding/ui/OnboardingGate.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { OnboardingGate } from "./OnboardingGate.js";
import { useAppStore } from "@/app/store/index.js";
import type { AppStore } from "@/app/store/types.js";

jest.mock("@/app/store/index.js");
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

function renderGate(hasSeenOnboarding: boolean) {
  mockUseAppStore.mockImplementation((selector: (s: AppStore) => unknown) =>
    selector({ hasSeenOnboarding } as unknown as AppStore),
  );

  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route
          path="/"
          element={
            <OnboardingGate>
              <p>mapa</p>
            </OnboardingGate>
          }
        />
        <Route path="/onboarding" element={<p>intro</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("OnboardingGate", () => {
  it("redirects a first-time visitor to the intro", () => {
    renderGate(false);

    expect(screen.getByText("intro")).toBeInTheDocument();
    expect(screen.queryByText("mapa")).not.toBeInTheDocument();
  });

  it("renders the map for a returning visitor", () => {
    renderGate(true);

    expect(screen.getByText("mapa")).toBeInTheDocument();
    expect(screen.queryByText("intro")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @aonde-tem/web test -- OnboardingGate`
Expected: FAIL — `Cannot find module './OnboardingGate.js'`.

- [ ] **Step 3: Write the gate**

Create `apps/web/src/features/onboarding/ui/OnboardingGate.tsx`:

```tsx
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAppStore } from "@/app/store/index.js";

// Wraps only the map route. Deep links (/avisos, /perfil, /report, a shared place link)
// stay reachable directly — onboarding intercepts the front door, not every door. Same
// shape as ProtectedRoute, including the `replace` that keeps Back out of a redirect loop.
export function OnboardingGate({ children }: { readonly children: ReactNode }) {
  const hasSeenOnboarding = useAppStore((s) => s.hasSeenOnboarding);

  if (!hasSeenOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}
```

- [ ] **Step 4: Wire the gate into the map route**

In `apps/web/src/app/router.tsx`, add the import:

```tsx
import { OnboardingGate } from "../features/onboarding/ui/OnboardingGate.js";
```

and change the `/` route element from:

```tsx
          {
            path: "/",
            element: (
              <PageSuspense>
                <SeekPage />
              </PageSuspense>
            ),
          },
```

to:

```tsx
          {
            path: "/",
            element: (
              <OnboardingGate>
                <PageSuspense>
                  <SeekPage />
                </PageSuspense>
              </OnboardingGate>
            ),
          },
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @aonde-tem/web test -- OnboardingGate`
Expected: PASS — 2 tests.

- [ ] **Step 6: Run the full gate**

Run: `pnpm --filter @aonde-tem/web lint && pnpm --filter @aonde-tem/web typecheck && pnpm --filter @aonde-tem/web test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A apps/web/src
git commit -m "feat(web): gate the map behind first-run onboarding"
```

---

### Task 8: Parity pass, manual verification, and docs

The shell is complete. This task verifies it against the mockup on a real device viewport and brings the generated docs back in sync.

**Files:**
- Modify: `apps/web/src/features/map/ui/PlaceModal.tsx` (only if the check below finds a gap)
- Modify: `apps/web/src/features/report/ui/ReportPage.tsx` (only if the check below finds a gap)
- Modify: `PRODUCT.md`
- Modify: `DESIGN.md` (regenerated)

**Interfaces:**
- Consumes: everything from Tasks 1–7.
- Produces: no new exports.

**Design notes for the implementer:**
- The design handoff states that `PlaceModal`, `ReportPage` and `SignInPage` already match the mockup 1:1. Treat this as **verification**, not a rewrite. Only fix what actually differs.
- `BottomSheet` renders its backdrop at `--z-modal-backdrop` (40) and its panel at `--z-modal` (50), both above the bar's `--z-sticky` (30). Sheets should already cover the navigation with no change — confirm rather than assume.
- The reference is `docs/superpowers/design_handoff_aonde_tem_mobile/Aonde Tem Mobile App.dc.html`. Open it side by side with the running app.

- [ ] **Step 1: Run the app and check the shell on a phone viewport**

```bash
pnpm --filter @aonde-tem/web dev
```

Open the app with the browser's device toolbar set to a 390×844 viewport and verify, in both light and dark:

1. The bar shows Mapa · Avisos · [+] · Perfil, with the active tab in the accent color.
2. The radius pill, the empty state and the fetch-error card all sit clear of the bar.
3. Opening a place sheet covers the bar completely; Escape closes it and returns focus.
4. The magnifier expands into the input, suggestions appear from two characters, and the `×` collapses it.
5. With location permission denied, the banner "Localização negada — mostrando São Paulo. Pan para sua área." stays visible above the **collapsed** magnifier, not only when the bar is expanded.
6. Signed out: `/avisos` and `+` land on `/signin`; `/perfil` opens and its theme switch works.
7. First visit in a fresh profile lands on `/onboarding`; a reload afterwards goes straight to the map.
8. Every tab, the `+`, the magnifier and the `×` are at least 44×44.

Fix any gap found before continuing.

- [ ] **Step 2: Verify the bottom inset on the sheet and the report flow**

With the place sheet open and the report flow at its confirm step, check that no control is
cut off by the home indicator on an iOS-sized viewport. If either clips, add
`paddingBottom: "env(safe-area-inset-bottom, 0px)"` to that component's sticky footer —
do not change its layout otherwise.

- [ ] **Step 3: Run the slop detector**

Run: `npx impeccable detect apps/web/src/`
Expected: no findings. Fix anything it reports.

- [ ] **Step 4: Update PRODUCT.md**

Add a short "Navigation" subsection describing the model this plan implements: a bottom tab
bar (Mapa · Avisos · [+] · Perfil) as the app's global navigation, with the report action as
a raised center button; search collapsed to a magnifier on the map; theme and account
controls living in Perfil; onboarding shown once per device before the map.

- [ ] **Step 5: Regenerate DESIGN.md**

Run: `/impeccable document`
Expected: `DESIGN.md` picks up the bottom nav, the new layout tokens, and the collapsed
search. Confirm the Two-Radius, One-Accent, Trust-Green and Floating-Only rules survive the
regeneration.

- [ ] **Step 6: Run the full gate one last time**

Run: `pnpm --filter @aonde-tem/web lint && pnpm --filter @aonde-tem/web typecheck && pnpm --filter @aonde-tem/web test && pnpm --filter @aonde-tem/web build`
Expected: PASS, including the `size-limit` budget.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "docs: sync PRODUCT.md and DESIGN.md with the mobile shell"
```

---

## What this plan does not build

Recorded so the next planning cycle picks them up, per the spec's out-of-scope section:

- **Avisos / Watchlist (Epic E11)** — needs the `Watch`, `PushSubscription` and `Notification` entities from `docs/specs/NOTIFICATIONS.en.md`. `AvisosPage` is a placeholder.
- **Full Perfil** — the avatar header, stat columns and "meus relatos" list need a discoveries-by-reporter endpoint.
- **Item price history (P2)** — the `PriceHistory` entity does not exist.
- **Admin moderation queue** — `Flag` exists but has no UI, and `MVP-OVERVIEW.md` lists a rich admin dashboard as a non-goal.
- **Sign-in method** — the code stays on e-mail plus password; the magic-code divergence with `MVP-OVERVIEW.md` §G4 is a separate decision.
- **Dark map tiles** — MapLibre's tile style still does not follow the app theme (`DESIGN.md` §2).
