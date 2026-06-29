# React Router v6 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `useState` page switcher in `main.tsx` with React Router v6 — centralised routes in `app/router.tsx`, lazy-loaded pages, and a `ProtectedRoute` that redirects unauthenticated users to `/signin`.

**Architecture:** `createBrowserRouter` owns all routes in `apps/web/src/app/router.tsx`. Every page is `React.lazy()`-imported and wrapped in a `<PageSuspense>` fallback. A `ProtectedRoute` component reads the Zustand auth store and issues a `<Navigate>` redirect when needed, passing the blocked path as router state so `SignInPage` can bounce the user back after login.

**Tech Stack:** `react-router-dom` v6, React 18 lazy/Suspense, Zustand (`useAppStore`), React Testing Library (jsdom), `pnpm`.

## Global Constraints

- All source files use `.tsx`/`.ts` with `.js` extensions in import paths (Vite ESM convention — keep existing pattern)
- Portuguese copy only — keep all UI strings in PT-BR
- Brand colour token: `bg-brand` (`#1a5c3a`)
- `pnpm` workspace — install in `apps/web` scope (`pnpm --filter @aonde-tem/web add react-router-dom`)
- Tests run with `pnpm --filter @aonde-tem/web test`
- TypeScript strict mode — no `any`, no unused variables

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `apps/web/package.json` | add `react-router-dom` dependency |
| Create | `apps/web/src/features/auth/ui/ProtectedRoute.tsx` | auth guard — redirects to `/signin` when unauthenticated |
| Create | `apps/web/src/features/auth/ui/ProtectedRoute.test.tsx` | unit tests for guard behaviour |
| Create | `apps/web/src/app/router.tsx` | single source of truth for all routes |
| Modify | `apps/web/src/main.tsx` | swap `App` + `useState` for `RouterProvider` |
| Modify | `apps/web/src/features/seek/ui/SeekPage.tsx` | drop `onReport` prop, FAB uses `useNavigate` |
| Modify | `apps/web/src/features/report/ui/ReportPage.tsx` | drop `onSuccess`/`onSignInRequired` props, inline auth block removed |
| Modify | `apps/web/src/features/auth/ui/SignInPage.tsx` | drop `onSuccess` prop, navigate back to `from` after verify |

---

### Task 1: Install react-router-dom

**Files:**
- Modify: `apps/web/package.json`

**Interfaces:**
- Produces: `react-router-dom` v6 available as import in all `apps/web/src` files

- [ ] **Step 1: Add the dependency**

```bash
pnpm --filter @aonde-tem/web add react-router-dom
```

- [ ] **Step 2: Verify installation**

```bash
pnpm --filter @aonde-tem/web list react-router-dom
```

Expected output contains `react-router-dom 6.x.x`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore(web): add react-router-dom v6"
```

---

### Task 2: Create ProtectedRoute + unit tests

**Files:**
- Create: `apps/web/src/features/auth/ui/ProtectedRoute.tsx`
- Create: `apps/web/src/features/auth/ui/ProtectedRoute.test.tsx`

**Interfaces:**
- Produces: `export function ProtectedRoute({ children }: { children: ReactNode }): JSX.Element`
  - When `isAuthenticated()` is false → renders `<Navigate to="/signin" state={{ from: location }} replace />`
  - When `isAuthenticated()` is true → renders `children`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/features/auth/ui/ProtectedRoute.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute.js";
import { useAppStore } from "../../../app/store/index.js";

jest.mock("../../../app/store/index.js");
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

function renderWithRouter(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/signin" element={<div>Sign In Page</div>} />
        <Route
          path="/report"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("renders children when authenticated", () => {
    mockUseAppStore.mockReturnValue(true as never);
    renderWithRouter("/report");
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("redirects to /signin when not authenticated", () => {
    mockUseAppStore.mockReturnValue(false as never);
    renderWithRouter("/report");
    expect(screen.getByText("Sign In Page")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm --filter @aonde-tem/web test -- --testPathPattern=ProtectedRoute
```

Expected: `Cannot find module './ProtectedRoute.js'`

- [ ] **Step 3: Create ProtectedRoute**

Create `apps/web/src/features/auth/ui/ProtectedRoute.tsx`:

```tsx
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppStore } from "../../../app/store/index.js";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated());
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm --filter @aonde-tem/web test -- --testPathPattern=ProtectedRoute
```

Expected: `PASS  src/features/auth/ui/ProtectedRoute.test.tsx` (2 tests passing)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/auth/ui/ProtectedRoute.tsx apps/web/src/features/auth/ui/ProtectedRoute.test.tsx
git commit -m "feat(web): add ProtectedRoute guard with redirect-back support"
```

---

### Task 3: Create router.tsx + migrate main.tsx

**Files:**
- Create: `apps/web/src/app/router.tsx`
- Modify: `apps/web/src/main.tsx`

**Interfaces:**
- Consumes: `ProtectedRoute` from `../features/auth/ui/ProtectedRoute.js`
- Produces: `export const router` — `createBrowserRouter` instance consumed by `RouterProvider` in `main.tsx`

- [ ] **Step 1: Create `apps/web/src/app/router.tsx`**

```tsx
import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "../features/auth/ui/ProtectedRoute.js";

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

