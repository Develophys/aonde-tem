# Auth Overhaul + Map UX Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google OAuth + email+password login + magic-code signup flow; fix "Ver no mapa" to fly the in-app map; hide login button on auth pages; hide range slider behind PlaceModal.

**Architecture:** Features 2/3/4 are pure frontend and independent — do Task 1 first for quick wins. Auth (Feature 1) spans backend → domain → contracts → frontend and must be done in the order Tasks 2–14. The `VerifyMagicCode` use case return type stays as `User`; the controller decides whether to issue a full JWT or a short-lived registration token based on `user.hasPassword()`.

**Tech Stack:** NestJS + Passport + `passport-google-oauth20` + `bcrypt` (backend); React + Zustand + TanStack Query + react-router-dom (frontend); Prisma + PostgreSQL/PostGIS; Zod in `packages/contracts`.

## Global Constraints

- TypeScript strict mode everywhere; no `any` unless suppressed by existing project pattern.
- ESLint + Prettier enforced via pre-commit hook (`pnpm lint` / `pnpm format`).
- Tests: `pnpm --filter @aonde-tem/api test`, `pnpm --filter @aonde-tem/domain test`, `pnpm --filter @aonde-tem/web test`.
- Portuguese UI copy; existing Tailwind v4 `@theme` tokens only — no new inline colours.
- Clean Architecture: domain (`packages/domain`) imports nothing framework-specific.
- Commit after every task.

---

## File Map

| File | Action | Task |
|---|---|---|
| `apps/web/src/features/auth/ui/AppHeader.tsx` | Modify | 1 |
| `apps/web/src/features/seek/ui/SeekPage.tsx` | Modify | 1 |
| `apps/web/src/features/map/ui/PlaceModal.tsx` | Modify | 1 |
| `apps/web/src/features/map/ui/MapView.tsx` | Modify | 1 |
| `apps/web/src/features/auth/ui/AppHeader.test.tsx` | Modify | 1 |
| `prisma/schema.prisma` | Modify | 2 |
| `packages/domain/src/entities/user.ts` | Modify | 3 |
| `packages/domain/src/repositories/user-repository.ts` | Modify | 3 |
| `packages/domain/src/entities/user.test.ts` | Modify | 3 |
| `packages/contracts/src/auth.ts` | Modify | 4 |
| `packages/contracts/src/index.ts` | Modify | 4 |
| `apps/api/src/modules/auth/application/hash.service.ts` | Create | 5 |
| `apps/api/src/modules/auth/infrastructure/bcrypt-hash.service.ts` | Create | 5 |
| `apps/api/src/modules/auth/infrastructure/prisma-user.repository.ts` | Modify | 6 |
| `apps/api/src/modules/auth/application/login-with-password.ts` | Create | 7 |
| `apps/api/src/modules/auth/application/login-with-password.test.ts` | Create | 7 |
| `apps/api/src/modules/auth/application/complete-registration.ts` | Create | 8 |
| `apps/api/src/modules/auth/application/complete-registration.test.ts` | Create | 8 |
| `apps/api/src/modules/auth/application/login-with-google.ts` | Create | 9 |
| `apps/api/src/modules/auth/infrastructure/google.strategy.ts` | Create | 9 |
| `apps/api/src/modules/auth/presentation/auth.controller.ts` | Modify | 10 |
| `apps/api/src/modules/auth/auth.controller.spec.ts` | Modify | 10 |
| `apps/api/src/modules/auth/auth.module.ts` | Modify | 10 |
| `apps/web/src/features/auth/api/auth.api.ts` | Modify | 11 |
| `apps/web/src/features/auth/api/auth.mutations.ts` | Modify | 11 |
| `apps/web/src/features/auth/ui/SignInPage.tsx` | Rewrite | 12 |
| `apps/web/src/features/auth/ui/SignUpPage.tsx` | Create | 13 |
| `apps/web/src/app/router.tsx` | Modify | 14 |

---

## Task 1: Quick UX fixes (AppHeader, slider, Ver no mapa)

**Files:**
- Modify: `apps/web/src/features/auth/ui/AppHeader.tsx`
- Modify: `apps/web/src/features/auth/ui/AppHeader.test.tsx`
- Modify: `apps/web/src/features/seek/ui/SeekPage.tsx`
- Modify: `apps/web/src/features/map/ui/PlaceModal.tsx`
- Modify: `apps/web/src/features/map/ui/MapView.tsx`

**Interfaces:**
- Produces: `PlaceModal` gains `onFlyTo: (coords: { lat: number; lng: number }) => void` prop.

- [ ] **Step 1: Write failing test for AppHeader hiding on /signin**

```tsx
// apps/web/src/features/auth/ui/AppHeader.test.tsx
// Add inside describe("AppHeader — unauthenticated"):

it("returns nothing when on /signin", () => {
  setupStore({ sessionUser: null });
  render(
    <MemoryRouter initialEntries={["/signin"]}>
      <AppHeader />
    </MemoryRouter>,
  );
  expect(screen.queryByRole("button", { name: "Entrar" })).not.toBeInTheDocument();
});

it("returns nothing when on /signup", () => {
  setupStore({ sessionUser: null });
  render(
    <MemoryRouter initialEntries={["/signup"]}>
      <AppHeader />
    </MemoryRouter>,
  );
  expect(screen.queryByRole("button", { name: "Entrar" })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

```
pnpm --filter @aonde-tem/web test
```
Expected: FAIL — Entrar button is found even on /signin.

- [ ] **Step 3: Update AppHeader to hide on auth routes**

Replace the top of `apps/web/src/features/auth/ui/AppHeader.tsx`:

```tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppStore } from "../../../app/store/index.js";