export const router = createBrowserRouter([
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
]);
```

- [ ] **Step 2: Replace `main.tsx`**

Replace the entire content of `apps/web/src/main.tsx` with:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { queryClient } from "./app/query-client.js";
import { router } from "./app/router.js";
import "./app/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 3: Run the dev server and verify the app loads**

```bash
pnpm --filter @aonde-tem/web dev
```

Open `http://localhost:5173` — the seek/map page must render. Navigate to `http://localhost:5173/report` — should redirect to `/signin` (unauthenticated). Navigate to `http://localhost:5173/signin` — sign-in page must render.

Expected: no console errors, three routes accessible.

Note: SeekPage still has `onReport` prop — TypeScript will error. That's expected and fixed in Task 4. Run `pnpm --filter @aonde-tem/web typecheck` — expect errors only for missing props, not for router setup.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/router.tsx apps/web/src/main.tsx
git commit -m "feat(web): introduce createBrowserRouter + RouterProvider in main.tsx"
```

---

### Task 4: Migrate SeekPage

**Files:**
- Modify: `apps/web/src/features/seek/ui/SeekPage.tsx`

**Interfaces:**
- Consumes: `useNavigate` from `react-router-dom`
- Produces: `SeekPage` with no props (was `{ onReport: () => void }`)

- [ ] **Step 1: Update SeekPage**

Replace `apps/web/src/features/seek/ui/SeekPage.tsx` with:

```tsx
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MapShell } from "../../map/ui/MapShell.js";
import { SearchBar } from "./SearchBar.js";
import { EmptyState } from "./EmptyState.js";
import { useGeolocation, DEFAULT_COORDS } from "../../map/model/use-geolocation.js";
import { useNearbyDiscoveries } from "../api/discovery.queries.js";
import { useAppStore } from "../../../app/store/index.js";

export function SeekPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { coords, denied } = useGeolocation();
  const radius = useAppStore((s) => s.mapRadius);
  const setRadius = useAppStore((s) => s.setRadius);

  const center = coords ?? DEFAULT_COORDS;

  const { data, isLoading } = useNearbyDiscoveries({
    lat: center.lat,
    lng: center.lng,
    radius,
    item: searchQuery || undefined,
  });

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  const discoveries = data?.results ?? [];

  return (
    <div className="relative w-full h-screen bg-surface overflow-hidden">
      {/* Full-screen map — underneath everything */}
      <div className="absolute inset-0">
        <MapShell center={center} userPin={coords ?? undefined} discoveries={discoveries} />
      </div>

      {/* Search bar — floats on top of the map */}
      <div className="absolute top-4 left-4 right-4 z-10">
        {denied && (
          <p className="text-xs text-aging bg-surface/90 rounded-lg px-3 py-1.5 mb-2">
            Localização negada — mostrando São Paulo. Pan para sua área.
          </p>
        )}
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* Empty state — shown when search has results=0 and not loading */}
      {!isLoading && discoveries.length === 0 && (
        <div className="absolute bottom-20 left-0 right-0 z-10">
          <EmptyState query={searchQuery || undefined} />
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-surface/90 rounded-full px-4 py-2 z-10 shadow">
          <span className="text-text-muted text-sm">Buscando…</span>
        </div>
      )}

      {/* Radius slider — bottom-left, above FAB */}
      <div className="absolute bottom-6 left-4 z-10 bg-surface/95 rounded-full px-4 py-2 shadow-sm border border-border flex items-center gap-2.5">
        <span className="text-xs text-text-muted">Raio</span>
        <input
          type="range"
          min={500}
          max={20_000}
          step={500}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="w-24"
          aria-label="Raio de busca"
        />
        <span className="text-xs text-text font-medium w-14 text-right tabular-nums">
          {radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${radius} m`}
        </span>
      </div>

      {/* FAB — report discovery */}
      <button
        className="absolute bottom-6 right-4 z-10 bg-brand text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl"
        aria-label="Relatar produto"
        onClick={() => navigate("/report")}
      >
        +
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @aonde-tem/web typecheck
```

Expected: no errors related to `SeekPage`. Remaining errors only from `ReportPage` / `SignInPage` (fixed in Tasks 5–6).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/seek/ui/SeekPage.tsx
git commit -m "feat(web): migrate SeekPage to useNavigate — drop onReport prop"
```

---

### Task 5: Migrate ReportPage

**Files:**
- Modify: `apps/web/src/features/report/ui/ReportPage.tsx`

**Interfaces:**
- Consumes: `useNavigate` from `react-router-dom`
- Produces: `ReportPage` with no props (was `{ onSuccess: () => void; onSignInRequired: () => void }`)

Note: The inline auth-gate block (`if (!isAuthenticated) return …`) is removed — `ProtectedRoute` in `router.tsx` handles this now.

- [ ] **Step 1: Update ReportPage**

Replace `apps/web/src/features/report/ui/ReportPage.tsx` with:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProductPicker } from "./ProductPicker.js";
import { PlacePicker } from "./PlacePicker.js";
import { PriceInput } from "./PriceInput.js";
import { ConfirmStep } from "./ConfirmStep.js";
import { useCreateDiscovery } from "../api/report.api.js";

interface FormState {
  product: { id?: string; name: string } | null;
  place: { lat: number; lng: number; name: string; placeId?: string } | null;
  priceBrl: number | null;
  quantity: number;
}

export function ReportPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const [form, setForm] = useState<FormState>({
    product: null,
    place: null,
    priceBrl: null,
    quantity: 1,
  });
  const [errors, setErrors] = useState<{ price?: string; product?: string; place?: string }>({});

  const createDiscovery = useCreateDiscovery();

  function validateForm(): boolean {
    const newErrors: typeof errors = {};
    if (!form.product?.name) newErrors.product = "Informe o produto";
    if (!form.place) newErrors.place = "Informe o local";
    if (!form.priceBrl) newErrors.price = "Informe um preço válido (> R$0)";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function goToConfirm() {
    if (validateForm()) setStep("confirm");
  }

  async function submit() {
    if (!form.product || !form.place || !form.priceBrl) return;
    try {
      await createDiscovery.mutateAsync({
        productId: form.product.id,
        productName: form.product.id ? undefined : form.product.name,
        placeId: form.place.placeId,
        placeName: form.place.name,
        lat: form.place.lat,
        lng: form.place.lng,
        priceBrl: form.priceBrl,
        quantity: form.quantity,
      });
      setStep("success");
    } catch {
      // Error handled by ApiError boundary / toast
    }
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-text mb-2">Relato enviado!</h2>
        <p className="text-text-muted text-sm mb-8">Você ajudou alguém a encontrar esse produto.</p>
        <button
          onClick={() => navigate("/")}
          className="bg-brand text-white font-semibold px-8 py-3 rounded-full"
        >
          Ver no mapa
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="text-text-muted text-2xl min-h-11 min-w-11 flex items-center justify-center"
        >
          ←
        </button>
        <h1 className="text-lg font-semibold text-text">
          {step === "confirm" ? "Confirmar" : "Relatar produto"}
        </h1>
      </div>

      <div className="flex-1 px-4 py-6 flex flex-col gap-6 overflow-y-auto">
        {step === "form" ? (
          <>
            <ProductPicker
              value={form.product}
              onChange={(product) => setForm((f) => ({ ...f, product }))}
            />
            {errors.product && <p className="text-error text-xs -mt-4">{errors.product}</p>}

            <PlacePicker
              value={form.place}
              onChange={(place) => setForm((f) => ({ ...f, place }))}
            />
            {errors.place && <p className="text-error text-xs -mt-4">{errors.place}</p>}

            <PriceInput
              value={form.priceBrl}
              onChange={(priceBrl) => setForm((f) => ({ ...f, priceBrl }))}
              error={errors.price}
            />

            <div>
              <label className="block text-sm font-medium text-text mb-1">Quantidade</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                className="w-full border border-border rounded-xl px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <button
              type="button"
              onClick={goToConfirm}
              className="w-full bg-brand text-white font-semibold py-3 rounded-xl mt-2"
            >
              Continuar
            </button>
          </>
        ) : (
          <ConfirmStep
            draft={{
              productName: form.product!.name,
              placeName: form.place!.name,
              priceBrl: form.priceBrl!,
              quantity: form.quantity,
            }}
            onConfirm={submit}
            onEdit={() => setStep("form")}
            isSubmitting={createDiscovery.isPending}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter @aonde-tem/web typecheck
```

Expected: no errors from `ReportPage`. Only remaining error is `SignInPage` (fixed in Task 6).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/report/ui/ReportPage.tsx
git commit -m "feat(web): migrate ReportPage to useNavigate — drop callback props and inline auth gate"
```

---

### Task 6: Migrate SignInPage

**Files:**
- Modify: `apps/web/src/features/auth/ui/SignInPage.tsx`

**Interfaces:**
- Consumes: `useNavigate`, `useLocation` from `react-router-dom`
- Produces: `SignInPage` with no props (was `{ onSuccess: () => void }`)
  - After successful verify: navigates to `location.state.from.pathname` or `/`

- [ ] **Step 1: Update SignInPage**

Replace `apps/web/src/features/auth/ui/SignInPage.tsx` with:

```tsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { sendMagicCodeSchema, verifyMagicCodeSchema, type SendMagicCodeDto } from "@aonde-tem/contracts";
import { useSendMagicCode, useVerifyMagicCode } from "../api/auth.mutations.js";

// Code step only needs the 6-digit code; email is held in component state.
const codeOnlySchema = verifyMagicCodeSchema.pick({ code: true });
type CodeOnlyFormValues = z.infer<typeof codeOnlySchema>;

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");

  const sendCode = useSendMagicCode();
  const verifyCode = useVerifyMagicCode();

  const emailForm = useForm<SendMagicCodeDto>({ resolver: zodResolver(sendMagicCodeSchema) });
  const codeForm = useForm<CodeOnlyFormValues>({ resolver: zodResolver(codeOnlySchema) });

  async function onSubmitEmail(data: { email: string }) {
    setEmail(data.email);
    await sendCode.mutateAsync({ email: data.email });
    setStep("code");
  }

  async function onSubmitCode(data: { email: string; code: string }) {
    await verifyCode.mutateAsync(data);
    navigate(from, { replace: true });
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-text mb-2">
          {step === "email" ? "Entrar" : "Código de acesso"}
        </h1>
        <p className="text-text-muted text-sm mb-8">
          {step === "email"
            ? "Digite seu e-mail para receber um código de acesso."
            : `Enviamos um código de 6 dígitos para ${email}.`}
        </p>

        {step === "email" ? (
          <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} noValidate>
            <label className="block text-sm font-medium text-text mb-1" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="seu@email.com"
              className="w-full border border-border rounded-xl px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-brand mb-4"
              {...emailForm.register("email")}
            />
            {emailForm.formState.errors.email && (
              <p className="text-error text-sm mb-3">
                {emailForm.formState.errors.email.message}
              </p>
            )}
            {sendCode.isError && (
              <p className="text-error text-sm mb-3" role="alert">
                Não foi possível enviar o código. Tente novamente.
              </p>
            )}
            <button
              type="submit"
              disabled={sendCode.isPending}
              className="w-full bg-brand text-white font-semibold py-3 rounded-xl disabled:opacity-60"
            >
              {sendCode.isPending ? "Enviando…" : "Receber código"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={codeForm.handleSubmit((d) => onSubmitCode({ email, code: d.code }))}
            noValidate
          >
            <label className="block text-sm font-medium text-text mb-1" htmlFor="code">
              Código de 6 dígitos
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              className="w-full border border-border rounded-xl px-4 py-3 text-text text-center text-2xl tracking-widest outline-none focus:ring-2 focus:ring-brand mb-4"
              {...codeForm.register("code")}
            />
            {verifyCode.isError && (
              <p className="text-error text-sm mb-3">
                Código inválido ou expirado. Tente novamente.
              </p>
            )}
            <button
              type="submit"
              disabled={verifyCode.isPending}
              className="w-full bg-brand text-white font-semibold py-3 rounded-xl disabled:opacity-60"
            >
              {verifyCode.isPending ? "Verificando…" : "Entrar"}
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full text-text-muted text-sm mt-3 py-2 min-h-11"
            >
              Usar outro e-mail
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run full typecheck**

```bash
pnpm --filter @aonde-tem/web typecheck
```

Expected: **zero errors**.

- [ ] **Step 3: Run full test suite**

```bash
pnpm --filter @aonde-tem/web test
```

Expected: all tests pass including `ProtectedRoute.test.tsx`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/auth/ui/SignInPage.tsx
git commit -m "feat(web): migrate SignInPage to useNavigate — redirect-back after login"
```

---

### Task 7: Final smoke test

**Files:** none (verification only)

- [ ] **Step 1: Start dev server**

```bash
pnpm --filter @aonde-tem/web dev
```

- [ ] **Step 2: Verify all three routes**

| URL | Expected |
|-----|----------|
| `http://localhost:5173/` | Map loads, FAB visible |
| `http://localhost:5173/report` | Redirects to `/signin` (unauthenticated) |
| `http://localhost:5173/signin` | Sign-in form renders |

- [ ] **Step 3: Verify redirect-back flow**

1. Open `http://localhost:5173/report` → redirected to `/signin`
2. In the API terminal, note the magic code printed for `admin@aondetem.com.br` after requesting it
3. Complete sign-in → should land on `/report`, not `/`

- [ ] **Step 4: Verify FAB navigation**

On `/`, tap the `+` FAB:
- If signed in → lands on `/report`
- If not signed in → lands on `/signin`; after login → lands on `/report`

- [ ] **Step 5: Final commit tag**

```bash
git add -A
git commit -m "feat(web): complete React Router v6 migration" --allow-empty
```