export function AppHeader() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
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

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDropdownOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dropdownOpen]);

  // Invariant: `sessionUser` and `accessToken` are always kept in sync by
  // `setSession` / `clearSession` in session.slice.ts — so branching on
  // `sessionUser` here is equivalent to calling `isAuthenticated()` in
  // ProtectedRoute. Never clear one without the other.
  if (!sessionUser) {
    if (pathname === "/signin" || pathname === "/signup") return null;
    return (
      <button
        type="button"
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
        type="button"
        className="flex items-center gap-2 bg-brand text-white rounded-full px-3 py-1.5 shadow-md"
        onClick={() => setDropdownOpen((o) => !o)}
        aria-expanded={dropdownOpen}
      >
        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">
          {initials}
        </span>
        <span className="text-sm font-medium max-w-30 truncate">{displayName}</span>
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

- [ ] **Step 4: Run test to verify it passes**

```
pnpm --filter @aonde-tem/web test
```
Expected: all AppHeader tests PASS.

- [ ] **Step 5: Hide radius slider when a place is selected in SeekPage**

Replace the radius slider section in `apps/web/src/features/seek/ui/SeekPage.tsx`. The file currently reads `const radius = useAppStore(...)` — add `selectedPlaceId` alongside it:

```tsx
// After the existing:  const radius = useAppStore((s) => s.mapRadius);
// Add:
const selectedPlaceId = useAppStore((s) => s.selectedPlaceId);
```

Then wrap the existing slider `<div>` (line 64 area, the one with `className="absolute bottom-6 left-4 z-10..."`) in a conditional:

```tsx
{!selectedPlaceId && (
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
)}
```

- [ ] **Step 6: Change "Ver no mapa" to fly the in-app map**

Replace `apps/web/src/features/map/ui/PlaceModal.tsx` footer section. The `PlaceModal` component needs an `onFlyTo` prop. Full updated file:

```tsx
import { useState } from "react";
import { useAppStore } from "../../../app/store/index.js";
import { usePlaceDiscoveries } from "../api/place.queries.js";
import { FlagSheet } from "../../flag/ui/FlagSheet.js";

function freshnessLabel(ageMinutes: number): string {
  if (ageMinutes < 60) return `${ageMinutes}min atrás`;
  if (ageMinutes < 1440) return `${Math.floor(ageMinutes / 60)}h atrás`;
  return `${Math.floor(ageMinutes / 1440)}d atrás`;
}

function freshnessClass(ageMinutes: number): string {
  if (ageMinutes < 120) return "text-fresh";
  if (ageMinutes < 720) return "text-aging";
  return "text-text-muted";
}

interface Props {
  placeId: string;
  onFlyTo: (coords: { lat: number; lng: number }) => void;
}

export function PlaceModal({ placeId, onFlyTo }: Props) {
  const clearSelected = useAppStore((s) => s.clearSelectedPlace);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated());
  const [flagTargetId, setFlagTargetId] = useState<string | null>(null);

  const { data, isLoading } = usePlaceDiscoveries(placeId);

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl shadow-xl pb-8 z-10 animate-slide-up max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2 shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-text leading-snug">
            {data?.name ?? "Carregando…"}
          </h2>
          {data?.address && (
            <p className="text-text-muted text-sm mt-0.5">{data.address}</p>
          )}
        </div>
        <button
          type="button"
          onClick={clearSelected}
          className="text-text-muted text-2xl leading-none min-h-11 min-w-11 flex items-center justify-center"
          aria-label="Fechar"
        >
          ×
        </button>
      </div>

      {/* Item list */}
      <div className="overflow-y-auto flex-1 px-4">
        {isLoading && (
          <p className="text-text-muted text-sm py-4 text-center">Carregando itens…</p>
        )}

        {!isLoading && data?.discoveries.length === 0 && (
          <p className="text-text-muted text-sm py-4 text-center">
            Nenhum item disponível aqui no momento.
          </p>
        )}

        {data?.discoveries.map((item) => (
          <div
            key={item.id}
            className="py-3 border-b border-border last:border-0"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-text">{item.productName}</span>
              <span className="font-bold text-text tabular-nums shrink-0">
                R$ {item.priceBrl.toFixed(2).replace(".", ",")}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-text-muted text-sm">{item.quantity} unid.</span>
              <span className={`text-sm ${freshnessClass(item.ageMinutes)}`}>
                {freshnessLabel(item.ageMinutes)}
              </span>
            </div>
            {item.note && (
              <p className="text-text-muted text-sm mt-1 italic">"{item.note}"</p>
            )}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setFlagTargetId(item.id)}
                className="text-text-muted text-xs mt-1 min-h-8"
              >
                Denunciar
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer actions */}
      {data?.coords && (
        <div className="px-4 pt-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              clearSelected();
              onFlyTo(data.coords);
            }}
            className="block w-full text-center bg-brand text-white font-semibold py-3 rounded-xl"
          >
            Ver no mapa
          </button>
        </div>
      )}

      {flagTargetId && (
        <FlagSheet
          targetType="discovery"
          targetId={flagTargetId}
          onClose={() => setFlagTargetId(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 7: Pass onFlyTo from MapView to PlaceModal**

Replace `apps/web/src/features/map/ui/MapView.tsx` — add the flyTo callback:

```tsx
import Map, { Marker, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { DiscoveryResponse } from "@aonde-tem/contracts";
import { DiscoveryMarkerLayer } from "./DiscoveryMarkerLayer.js";
import { PlaceModal } from "./PlaceModal.js";
import { useRef, useCallback } from "react";
import { useAppStore } from "../../../app/store/index.js";

const MAP_STYLE =
  import.meta.env.VITE_MAP_KEY && import.meta.env.VITE_MAP_KEY !== "demo"
    ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${import.meta.env.VITE_MAP_KEY}`
    : "https://tiles.openfreemap.org/styles/bright";

interface MapViewProps {
  center: { lat: number; lng: number };
  userPin?: { lat: number; lng: number };
  discoveries: DiscoveryResponse[];
}

export function MapView({ center, userPin, discoveries }: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const selectedPlaceId = useAppStore((s) => s.selectedPlaceId);

  const recenter = useCallback(() => {
    if (!userPin || !mapRef.current) return;
    mapRef.current.flyTo({ center: [userPin.lng, userPin.lat], zoom: 15, duration: 800 });
  }, [userPin]);

  const flyToPlace = useCallback((coords: { lat: number; lng: number }) => {
    mapRef.current?.flyTo({ center: [coords.lng, coords.lat], zoom: 17, duration: 800 });
  }, []);

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: center.lng, latitude: center.lat, zoom: 14 }}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        <DiscoveryMarkerLayer discoveries={discoveries} />

        {userPin && (
          <Marker longitude={userPin.lng} latitude={userPin.lat} anchor="center">
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                backgroundColor: "#2563eb",
                border: "2px solid white",
                boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
              }}
              aria-label="Sua localização"
            />
          </Marker>
        )}
      </Map>

      {userPin && (
        <button
          type="button"
          onClick={recenter}
          aria-label="Centralizar em minha localização"
          className="absolute bottom-24 right-4 z-10 bg-surface shadow-md rounded-full w-11 h-11 flex items-center justify-center border border-border"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
          </svg>
        </button>
      )}

      {selectedPlaceId && (
        <PlaceModal placeId={selectedPlaceId} onFlyTo={flyToPlace} />
      )}
    </div>
  );
}
```

- [ ] **Step 8: Run all web tests**

```
pnpm --filter @aonde-tem/web test
```
Expected: all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/features/auth/ui/AppHeader.tsx \
        apps/web/src/features/auth/ui/AppHeader.test.tsx \
        apps/web/src/features/seek/ui/SeekPage.tsx \
        apps/web/src/features/map/ui/PlaceModal.tsx \
        apps/web/src/features/map/ui/MapView.tsx
git commit -m "fix(web): hide login btn on auth pages, slider behind modal, Ver no mapa flies in-app map"
```

---

## Task 2: Prisma schema — add password and googleId to User

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `User` table has `password String?` and `googleId String? @unique`.

- [ ] **Step 1: Add fields to schema**

In `prisma/schema.prisma`, update the `User` model:

```prisma
model User {
  id          String   @id @default(uuid())
  email       String   @unique
  displayName String?
  password    String?
  googleId    String?  @unique
  role        String   @default("user") // "user" | "admin"
  createdAt   DateTime @default(now())

  places      Place[]
  products    Product[]
  discoveries Discovery[]
  flags       Flag[]

  @@map("users")
}
```

- [ ] **Step 2: Generate and run migration**

```bash
npx prisma migrate dev --name add_password_google_id_to_user
npx prisma generate
```

Expected: migration file created in `prisma/migrations/`, Prisma client regenerated.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add password and googleId columns to users table"
```

---

## Task 3: Domain User entity + UserRepository port

**Files:**
- Modify: `packages/domain/src/entities/user.ts`
- Modify: `packages/domain/src/repositories/user-repository.ts`
- Modify: `packages/domain/src/entities/user.test.ts`

**Interfaces:**
- Produces:
  - `User.passwordHash: string | null`
  - `User.googleId: string | null`
  - `User.hasPassword(): boolean`
  - `UserRepository.findByGoogleId(googleId: string): Promise<User | null>`
  - `UserRepository.updateCredentials(userId: string, displayName: string, passwordHash: string): Promise<void>`
  - `UserRepository.linkGoogleId(userId: string, googleId: string): Promise<void>`

- [ ] **Step 1: Write failing tests for new User fields**

```ts
// packages/domain/src/entities/user.test.ts — add these tests:

it("has passwordHash null by default", () => {
  const u = User.create({
    id: "550e8400-e29b-41d4-a716-446655440000",
    email: "a@b.com",
    role: "user",
  });
  expect(u.passwordHash).toBeNull();
  expect(u.hasPassword()).toBe(false);
});

it("carries passwordHash when provided", () => {
  const u = User.create({
    id: "550e8400-e29b-41d4-a716-446655440000",
    email: "a@b.com",
    role: "user",
    passwordHash: "$2b$12$abc",
  });
  expect(u.passwordHash).toBe("$2b$12$abc");
  expect(u.hasPassword()).toBe(true);
});

it("carries googleId when provided", () => {
  const u = User.create({
    id: "550e8400-e29b-41d4-a716-446655440000",
    email: "a@b.com",
    role: "user",
    googleId: "google-123",
  });
  expect(u.googleId).toBe("google-123");
});
```

- [ ] **Step 2: Run test to verify it fails**

```
pnpm --filter @aonde-tem/domain test
```
Expected: FAIL — `passwordHash` not defined.

- [ ] **Step 3: Update User entity**

```ts
// packages/domain/src/entities/user.ts
import { Email } from "../value-objects/email";
import { ValidationError } from "../errors/domain-error";

export type UserRole = "user" | "admin";

export class User {
  private constructor(
    public readonly id: string,
    public readonly email: Email,
    public readonly role: UserRole,
    public readonly displayName: string | undefined,
    public readonly passwordHash: string | null,
    public readonly googleId: string | null,
    public readonly createdAt: Date,
  ) {}

  static create(props: {
    id: string;
    email: string;
    role: UserRole;
    displayName?: string;
    passwordHash?: string | null;
    googleId?: string | null;
    createdAt?: Date;
  }): User {
    if (!props.id.trim()) throw new ValidationError("User id is required");
    return new User(
      props.id,
      Email.create(props.email),
      props.role,
      props.displayName,
      props.passwordHash ?? null,
      props.googleId ?? null,
      props.createdAt ?? new Date(),
    );
  }

  hasPassword(): boolean {
    return this.passwordHash !== null;
  }

  isAdmin(): boolean {
    return this.role === "admin";
  }
}
```

- [ ] **Step 4: Update UserRepository port**

```ts
// packages/domain/src/repositories/user-repository.ts
import type { User } from "../entities/user";

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  save(user: User): Promise<void>;
  updateCredentials(userId: string, displayName: string, passwordHash: string): Promise<void>;
  linkGoogleId(userId: string, googleId: string): Promise<void>;
}
```

- [ ] **Step 5: Run tests**

```
pnpm --filter @aonde-tem/domain test
```
Expected: all domain tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/entities/user.ts \
        packages/domain/src/repositories/user-repository.ts \
        packages/domain/src/entities/user.test.ts
git commit -m "feat(domain): add passwordHash, googleId, hasPassword() to User; extend UserRepository"
```

---

## Task 4: New Zod contracts

**Files:**
- Modify: `packages/contracts/src/auth.ts`
- Modify: `packages/contracts/src/index.ts`

**Interfaces:**
- Produces:
  - `loginSchema` / `LoginDto`: `{ email: string; password: string }`
  - `completeRegistrationSchema` / `CompleteRegistrationDto`: `{ registrationToken: string; displayName: string; password: string }`
  - `registrationTokenResponseSchema` / `RegistrationTokenResponse`: `{ registrationToken: string; email: string }`

- [ ] **Step 1: Update contracts/src/auth.ts**

```ts
// packages/contracts/src/auth.ts
import { z } from "zod";

export const sendMagicCodeSchema = z.object({
  email: z.string().email(),
});
export type SendMagicCodeDto = z.infer<typeof sendMagicCodeSchema>;

export const verifyMagicCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6).regex(/^\d{6}$/),
});
export type VerifyMagicCodeDto = z.infer<typeof verifyMagicCodeSchema>;

export const jwtResponseSchema = z.object({
  accessToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string().nullable(),
    role: z.enum(["user", "admin"]),
  }),
});
export type JwtResponse = z.infer<typeof jwtResponseSchema>;

export const registrationTokenResponseSchema = z.object({
  registrationToken: z.string(),
  email: z.string().email(),
});
export type RegistrationTokenResponse = z.infer<typeof registrationTokenResponseSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const completeRegistrationSchema = z.object({
  registrationToken: z.string().min(1),
  displayName: z.string().min(1).max(80),
  password: z.string().min(8),
});
export type CompleteRegistrationDto = z.infer<typeof completeRegistrationSchema>;
```

- [ ] **Step 2: Re-export new types from contracts/src/index.ts**

Open `packages/contracts/src/index.ts` and ensure `auth.ts` exports are included. If the file already re-exports `auth.ts` with `export * from "./auth.js"`, no change is needed. If it lists individual exports, add the new ones:

```ts
export {
  registrationTokenResponseSchema,
  type RegistrationTokenResponse,
  loginSchema,
  type LoginDto,
  completeRegistrationSchema,
  type CompleteRegistrationDto,
} from "./auth.js";
```

- [ ] **Step 3: Build contracts to verify no type errors**

```
pnpm --filter @aonde-tem/contracts build
```
Expected: builds cleanly.

- [ ] **Step 4: Commit**

```bash
git add packages/contracts/src/auth.ts packages/contracts/src/index.ts
git commit -m "feat(contracts): add loginSchema, completeRegistrationSchema, registrationTokenResponseSchema"
```

---

## Task 5: BcryptHashService

**Files:**
- Create: `apps/api/src/modules/auth/application/hash.service.ts`
- Create: `apps/api/src/modules/auth/infrastructure/bcrypt-hash.service.ts`

**Interfaces:**
- Produces:
  - `HashService` interface: `hash(plain: string): Promise<string>`, `compare(plain: string, hash: string): Promise<boolean>`
  - `BcryptHashService` class implementing `HashService`
  - `HASH_SERVICE` injection token

- [ ] **Step 1: Install bcrypt**

```bash
pnpm --filter @aonde-tem/api add bcrypt
pnpm --filter @aonde-tem/api add -D @types/bcrypt
```

- [ ] **Step 2: Create HashService port**

```ts
// apps/api/src/modules/auth/application/hash.service.ts
export const HASH_SERVICE = "HASH_SERVICE";

export interface HashService {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}
```

- [ ] **Step 3: Create BcryptHashService**

```ts
// apps/api/src/modules/auth/infrastructure/bcrypt-hash.service.ts
import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import type { HashService } from "../application/hash.service.js";

@Injectable()
export class BcryptHashService implements HashService {
  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```
pnpm --filter @aonde-tem/api typecheck
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/application/hash.service.ts \
        apps/api/src/modules/auth/infrastructure/bcrypt-hash.service.ts
git commit -m "feat(api): add HashService port + BcryptHashService impl"
```

---

## Task 6: Update PrismaUserRepository

**Files:**
- Modify: `apps/api/src/modules/auth/infrastructure/prisma-user.repository.ts`

**Interfaces:**
- Consumes: `UserRepository` port from Task 3 (new methods).
- Produces: Full implementation of `findByGoogleId`, `updateCredentials`, `linkGoogleId`; `passwordHash`/`googleId` included in all hydration methods.

- [ ] **Step 1: Rewrite PrismaUserRepository**

```ts
// apps/api/src/modules/auth/infrastructure/prisma-user.repository.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma.service.js";
import type { UserRepository } from "@aonde-tem/domain";
import { User } from "@aonde-tem/domain";

function hydrate(row: {
  id: string;
  email: string;
  role: string;
  displayName: string | null;
  password: string | null;
  googleId: string | null;
  createdAt: Date;
}): User {
  return User.create({
    id: row.id,
    email: row.email,
    role: row.role as "user" | "admin",
    displayName: row.displayName ?? undefined,
    passwordHash: row.password ?? null,
    googleId: row.googleId ?? null,
    createdAt: row.createdAt,
  });
}

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? hydrate(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    return row ? hydrate(row) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { googleId } });
    return row ? hydrate(row) : null;
  }

  async save(user: User): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email.value,
        role: user.role,
        displayName: user.displayName ?? null,
        password: user.passwordHash ?? null,
        googleId: user.googleId ?? null,
      },
      update: {
        displayName: user.displayName ?? null,
        googleId: user.googleId ?? null,
      },
    });
  }

  async updateCredentials(userId: string, displayName: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { displayName, password: passwordHash },
    });
  }

  async linkGoogleId(userId: string, googleId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { googleId },
    });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```
pnpm --filter @aonde-tem/api typecheck
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/auth/infrastructure/prisma-user.repository.ts
git commit -m "feat(api): update PrismaUserRepository with passwordHash, googleId, findByGoogleId, updateCredentials, linkGoogleId"
```

---

## Task 7: LoginWithPassword use case

**Files:**
- Create: `apps/api/src/modules/auth/application/login-with-password.ts`
- Create: `apps/api/src/modules/auth/application/login-with-password.test.ts`

**Interfaces:**
- Consumes: `UserRepository` (Task 3), `HashService` (Task 5).
- Produces: `LoginWithPassword` class with `execute(email: string, password: string): Promise<User>`.

- [ ] **Step 1: Write failing tests**

```ts
// apps/api/src/modules/auth/application/login-with-password.test.ts
import { LoginWithPassword } from "./login-with-password.js";
import { UnauthorizedError } from "@aonde-tem/domain";
import { User } from "@aonde-tem/domain";
import type { UserRepository } from "@aonde-tem/domain";
import type { HashService } from "./hash.service.js";
import type { Logger } from "@aonde-tem/domain";

const nullLog: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

function makeUser(overrides: Partial<Parameters<typeof User.create>[0]> = {}): User {
  return User.create({
    id: "550e8400-e29b-41d4-a716-446655440001",
    email: "user@example.com",
    role: "user",
    passwordHash: "$2b$12$hash",
    ...overrides,
  });
}

function makeRepo(user: User | null): UserRepository {
  return {
    findById: async () => null,
    findByEmail: async () => user,
    findByGoogleId: async () => null,
    save: async () => {},
    updateCredentials: async () => {},
    linkGoogleId: async () => {},
  };
}

function makeHash(valid: boolean): HashService {
  return {
    hash: async (p) => p,
    compare: async () => valid,
  };
}

describe("LoginWithPassword", () => {
  it("returns user on valid credentials", async () => {
    const user = makeUser();
    const uc = new LoginWithPassword(makeRepo(user), makeHash(true), nullLog);
    const result = await uc.execute("user@example.com", "secret");
    expect(result.id).toBe(user.id);
  });

  it("throws UnauthorizedError when user not found", async () => {
    const uc = new LoginWithPassword(makeRepo(null), makeHash(true), nullLog);
    await expect(uc.execute("x@x.com", "secret")).rejects.toThrow(UnauthorizedError);
  });

  it("throws UnauthorizedError when user has no password (Google-only account)", async () => {
    const user = makeUser({ passwordHash: null });
    const uc = new LoginWithPassword(makeRepo(user), makeHash(true), nullLog);
    await expect(uc.execute("user@example.com", "secret")).rejects.toThrow(UnauthorizedError);
  });

  it("throws UnauthorizedError on wrong password", async () => {
    const user = makeUser();
    const uc = new LoginWithPassword(makeRepo(user), makeHash(false), nullLog);
    await expect(uc.execute("user@example.com", "wrong")).rejects.toThrow(UnauthorizedError);
  });

  it("normalises email before lookup", async () => {
    const repo = makeRepo(makeUser());
    const spy = jest.spyOn(repo, "findByEmail");
    const uc = new LoginWithPassword(repo, makeHash(true), nullLog);
    await uc.execute("  USER@Example.com  ", "secret");
    expect(spy).toHaveBeenCalledWith("user@example.com");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
pnpm --filter @aonde-tem/api test -- --testPathPattern=login-with-password
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement LoginWithPassword**

```ts
// apps/api/src/modules/auth/application/login-with-password.ts
import { UnauthorizedError } from "@aonde-tem/domain";
import type { UserRepository, User, Logger } from "@aonde-tem/domain";
import type { HashService } from "./hash.service.js";

export class LoginWithPassword {
  constructor(
    private readonly users: UserRepository,
    private readonly hash: HashService,
    private readonly log: Logger,
  ) {}

  async execute(email: string, password: string): Promise<User> {
    const normalized = email.trim().toLowerCase();
    const user = await this.users.findByEmail(normalized);
    if (!user || !user.hasPassword()) {
      throw new UnauthorizedError("Invalid credentials");
    }
    const valid = await this.hash.compare(password, user.passwordHash!);
    if (!valid) {
      this.log.warn({ email: normalized }, "bad password attempt");
      throw new UnauthorizedError("Invalid credentials");
    }
    return user;
  }
}
```

- [ ] **Step 4: Run tests**

```
pnpm --filter @aonde-tem/api test -- --testPathPattern=login-with-password
```
Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/application/login-with-password.ts \
        apps/api/src/modules/auth/application/login-with-password.test.ts
git commit -m "feat(api): add LoginWithPassword use case"
```

---

## Task 8: CompleteRegistration use case

**Files:**
- Create: `apps/api/src/modules/auth/application/complete-registration.ts`
- Create: `apps/api/src/modules/auth/application/complete-registration.test.ts`

**Interfaces:**
- Consumes: `UserRepository` (Task 3), `HashService` (Task 5).
- Produces: `CompleteRegistration` class with `execute(userId: string, displayName: string, password: string): Promise<User>`.

- [ ] **Step 1: Write failing tests**

```ts
// apps/api/src/modules/auth/application/complete-registration.test.ts
import { CompleteRegistration } from "./complete-registration.js";
import { UnauthorizedError } from "@aonde-tem/domain";
import { User } from "@aonde-tem/domain";
import type { UserRepository } from "@aonde-tem/domain";
import type { HashService } from "./hash.service.js";
import type { Logger } from "@aonde-tem/domain";

const nullLog: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

const USER_ID = "550e8400-e29b-41d4-a716-446655440001";

function makeNewUser(): User {
  return User.create({ id: USER_ID, email: "u@b.com", role: "user" });
}

function makeExistingUser(): User {
  return User.create({ id: USER_ID, email: "u@b.com", role: "user", passwordHash: "$2b$12$x" });
}

function makeRepo(user: User | null): jest.Mocked<UserRepository> {
  return {
    findById: jest.fn(async () => user),
    findByEmail: jest.fn(async () => null),
    findByGoogleId: jest.fn(async () => null),
    save: jest.fn(async () => {}),
    updateCredentials: jest.fn(async () => {}),
    linkGoogleId: jest.fn(async () => {}),
  };
}

const fakeHash: HashService = {
  hash: async (_p) => "$2b$12$hashed",
  compare: async () => false,
};

describe("CompleteRegistration", () => {
  it("hashes password and calls updateCredentials", async () => {
    const repo = makeRepo(makeNewUser());
    const uc = new CompleteRegistration(repo, fakeHash, nullLog);
    await uc.execute(USER_ID, "Ana Silva", "secret123");
    expect(repo.updateCredentials).toHaveBeenCalledWith(USER_ID, "Ana Silva", "$2b$12$hashed");
  });

  it("throws UnauthorizedError when user not found", async () => {
    const repo = makeRepo(null);
    const uc = new CompleteRegistration(repo, fakeHash, nullLog);
    await expect(uc.execute(USER_ID, "Ana", "secret")).rejects.toThrow(UnauthorizedError);
  });

  it("throws UnauthorizedError when user already has password", async () => {
    const repo = makeRepo(makeExistingUser());
    const uc = new CompleteRegistration(repo, fakeHash, nullLog);
    await expect(uc.execute(USER_ID, "Ana", "secret")).rejects.toThrow(UnauthorizedError);
  });

  it("returns the updated user after registration", async () => {
    const updated = User.create({
      id: USER_ID,
      email: "u@b.com",
      role: "user",
      displayName: "Ana Silva",
      passwordHash: "$2b$12$hashed",
    });
    const repo = makeRepo(makeNewUser());
    repo.findById
      .mockResolvedValueOnce(makeNewUser())
      .mockResolvedValueOnce(updated);
    const uc = new CompleteRegistration(repo, fakeHash, nullLog);
    const result = await uc.execute(USER_ID, "Ana Silva", "secret123");
    expect(result.displayName).toBe("Ana Silva");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
pnpm --filter @aonde-tem/api test -- --testPathPattern=complete-registration
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement CompleteRegistration**

```ts
// apps/api/src/modules/auth/application/complete-registration.ts
import { UnauthorizedError } from "@aonde-tem/domain";
import type { UserRepository, User, Logger } from "@aonde-tem/domain";
import type { HashService } from "./hash.service.js";

export class CompleteRegistration {
  constructor(
    private readonly users: UserRepository,
    private readonly hash: HashService,
    private readonly log: Logger,
  ) {}

  async execute(userId: string, displayName: string, password: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedError("User not found");
    if (user.hasPassword()) throw new UnauthorizedError("Registration already complete");
    const passwordHash = await this.hash.hash(password);
    await this.users.updateCredentials(userId, displayName.trim(), passwordHash);
    this.log.info({ userId }, "registration complete");
    const updated = await this.users.findById(userId);
    return updated!;
  }
}
```

- [ ] **Step 4: Run tests**

```
pnpm --filter @aonde-tem/api test -- --testPathPattern=complete-registration
```
Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/application/complete-registration.ts \
        apps/api/src/modules/auth/application/complete-registration.test.ts
git commit -m "feat(api): add CompleteRegistration use case"
```

---

## Task 9: LoginWithGoogle use case + GoogleStrategy

**Files:**
- Create: `apps/api/src/modules/auth/application/login-with-google.ts`
- Create: `apps/api/src/modules/auth/infrastructure/google.strategy.ts`

**Interfaces:**
- Produces:
  - `LoginWithGoogle` class with `execute(googleId: string, email: string, displayName: string): Promise<User>`
  - `GoogleStrategy` Passport strategy named `'google'`

- [ ] **Step 1: Install Passport packages**

```bash
pnpm --filter @aonde-tem/api add @nestjs/passport passport passport-google-oauth20
pnpm --filter @aonde-tem/api add -D @types/passport-google-oauth20
```

- [ ] **Step 2: Implement LoginWithGoogle**

```ts
// apps/api/src/modules/auth/application/login-with-google.ts
import type { UserRepository, User, Logger } from "@aonde-tem/domain";
import { User as UserEntity } from "@aonde-tem/domain";

export class LoginWithGoogle {
  constructor(
    private readonly users: UserRepository,
    private readonly log: Logger,
  ) {}

  async execute(googleId: string, email: string, displayName: string): Promise<User> {
    const byGoogleId = await this.users.findByGoogleId(googleId);
    if (byGoogleId) return byGoogleId;

    const byEmail = await this.users.findByEmail(email.toLowerCase());
    if (byEmail) {
      await this.users.linkGoogleId(byEmail.id, googleId);
      this.log.info({ userId: byEmail.id }, "linked google id to existing account");
      return byEmail;
    }

    const { randomUUID } = await import("node:crypto");
    const newUser = UserEntity.create({
      id: randomUUID(),
      email: email.toLowerCase(),
      role: "user",
      displayName: displayName.trim() || undefined,
      googleId,
    });
    await this.users.save(newUser);
    this.log.info({ userId: newUser.id }, "new user created via google oauth");
    return newUser;
  }
}
```

- [ ] **Step 3: Implement GoogleStrategy**

```ts
// apps/api/src/modules/auth/infrastructure/google.strategy.ts
import { Injectable, Inject } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, type VerifyCallback, type Profile } from "passport-google-oauth20";
import type { User } from "@aonde-tem/domain";
import { LoginWithGoogle } from "../application/login-with-google.js";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(@Inject(LoginWithGoogle) private readonly loginWithGoogle: LoginWithGoogle) {
    super({
      clientID: process.env["GOOGLE_CLIENT_ID"] ?? "",
      clientSecret: process.env["GOOGLE_CLIENT_SECRET"] ?? "",
      callbackURL: process.env["GOOGLE_CALLBACK_URL"] ?? "http://localhost:3000/api/auth/google/callback",
      scope: ["email", "profile"],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value ?? "";
    const displayName = profile.displayName ?? "";
    const user: User = await this.loginWithGoogle.execute(profile.id, email, displayName);
    done(null, user);
  }
}
```

- [ ] **Step 4: Verify TypeScript**

```
pnpm --filter @aonde-tem/api typecheck
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/application/login-with-google.ts \
        apps/api/src/modules/auth/infrastructure/google.strategy.ts
git commit -m "feat(api): add LoginWithGoogle use case + GoogleStrategy (Passport)"
```

---

## Task 10: Auth controller — new endpoints + wire module

**Files:**
- Modify: `apps/api/src/modules/auth/presentation/auth.controller.ts`
- Modify: `apps/api/src/modules/auth/auth.module.ts`
- Modify: `apps/api/src/modules/auth/auth.controller.spec.ts`

**Interfaces:**
- Consumes: `LoginWithPassword` (Task 7), `CompleteRegistration` (Task 8), `LoginWithGoogle` + `GoogleStrategy` (Task 9).
- Produces:
  - `POST /api/auth/login` → `JwtResponse`
  - `POST /api/auth/complete-registration` → `JwtResponse`
  - `GET /api/auth/google` → redirect to Google
  - `GET /api/auth/google/callback` → `302` to `/?token=<jwt>`
  - `POST /api/auth/verify-code` → `JwtResponse | RegistrationTokenResponse`

- [ ] **Step 1: Rewrite auth controller**

```ts
// apps/api/src/modules/auth/presentation/auth.controller.ts
import {
  Controller, Post, Get, Body, Inject, Req, Res, UseGuards, UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";
import {
  sendMagicCodeSchema,
  verifyMagicCodeSchema,
  loginSchema,
  completeRegistrationSchema,
  type JwtResponse,
  type RegistrationTokenResponse,
} from "@aonde-tem/contracts";
import { JwtService } from "@nestjs/jwt";
import type { User } from "@aonde-tem/domain";
import { SendMagicCode } from "../application/send-magic-code.js";
import { VerifyMagicCode } from "../application/verify-magic-code.js";
import { LoginWithPassword } from "../application/login-with-password.js";
import { CompleteRegistration } from "../application/complete-registration.js";

function toJwtResponse(user: User, jwt: JwtService): JwtResponse {
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email.value, role: user.role },
    { expiresIn: "15m" },
  );
  return {
    accessToken,
    user: {
      id: user.id,
      email: user.email.value,
      displayName: user.displayName ?? null,
      role: user.role,
    },
  };
}

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(SendMagicCode) private readonly sendCode: SendMagicCode,
    @Inject(VerifyMagicCode) private readonly verifyCode: VerifyMagicCode,
    @Inject(LoginWithPassword) private readonly loginWithPassword: LoginWithPassword,
    @Inject(CompleteRegistration) private readonly completeReg: CompleteRegistration,
    private readonly jwt: JwtService,
  ) {}

  @Post("send-code")
  async sendMagicCode(@Body() body: unknown): Promise<{ message: string }> {
    const dto = sendMagicCodeSchema.parse(body);
    await this.sendCode.execute(dto.email);
    return { message: "Code sent" };
  }

  @Post("verify-code")
  async verifyMagicCode(
    @Body() body: unknown,
  ): Promise<JwtResponse | RegistrationTokenResponse> {
    const dto = verifyMagicCodeSchema.parse(body);
    const user = await this.verifyCode.execute(dto.email, dto.code);

    if (!user.hasPassword()) {
      const registrationToken = this.jwt.sign(
        { sub: user.id, email: user.email.value, type: "registration" },
        { expiresIn: "10m" },
      );
      return { registrationToken, email: user.email.value };
    }

    return toJwtResponse(user, this.jwt);
  }

  @Post("login")
  async login(@Body() body: unknown): Promise<JwtResponse> {
    const dto = loginSchema.parse(body);
    const user = await this.loginWithPassword.execute(dto.email, dto.password);
    return toJwtResponse(user, this.jwt);
  }

  @Post("complete-registration")
  async completeRegistration(@Body() body: unknown): Promise<JwtResponse> {
    const dto = completeRegistrationSchema.parse(body);
    let payload: { sub: string; type: string };
    try {
      payload = this.jwt.verify(dto.registrationToken) as { sub: string; type: string };
    } catch {
      throw new UnauthorizedException("Invalid registration token");
    }
    if (payload.type !== "registration") throw new UnauthorizedException("Invalid token type");
    const user = await this.completeReg.execute(payload.sub, dto.displayName, dto.password);
    return toJwtResponse(user, this.jwt);
  }

  @Get("google")
  @UseGuards(AuthGuard("google"))
  async googleAuth(): Promise<void> {
    // Passport redirects to Google — no body needed.
  }

  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  async googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const user = req.user as User;
    const { accessToken } = toJwtResponse(user, this.jwt);
    const frontendUrl = process.env["FRONTEND_URL"] ?? "http://localhost:5173";
    res.redirect(`${frontendUrl}/?token=${accessToken}`);
  }
}
```

- [ ] **Step 2: Wire new providers in auth.module.ts**

```ts
// apps/api/src/modules/auth/auth.module.ts
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import type { Logger } from "@aonde-tem/domain";
import { PrismaService } from "../../shared/prisma.service.js";
import { PinoLoggerAdapter, LOGGER } from "../../shared/logging/pino-logger.adapter.js";
import { PrismaUserRepository } from "./infrastructure/prisma-user.repository.js";
import { PrismaMagicCodeRepository } from "./infrastructure/prisma-magic-code.repository.js";
import { ConsoleEmailService } from "./infrastructure/resend-email.service.js";
import { BcryptHashService } from "./infrastructure/bcrypt-hash.service.js";
import { GoogleStrategy } from "./infrastructure/google.strategy.js";
import { SendMagicCode } from "./application/send-magic-code.js";
import { VerifyMagicCode } from "./application/verify-magic-code.js";
import { LoginWithPassword } from "./application/login-with-password.js";
import { CompleteRegistration } from "./application/complete-registration.js";
import { LoginWithGoogle } from "./application/login-with-google.js";
import { AuthController } from "./presentation/auth.controller.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { HASH_SERVICE } from "./application/hash.service.js";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env["JWT_SECRET"] ?? "dev-secret-change-in-production",
      signOptions: { expiresIn: "15m" },
    }),
  ],
  controllers: [AuthController],
  providers: [
    PrismaService,
    { provide: LOGGER, useClass: PinoLoggerAdapter },
    PrismaUserRepository,
    PrismaMagicCodeRepository,
    ConsoleEmailService,
    { provide: HASH_SERVICE, useClass: BcryptHashService },
    BcryptHashService,
    GoogleStrategy,
    JwtAuthGuard,
    {
      provide: SendMagicCode,
      useFactory: (
        users: PrismaUserRepository,
        codes: PrismaMagicCodeRepository,
        email: ConsoleEmailService,
        log: Logger,
      ) => new SendMagicCode(users, codes, email, log),
      inject: [PrismaUserRepository, PrismaMagicCodeRepository, ConsoleEmailService, LOGGER],
    },
    {
      provide: VerifyMagicCode,
      useFactory: (users: PrismaUserRepository, codes: PrismaMagicCodeRepository, log: Logger) =>
        new VerifyMagicCode(users, codes, log),
      inject: [PrismaUserRepository, PrismaMagicCodeRepository, LOGGER],
    },
    {
      provide: LoginWithPassword,
      useFactory: (users: PrismaUserRepository, hash: BcryptHashService, log: Logger) =>
        new LoginWithPassword(users, hash, log),
      inject: [PrismaUserRepository, BcryptHashService, LOGGER],
    },
    {
      provide: CompleteRegistration,
      useFactory: (users: PrismaUserRepository, hash: BcryptHashService, log: Logger) =>
        new CompleteRegistration(users, hash, log),
      inject: [PrismaUserRepository, BcryptHashService, LOGGER],
    },
    {
      provide: LoginWithGoogle,
      useFactory: (users: PrismaUserRepository, log: Logger) =>
        new LoginWithGoogle(users, log),
      inject: [PrismaUserRepository, LOGGER],
    },
  ],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 3: Add integration tests for new endpoints**

```ts
// apps/api/src/modules/auth/auth.controller.spec.ts
// Add these tests after existing ones:

it("POST /api/auth/login returns 401 for unknown email", async () => {
  await request(app.getHttpServer())
    .post("/api/auth/login")
    .send({ email: "nobody@example.com", password: "wrong" })
    .expect(401);
});

it("POST /api/auth/login returns 400 for missing password", async () => {
  await request(app.getHttpServer())
    .post("/api/auth/login")
    .send({ email: "test@example.com" })
    .expect(400);
});

it("POST /api/auth/complete-registration returns 401 for bad token", async () => {
  await request(app.getHttpServer())
    .post("/api/auth/complete-registration")
    .send({ registrationToken: "bad.token.here", displayName: "Ana", password: "secret123" })
    .expect(401);
});
```

- [ ] **Step 4: Run tests**

```
pnpm --filter @aonde-tem/api test
```
Expected: all auth tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/presentation/auth.controller.ts \
        apps/api/src/modules/auth/auth.module.ts \
        apps/api/src/modules/auth/auth.controller.spec.ts
git commit -m "feat(api): add /login, /complete-registration, /google OAuth endpoints; verify-code issues registration token for new users"
```

---

## Task 11: Frontend auth API + mutations

**Files:**
- Modify: `apps/web/src/features/auth/api/auth.api.ts`
- Modify: `apps/web/src/features/auth/api/auth.mutations.ts`

**Interfaces:**
- Produces:
  - `loginWithPassword(dto: LoginDto): Promise<JwtResponse>`
  - `completeRegistration(dto: CompleteRegistrationDto): Promise<JwtResponse>`
  - Updated `verifyMagicCode` returns `JwtResponse | RegistrationTokenResponse`
  - `useLoginWithPassword()` mutation
  - `useCompleteRegistration()` mutation (calls `setSession` on success)
  - `useVerifyMagicCode()` — updated, no longer calls `setSession` directly if registrationToken received

- [ ] **Step 1: Update auth.api.ts**

```ts
// apps/web/src/features/auth/api/auth.api.ts
import {
  jwtResponseSchema,
  registrationTokenResponseSchema,
  type SendMagicCodeDto,
  type VerifyMagicCodeDto,
  type JwtResponse,
  type RegistrationTokenResponse,
  type LoginDto,
  type CompleteRegistrationDto,
} from "@aonde-tem/contracts";
import { http } from "../../../shared/api/http.js";

export async function sendMagicCode(dto: SendMagicCodeDto): Promise<void> {
  const res = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/auth/send-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error(`send-code failed: ${res.status}`);
}

export async function verifyMagicCode(
  dto: VerifyMagicCodeDto,
): Promise<JwtResponse | RegistrationTokenResponse> {
  const res = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/auth/verify-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error(`verify-code failed: ${res.status}`);
  const json = await res.json();
  const jwt = jwtResponseSchema.safeParse(json);
  if (jwt.success) return jwt.data;
  return registrationTokenResponseSchema.parse(json);
}

export async function loginWithPassword(dto: LoginDto): Promise<JwtResponse> {
  return http("/api/auth/login", jwtResponseSchema, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function completeRegistration(dto: CompleteRegistrationDto): Promise<JwtResponse> {
  return http("/api/auth/complete-registration", jwtResponseSchema, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}
```

- [ ] **Step 2: Update auth.mutations.ts**

```ts
// apps/web/src/features/auth/api/auth.mutations.ts
import { useMutation } from "@tanstack/react-query";
import {
  sendMagicCode,
  verifyMagicCode,
  loginWithPassword,
  completeRegistration,
} from "./auth.api.js";
import { useAppStore } from "../../../app/store/index.js";
import type { JwtResponse, RegistrationTokenResponse } from "@aonde-tem/contracts";

export function useSendMagicCode() {
  return useMutation({ mutationFn: sendMagicCode });
}

export function useVerifyMagicCode() {
  const setSession = useAppStore((s) => s.setSession);

  return useMutation({
    mutationFn: verifyMagicCode,
    onSuccess: (data: JwtResponse | RegistrationTokenResponse) => {
      if ("accessToken" in data) {
        setSession(data.accessToken, data.user);
      }
      // If registrationToken, the caller (SignUpPage) handles navigation.
    },
  });
}

export function useLoginWithPassword() {
  const setSession = useAppStore((s) => s.setSession);

  return useMutation({
    mutationFn: loginWithPassword,
    onSuccess: (data) => {
      setSession(data.accessToken, data.user);
    },
  });
}

export function useCompleteRegistration() {
  const setSession = useAppStore((s) => s.setSession);

  return useMutation({
    mutationFn: completeRegistration,
    onSuccess: (data) => {
      setSession(data.accessToken, data.user);
    },
  });
}
```

- [ ] **Step 3: Verify TypeScript**

```
pnpm --filter @aonde-tem/web typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/auth/api/auth.api.ts \
        apps/web/src/features/auth/api/auth.mutations.ts
git commit -m "feat(web): update auth API — loginWithPassword, completeRegistration, registrationToken handling"
```

---

## Task 12: Rewrite SignInPage as login-only

**Files:**
- Modify: `apps/web/src/features/auth/ui/SignInPage.tsx`

**Interfaces:**
- Consumes: `useLoginWithPassword` (Task 11).
- Produces: Login page with Google button + email+password form + "Criar conta" link to `/signup`.

- [ ] **Step 1: Rewrite SignInPage.tsx**

```tsx
// apps/web/src/features/auth/ui/SignInPage.tsx
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginDto } from "@aonde-tem/contracts";
import { useLoginWithPassword } from "../api/auth.mutations.js";

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const login = useLoginWithPassword();
  const form = useForm<LoginDto>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginDto) {
    await login.mutateAsync(data);
    navigate(from, { replace: true });
  }

  const googleUrl = `${import.meta.env.VITE_API_URL ?? ""}/api/auth/google`;

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-text mb-8">Entrar</h1>

        {/* Google */}
        <a
          href={googleUrl}
          className="flex items-center justify-center gap-3 w-full border border-border rounded-xl px-4 py-3 text-text text-sm font-medium mb-4 hover:bg-surface-alt transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Entrar com Google
        </a>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-text-muted text-xs">ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email + password */}
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <label className="block text-sm font-medium text-text mb-1" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="seu@email.com"
            className="w-full border border-border rounded-xl px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-brand mb-3"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-error text-sm mb-2">{form.formState.errors.email.message}</p>
          )}

          <label className="block text-sm font-medium text-text mb-1" htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full border border-border rounded-xl px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-brand mb-3"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-error text-sm mb-2">{form.formState.errors.password.message}</p>
          )}

          {login.isError && (
            <p className="text-error text-sm mb-3" role="alert">
              {login.error instanceof Error && login.error.message.includes("google")
                ? "Esta conta usa login com Google."
                : "E-mail ou senha incorretos."}
            </p>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full bg-brand text-white font-semibold py-3 rounded-xl disabled:opacity-60 mb-4"
          >
            {login.isPending ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted">
          Não tem conta?{" "}
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="text-brand font-medium"
          >
            Criar conta
          </button>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run web tests**

```
pnpm --filter @aonde-tem/web test
```
Expected: PASS (no tests for SignInPage directly).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/auth/ui/SignInPage.tsx
git commit -m "feat(web): rewrite SignInPage as login-only (Google + email+password)"
```

---

## Task 13: SignUpPage — 3-step magic code wizard

**Files:**
- Create: `apps/web/src/features/auth/ui/SignUpPage.tsx`

**Interfaces:**
- Consumes: `useSendMagicCode`, `useVerifyMagicCode`, `useCompleteRegistration` (Task 11).
- Produces: `SignUpPage` component with 3 steps: email → code → name+password.

- [ ] **Step 1: Create SignUpPage.tsx**

```tsx
// apps/web/src/features/auth/ui/SignUpPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { sendMagicCodeSchema, type SendMagicCodeDto } from "@aonde-tem/contracts";
import {
  useSendMagicCode,
  useVerifyMagicCode,
  useCompleteRegistration,
} from "../api/auth.mutations.js";

const codeSchema = z.object({ code: z.string().length(6).regex(/^\d{6}$/) });
type CodeForm = z.infer<typeof codeSchema>;

const profileSchema = z
  .object({
    displayName: z.string().min(1, "Nome obrigatório").max(80),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  });
type ProfileForm = z.infer<typeof profileSchema>;

type Step = "email" | "code" | "profile";

export function SignUpPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");

  const sendCode = useSendMagicCode();
  const verifyCode = useVerifyMagicCode();
  const completeReg = useCompleteRegistration();

  const emailForm = useForm<SendMagicCodeDto>({ resolver: zodResolver(sendMagicCodeSchema) });
  const codeForm = useForm<CodeForm>({ resolver: zodResolver(codeSchema) });
  const profileForm = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });

  async function onSubmitEmail(data: SendMagicCodeDto) {
    setEmail(data.email);
    await sendCode.mutateAsync({ email: data.email });
    setStep("code");
  }

  async function onSubmitCode(data: CodeForm) {
    const result = await verifyCode.mutateAsync({ email, code: data.code });
    if ("registrationToken" in result) {
      setRegistrationToken(result.registrationToken);
      setStep("profile");
    } else {
      // Existing user who already had a password — just log them in.
      navigate("/", { replace: true });
    }
  }

  async function onSubmitProfile(data: ProfileForm) {
    await completeReg.mutateAsync({
      registrationToken,
      displayName: data.displayName,
      password: data.password,
    });
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {step === "email" && (
          <>
            <h1 className="text-2xl font-bold text-text mb-2">Criar conta</h1>
            <p className="text-text-muted text-sm mb-8">
              Digite seu e-mail para receber um código de verificação.
            </p>
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
            <p className="text-center text-sm text-text-muted mt-4">
              Já tem conta?{" "}
              <button
                type="button"
                onClick={() => navigate("/signin")}
                className="text-brand font-medium"
              >
                Entrar
              </button>
            </p>
          </>
        )}

        {step === "code" && (
          <>
            <h1 className="text-2xl font-bold text-text mb-2">Código de verificação</h1>
            <p className="text-text-muted text-sm mb-8">
              Enviamos um código de 6 dígitos para {email}.
            </p>
            <form onSubmit={codeForm.handleSubmit(onSubmitCode)} noValidate>
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
                <p className="text-error text-sm mb-3" role="alert">
                  Código inválido ou expirado. Tente novamente.
                </p>
              )}
              <button
                type="submit"
                disabled={verifyCode.isPending}
                className="w-full bg-brand text-white font-semibold py-3 rounded-xl disabled:opacity-60"
              >
                {verifyCode.isPending ? "Verificando…" : "Confirmar"}
              </button>
              <button
                type="button"
                onClick={() => setStep("email")}
                className="w-full text-text-muted text-sm mt-3 py-2 min-h-11"
              >
                Usar outro e-mail
              </button>
            </form>
          </>
        )}

        {step === "profile" && (
          <>
            <h1 className="text-2xl font-bold text-text mb-2">Finalize seu cadastro</h1>
            <p className="text-text-muted text-sm mb-8">
              Escolha um nome e crie uma senha para entrar sem código.
            </p>
            <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} noValidate>
              <label className="block text-sm font-medium text-text mb-1" htmlFor="displayName">
                Nome
              </label>
              <input
                id="displayName"
                type="text"
                autoComplete="name"
                placeholder="Seu nome"
                className="w-full border border-border rounded-xl px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-brand mb-3"
                {...profileForm.register("displayName")}
              />
              {profileForm.formState.errors.displayName && (
                <p className="text-error text-sm mb-2">
                  {profileForm.formState.errors.displayName.message}
                </p>
              )}

              <label className="block text-sm font-medium text-text mb-1" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                className="w-full border border-border rounded-xl px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-brand mb-3"
                {...profileForm.register("password")}
              />
              {profileForm.formState.errors.password && (
                <p className="text-error text-sm mb-2">
                  {profileForm.formState.errors.password.message}
                </p>
              )}

              <label className="block text-sm font-medium text-text mb-1" htmlFor="confirm">
                Confirmar senha
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                placeholder="Repita a senha"
                className="w-full border border-border rounded-xl px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-brand mb-3"
                {...profileForm.register("confirm")}
              />
              {profileForm.formState.errors.confirm && (
                <p className="text-error text-sm mb-2">
                  {profileForm.formState.errors.confirm.message}
                </p>
              )}

              {completeReg.isError && (
                <p className="text-error text-sm mb-3" role="alert">
                  Não foi possível criar a conta. Tente novamente.
                </p>
              )}

              <button
                type="submit"
                disabled={completeReg.isPending}
                className="w-full bg-brand text-white font-semibold py-3 rounded-xl disabled:opacity-60"
              >
                {completeReg.isPending ? "Criando conta…" : "Criar conta"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run web tests**

```
pnpm --filter @aonde-tem/web test
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/auth/ui/SignUpPage.tsx
git commit -m "feat(web): add SignUpPage — 3-step magic-code registration wizard"
```

---

## Task 14: Router — /signup route + Google token capture

**Files:**
- Modify: `apps/web/src/app/router.tsx`

**Interfaces:**
- Consumes: `SignUpPage` (Task 13), `setSession` from Zustand session slice.
- Produces: `/signup` route; `RootLayout` captures `?token=` from Google OAuth redirect and calls `setSession`.

- [ ] **Step 1: Update router.tsx**

```tsx
// apps/web/src/app/router.tsx
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { createBrowserRouter, Outlet, useNavigate, useLocation } from "react-router-dom";
import { ProtectedRoute } from "../features/auth/ui/ProtectedRoute.js";
import { AppHeader } from "../features/auth/ui/AppHeader.js";
import { useAppStore } from "./store/index.js";

const SeekPage = lazy(() =>
  import("../features/seek/ui/SeekPage.js").then((m) => ({ default: m.SeekPage })),
);
const ReportPage = lazy(() =>
  import("../features/report/ui/ReportPage.js").then((m) => ({ default: m.ReportPage })),
);
const SignInPage = lazy(() =>
  import("../features/auth/ui/SignInPage.js").then((m) => ({ default: m.SignInPage })),
);
const SignUpPage = lazy(() =>
  import("../features/auth/ui/SignUpPage.js").then((m) => ({ default: m.SignUpPage })),
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

function GoogleTokenCapture() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAppStore((s) => s.setSession);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    if (!token) return;

    // Decode JWT payload to get user info (no signature check needed — server already validated)
    try {
      const payloadB64 = token.split(".")[1];
      const payload = JSON.parse(atob(payloadB64)) as {
        sub: string;
        email: string;
        role: "user" | "admin";
      };
      setSession(token, {
        id: payload.sub,
        email: payload.email,
        displayName: null,
        role: payload.role,
      });
      // Remove ?token= from URL without navigation
      const clean = new URL(window.location.href);
      clean.searchParams.delete("token");
      window.history.replaceState({}, "", clean.pathname + clean.search);
    } catch {
      // Malformed token — ignore
    }
    navigate("/", { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function RootLayout() {
  return (
    <>
      <GoogleTokenCapture />
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
  },
]);
```

- [ ] **Step 2: Add .env.example entries**

Open `.env.example` (or create it if it doesn't exist) and append:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

- [ ] **Step 3: Run all tests**

```
pnpm test
```
Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/router.tsx .env.example
git commit -m "feat(web): add /signup route and Google OAuth token capture in RootLayout"
```

---

## Self-Review

### Spec coverage

| Spec requirement | Task |
|---|---|
| Google OAuth endpoints | 9, 10 |
| Email+password login | 7, 10, 12 |
| Magic-code sign-up wizard | 11, 13 |
| Registration token for new users | 10 |
| "Ver no mapa" flies in-app map | 1 |
| Hide AppHeader login btn on auth routes | 1 |
| Range slider hidden when place selected | 1 |
| `password`/`googleId` schema columns | 2 |
| Domain User entity extended | 3 |
| New Zod contracts | 4 |
| BcryptHashService | 5 |
| PrismaUserRepository extended | 6 |
| Google-only account error in SignInPage | 12 |
| `/signup` route | 14 |
| `.env.example` Google vars | 14 |

All spec requirements covered.

### Placeholder scan

No TBDs, TODOs, or "similar to above" patterns. All code blocks are complete.

### Type consistency

- `User.passwordHash` defined in Task 3, consumed in Tasks 6, 7, 8 ✓
- `UserRepository.findByGoogleId / updateCredentials / linkGoogleId` defined in Task 3, implemented in Task 6 ✓
- `HashService.hash / compare` defined in Task 5, consumed in Tasks 7, 8 ✓
- `LoginWithPassword` class name consistent across Tasks 7, 10 ✓
- `CompleteRegistration` class name consistent across Tasks 8, 10 ✓
- `RegistrationTokenResponse` type defined in Task 4, consumed in Tasks 11, 13 ✓
- `onFlyTo(coords: { lat: number; lng: number })` defined in Task 1 PlaceModal, passed in Task 1 MapView ✓
