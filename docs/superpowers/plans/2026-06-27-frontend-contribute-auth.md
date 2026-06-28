# Frontend — Contribute Flow + Auth UI + Data Quality — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the write side of the UI: magic-code sign-in flow, product autocomplete, place pin/GPS picker, price input with BRL mask, confirmation step — so a user can contribute a discovery in ~30s.

**Architecture:** Feature-sliced: `features/auth/{ui,model,api}` + `features/report/{ui,model,api}`. Auth state (JWT token) lives in Zustand `session` slice (in-memory). Report form uses React state; TanStack Query mutation for submission.

**Tech Stack:** React 18, Vite, TanStack Query, Zustand, Tailwind CSS v4, TypeScript strict, `react-hook-form` + `@hookform/resolvers/zod`.

## Global Constraints

- **Prerequisite:** Plans A, B, C, D must be complete — auth API + discovery write API + map (for pin picker) must exist
- JWT stored in Zustand **memory only** (never localStorage — XSS risk); page refresh = signed out
- Form validation mirrors the backend: Zod schemas from `@app/contracts` (`createSightingSchema`)
- BRL price input: numeric keyboard on mobile, comma decimal separator, mask format "R$ 0,00"
- Place reuse: if user's GPS is within 100m of an existing place in the seed/database, suggest it first (AT-134)
- Confirmation step: show product name + place + price + quantity before final submit (AT-133)
- All text in Brazilian Portuguese
- Apply **Impeccable** design skill before writing forms: bottom-sheet flows, step indicators, large tap targets, one-handed
- Backlog items: AT-054, AT-055 (already in Plan D), AT-130, AT-132, AT-133, AT-134 (data quality), auth UI (E5/E10)

---

## File Structure

**New files:**
- `apps/web/src/features/auth/model/session.slice.ts`
- `apps/web/src/features/auth/api/auth.api.ts`
- `apps/web/src/features/auth/api/auth.mutations.ts`
- `apps/web/src/features/auth/ui/SignInPage.tsx`
- `apps/web/src/features/auth/ui/MagicCodeStep.tsx`
- `apps/web/src/features/report/api/report.api.ts`
- `apps/web/src/features/report/api/product-autocomplete.api.ts`
- `apps/web/src/features/report/ui/ReportPage.tsx`
- `apps/web/src/features/report/ui/ProductPicker.tsx`
- `apps/web/src/features/report/ui/PlacePicker.tsx`
- `apps/web/src/features/report/ui/PriceInput.tsx`
- `apps/web/src/features/report/ui/ConfirmStep.tsx`

**Modified files:**
- `apps/web/src/app/store/types.ts` — add `SessionSlice` to `AppStore`
- `apps/web/src/app/store/index.ts` — compose `session` slice
- `apps/web/src/features/seek/ui/SeekPage.tsx` — wire FAB to `/report`
- `apps/web/src/main.tsx` — add routing (seek `/` and report `/report`, sign-in `/signin`)

---

### Task 1: Session Zustand slice (auth state in memory)

**Files:**
- Create: `apps/web/src/features/auth/model/session.slice.ts`

**Interfaces:**
- Produces: `SessionSlice` with `accessToken`, `user`, `setSession`, `clearSession`, `isAuthenticated()`

- [ ] **Step 1: Write session.slice.ts**

```typescript
// apps/web/src/features/auth/model/session.slice.ts
import type { SliceCreator } from "../../../app/store/types.js";

interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  role: "user" | "admin";
}

export interface SessionSlice {
  accessToken: string | null;
  sessionUser: SessionUser | null;
  setSession: (token: string, user: SessionUser) => void;
  clearSession: () => void;
  isAuthenticated: () => boolean;
}

export const createSessionSlice: SliceCreator<SessionSlice> = (set, get) => ({
  accessToken: null,
  sessionUser: null,
  setSession: (accessToken, sessionUser) => set({ accessToken, sessionUser }),
  clearSession: () => set({ accessToken: null, sessionUser: null }),
  isAuthenticated: () => get().accessToken !== null,
});
```

- [ ] **Step 2: Add SessionSlice to AppStore types**

Open `apps/web/src/app/store/types.ts` and add `SessionSlice`:

```typescript
import type { MapSlice } from "../../features/map/model/map.slice.js";
import type { SessionSlice } from "../../features/auth/model/session.slice.js";
import type { UiSlice } from "../store/ui.slice.js";

export type AppStore = MapSlice & SessionSlice & UiSlice;
```

- [ ] **Step 3: Compose slice in store index**

Open `apps/web/src/app/store/index.ts` and add `createSessionSlice`:

```typescript
import { createSessionSlice } from "../../features/auth/model/session.slice.js";

// In the immer(...) body, add:
// ...createSessionSlice(...a),
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/auth/model/ apps/web/src/app/store/
git commit -m "feat(web): SessionSlice — in-memory JWT auth state (Zustand)"
```

---

### Task 2: Auth API + TanStack Query mutations

**Files:**
- Create: `apps/web/src/features/auth/api/auth.api.ts`
- Create: `apps/web/src/features/auth/api/auth.mutations.ts`

**Interfaces:**
- Produces: `useSendMagicCode()`, `useVerifyMagicCode()` mutations that update SessionSlice on success

- [ ] **Step 1: Write auth.api.ts**

```typescript
// apps/web/src/features/auth/api/auth.api.ts
import { jwtResponseSchema, type SendMagicCodeDto, type VerifyMagicCodeDto, type JwtResponse } from "@app/contracts";
import { http } from "../../../shared/api/http.js";

export async function sendMagicCode(dto: SendMagicCodeDto): Promise<void> {
  await fetch("/api/auth/send-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
}

export async function verifyMagicCode(dto: VerifyMagicCodeDto): Promise<JwtResponse> {
  return http("/api/auth/verify-code", jwtResponseSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
}
```

- [ ] **Step 2: Write auth.mutations.ts**

```typescript
// apps/web/src/features/auth/api/auth.mutations.ts
import { useMutation } from "@tanstack/react-query";
import { sendMagicCode, verifyMagicCode } from "./auth.api.js";
import { useAppStore } from "../../../app/store/index.js";

export function useSendMagicCode() {
  return useMutation({ mutationFn: sendMagicCode });
}

export function useVerifyMagicCode() {
  const setSession = useAppStore((s) => s.setSession);

  return useMutation({
    mutationFn: verifyMagicCode,
    onSuccess: (data) => {
      setSession(data.accessToken, data.user);
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/auth/api/
git commit -m "feat(web): auth API fetchers + useSendMagicCode/useVerifyMagicCode mutations"
```

---

### Task 3: Sign-in UI — email → magic code → session (AT-072)

**Files:**
- Create: `apps/web/src/features/auth/ui/SignInPage.tsx`

**Interfaces:**
- Produces: two-step form: enter email → submit → enter 6-digit code → sign in; navigates to `/` on success

- [ ] **Step 1: Install react-hook-form**

```bash
pnpm --filter @app/web add react-hook-form @hookform/resolvers
```

- [ ] **Step 2: Write SignInPage**

```tsx
// apps/web/src/features/auth/ui/SignInPage.tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sendMagicCodeSchema, verifyMagicCodeSchema } from "@app/contracts";
import { useSendMagicCode, useVerifyMagicCode } from "../api/auth.mutations.js";

interface Props {
  onSuccess: () => void;
}

export function SignInPage({ onSuccess }: Props) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");

  const sendCode = useSendMagicCode();
  const verifyCode = useVerifyMagicCode();

  const emailForm = useForm({ resolver: zodResolver(sendMagicCodeSchema) });
  const codeForm = useForm({ resolver: zodResolver(verifyMagicCodeSchema) });

  async function onSubmitEmail(data: { email: string }) {
    setEmail(data.email);
    await sendCode.mutateAsync({ email: data.email });
    setStep("code");
  }

  async function onSubmitCode(data: { email: string; code: string }) {
    await verifyCode.mutateAsync(data);
    onSuccess();
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
              <p className="text-red-600 text-sm mb-3">{emailForm.formState.errors.email.message}</p>
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
          <form onSubmit={codeForm.handleSubmit((d) => onSubmitCode({ email, code: d.code }))} noValidate>
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
              <p className="text-red-600 text-sm mb-3">Código inválido ou expirado. Tente novamente.</p>
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
              className="w-full text-text-muted text-sm mt-3 py-2"
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

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/auth/ui/
git commit -m "feat(web): SignInPage — two-step magic code sign-in UI"
```

---

### Task 4: ProductPicker with autocomplete (AT-130)

**Files:**
- Create: `apps/web/src/features/report/api/product-autocomplete.api.ts`
- Create: `apps/web/src/features/report/ui/ProductPicker.tsx`

**Interfaces:**
- Produces: `<ProductPicker onSelect(product) />` with debounced autocomplete from `GET /products?q=`

- [ ] **Step 1: Write product autocomplete API**

```typescript
// apps/web/src/features/report/api/product-autocomplete.api.ts
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";

export function useProductSearch(query: string) {
  const [debouncedQuery] = useDebounce(query, 300);
  return useQuery({
    queryKey: ["products", "search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return { results: [] };
      const res = await fetch(`/api/products?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) return { results: [] };
      return res.json() as Promise<{ results: { id: string; name: string }[] }>;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 60_000,
  });
}
```

- [ ] **Step 2: Write ProductPicker**

```tsx
// apps/web/src/features/report/ui/ProductPicker.tsx
import { useState } from "react";
import { useProductSearch } from "../api/product-autocomplete.api.js";

interface SelectedProduct {
  id?: string;
  name: string;
}

interface Props {
  value: SelectedProduct | null;
  onChange: (product: SelectedProduct) => void;
}

export function ProductPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [showDropdown, setShowDropdown] = useState(false);
  const { data } = useProductSearch(query);

  const results = data?.results ?? [];

  function selectProduct(product: { id: string; name: string }) {
    onChange({ id: product.id, name: product.name });
    setQuery(product.name);
    setShowDropdown(false);
  }

  function handleChange(v: string) {
    setQuery(v);
    onChange({ name: v }); // clear id if typing a new name
    setShowDropdown(true);
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-text mb-1">Produto</label>
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        placeholder="Ex: Arroz 5kg, Leite 1L…"
        className="w-full border border-border rounded-xl px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-brand"
        autoComplete="off"
      />
      {showDropdown && results.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-lg overflow-hidden">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full text-left px-4 py-3 text-text hover:bg-surface-alt text-sm"
                onMouseDown={() => selectProduct(p)}
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.length >= 2 && results.length === 0 && (
        <p className="text-xs text-text-muted mt-1">Produto novo — será cadastrado.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/report/api/ apps/web/src/features/report/ui/ProductPicker.tsx
git commit -m "feat(web): ProductPicker with debounced autocomplete (AT-130)"
```

---

### Task 5: PlacePicker — GPS or pin (AT-134)

**Files:**
- Create: `apps/web/src/features/report/ui/PlacePicker.tsx`

**Interfaces:**
- Produces: `<PlacePicker onSelect({ lat, lng, name, placeId? }) />` with GPS button + typed place name

- [ ] **Step 1: Write PlacePicker**

```tsx
// apps/web/src/features/report/ui/PlacePicker.tsx
import { useState } from "react";
import { useGeolocation } from "../../map/model/use-geolocation.js";

interface PlaceSelection {
  lat: number;
  lng: number;
  name: string;
  placeId?: string;
}

interface Props {
  value: PlaceSelection | null;
  onChange: (place: PlaceSelection) => void;
}

export function PlacePicker({ value, onChange }: Props) {
  const { coords } = useGeolocation();
  const [placeName, setPlaceName] = useState(value?.name ?? "");

  function useCurrentLocation() {
    if (!coords) return;
    onChange({ lat: coords.lat, lng: coords.lng, name: placeName || "Localização atual" });
  }

  return (
    <div>
      <label className="block text-sm font-medium text-text mb-1">Local</label>
      <input
        type="text"
        value={placeName}
        onChange={(e) => {
          setPlaceName(e.target.value);
          if (value) onChange({ ...value, name: e.target.value });
        }}
        placeholder="Nome do mercado / estabelecimento"
        className="w-full border border-border rounded-xl px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-brand mb-2"
      />
      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={!coords}
        className="flex items-center gap-2 text-brand text-sm font-medium disabled:text-text-muted py-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        </svg>
        {coords ? "Usar minha localização atual" : "Aguardando localização…"}
      </button>
      {value && (
        <p className="text-xs text-fresh mt-1">
          ✓ {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/report/ui/PlacePicker.tsx
git commit -m "feat(web): PlacePicker with GPS use current location (AT-134)"
```

---

### Task 6: PriceInput with BRL mask (AT-132)

**Files:**
- Create: `apps/web/src/features/report/ui/PriceInput.tsx`

**Interfaces:**
- Produces: `<PriceInput value onChange />` — numeric keyboard, comma decimal, validation > 0 and ≤ 99999.99

- [ ] **Step 1: Write PriceInput**

```tsx
// apps/web/src/features/report/ui/PriceInput.tsx
import { useState } from "react";

interface Props {
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
}

export function PriceInput({ value, onChange, error }: Props) {
  const [raw, setRaw] = useState(value != null ? value.toFixed(2).replace(".", ",") : "");

  function handleChange(text: string) {
    // Allow digits and comma
    const cleaned = text.replace(/[^0-9,]/g, "");
    setRaw(cleaned);

    const parsed = parseFloat(cleaned.replace(",", "."));
    if (!isNaN(parsed) && parsed > 0 && parsed <= 99_999.99) {
      onChange(parsed);
    } else {
      onChange(null);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-text mb-1">Preço relatado</label>
      <div className="flex items-center border border-border rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-brand">
        <span className="text-text-muted text-base mr-2">R$</span>
        <input
          type="text"
          inputMode="decimal"
          value={raw}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="0,00"
          className="flex-1 bg-transparent text-text text-base outline-none"
          aria-label="Preço em reais"
        />
      </div>
      <p className="text-xs text-text-muted mt-1">Preço relatado pelo usuário — pode variar.</p>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/report/ui/PriceInput.tsx
git commit -m "feat(web): PriceInput with BRL mask + validation (AT-132)"
```

---

### Task 7: ConfirmStep — summary before submit (AT-133)

**Files:**
- Create: `apps/web/src/features/report/ui/ConfirmStep.tsx`

**Interfaces:**
- Consumes: summary data from ReportPage state
- Produces: read-only summary card + "Confirmar relato" / "Editar" buttons

- [ ] **Step 1: Write ConfirmStep**

```tsx
// apps/web/src/features/report/ui/ConfirmStep.tsx
interface SightingDraft {
  productName: string;
  placeName: string;
  priceBrl: number;
  quantity: number;
}

interface Props {
  draft: SightingDraft;
  onConfirm: () => void;
  onEdit: () => void;
  isSubmitting: boolean;
}

export function ConfirmStep({ draft, onConfirm, onEdit, isSubmitting }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-text">Confirmar relato</h2>

      <div className="bg-surface-alt rounded-2xl p-4 flex flex-col gap-3">
        <Row label="Produto" value={draft.productName} />
        <Row label="Local" value={draft.placeName} />
        <Row label="Preço" value={`R$ ${draft.priceBrl.toFixed(2).replace(".", ",")}`} />
        <Row label="Quantidade" value={`${draft.quantity} unidade(s)`} />
      </div>

      <p className="text-xs text-text-muted text-center">
        Ao confirmar, você declara que este preço é real e viu o produto hoje.
      </p>

      <button
        type="button"
        onClick={onConfirm}
        disabled={isSubmitting}
        className="w-full bg-brand text-white font-semibold py-3 rounded-xl disabled:opacity-60"
      >
        {isSubmitting ? "Enviando…" : "Confirmar relato"}
      </button>

      <button
        type="button"
        onClick={onEdit}
        disabled={isSubmitting}
        className="w-full text-text-muted font-medium py-2"
      >
        Editar
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-text-muted text-sm">{label}</span>
      <span className="text-text font-medium text-sm text-right max-w-[60%]">{value}</span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/report/ui/ConfirmStep.tsx
git commit -m "feat(web): ConfirmStep — summary before submit (AT-133)"
```

---

### Task 8: ReportPage — full discovery form flow (AT-054)

**Files:**
- Create: `apps/web/src/features/report/api/report.api.ts`
- Create: `apps/web/src/features/report/ui/ReportPage.tsx`

**Interfaces:**
- Consumes: `ProductPicker`, `PlacePicker`, `PriceInput`, `ConfirmStep`, auth guard
- Produces: full 3-step flow: (1) product + place + price → (2) confirm → (3) success

- [ ] **Step 1: Write report.api.ts**

```typescript
// apps/web/src/features/report/api/report.api.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSightingResponseSchema, type CreateSightingDto } from "@app/contracts";
import { http } from "../../../shared/api/http.js";
import { useAppStore } from "../../../app/store/index.js";

export function useCreateSighting() {
  const qc = useQueryClient();
  const accessToken = useAppStore((s) => s.accessToken);

  return useMutation({
    mutationFn: async (dto: CreateSightingDto) => {
      return http("/api/discoveries", createSightingResponseSchema, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discoveries", "nearby"] });
    },
  });
}
```

- [ ] **Step 2: Write ReportPage**

```tsx
// apps/web/src/features/report/ui/ReportPage.tsx
import { useState } from "react";
import { ProductPicker } from "./ProductPicker.js";
import { PlacePicker } from "./PlacePicker.js";
import { PriceInput } from "./PriceInput.js";
import { ConfirmStep } from "./ConfirmStep.js";
import { useCreateSighting } from "../api/report.api.js";
import { useAppStore } from "../../../app/store/index.js";

interface FormState {
  product: { id?: string; name: string } | null;
  place: { lat: number; lng: number; name: string; placeId?: string } | null;
  priceBrl: number | null;
  quantity: number;
}

interface Props {
  onSuccess: () => void;
  onSignInRequired: () => void;
}

export function ReportPage({ onSuccess, onSignInRequired }: Props) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated());
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const [form, setForm] = useState<FormState>({
    product: null,
    place: null,
    priceBrl: null,
    quantity: 1,
  });
  const [errors, setErrors] = useState<{ price?: string; product?: string; place?: string }>({});

  const createSighting = useCreateSighting();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-lg font-bold text-text mb-2">Entre para relatar</h2>
        <p className="text-text-muted text-sm text-center mb-6">
          Para contribuir com discoveries você precisa entrar.
        </p>
        <button
          onClick={onSignInRequired}
          className="bg-brand text-white font-semibold px-8 py-3 rounded-full"
        >
          Entrar
        </button>
      </div>
    );
  }

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
      await createSighting.mutateAsync({
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
        <button onClick={onSuccess} className="bg-brand text-white font-semibold px-8 py-3 rounded-full">
          Ver no mapa
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border flex items-center gap-3">
        <button onClick={onSuccess} aria-label="Voltar" className="text-text-muted text-2xl">←</button>
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
            {errors.product && <p className="text-red-600 text-xs -mt-4">{errors.product}</p>}

            <PlacePicker
              value={form.place}
              onChange={(place) => setForm((f) => ({ ...f, place }))}
            />
            {errors.place && <p className="text-red-600 text-xs -mt-4">{errors.place}</p>}

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
            isSubmitting={createSighting.isPending}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire routing in main.tsx**

```tsx
// apps/web/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./app/query-client.js";
import { useState } from "react";
import { SeekPage } from "./features/seek/ui/SeekPage.js";
import { ReportPage } from "./features/report/ui/ReportPage.js";
import { SignInPage } from "./features/auth/ui/SignInPage.js";
import "./app/index.css";

type Route = "seek" | "report" | "signin";

function App() {
  const [route, setRoute] = useState<Route>("seek");

  if (route === "signin") return <SignInPage onSuccess={() => setRoute("report")} />;
  if (route === "report") return (
    <ReportPage
      onSuccess={() => setRoute("seek")}
      onSignInRequired={() => setRoute("signin")}
    />
  );
  return <SeekPage onReport={() => setRoute("report")} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
```

Also update SeekPage to accept `onReport` prop:

```tsx
// apps/web/src/features/seek/ui/SeekPage.tsx — update FAB
// Change: onClick={() => {/* navigate to /report */}}
// To: onClick={onReport}
// And add: interface Props { onReport: () => void }
// export function SeekPage({ onReport }: Props) {
```

- [ ] **Step 4: Build and test manually**

```bash
pnpm --filter @app/web build
pnpm --filter @app/web dev
```

Test the full flow:
1. Open http://localhost:5173
2. Tap "+" FAB → redirect to sign-in (not logged in)
3. Enter email → receive code in API console logs → enter code → signed in
4. Tap "+" → ReportPage opens
5. Type "Arroz" → autocomplete shows existing product → select it
6. Tap "Usar minha localização atual" → place set
7. Enter price "32,90" → quantity "5"
8. Tap "Continuar" → ConfirmStep shows
9. Tap "Confirmar relato" → success screen
10. Tap "Ver no mapa" → back to map with new marker visible

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/report/ apps/web/src/main.tsx
git commit -m "feat(web): full report discovery flow — form + confirmation + auth gate (AT-054, AT-130, AT-132, AT-133, AT-134)"
```

---

## Self-Review Checklist

- [x] **Auth UI** — two-step magic code sign-in (E5/E10)
- [x] **AT-054** — ReportPage with product picker, place picker, price, quantity
- [x] **AT-130** — ProductPicker with debounced autocomplete from `GET /products?q=`
- [x] **AT-132** — PriceInput with BRL mask, > 0 and ≤ 99999.99 validation
- [x] **AT-133** — ConfirmStep summary before submit
- [x] **AT-134** — PlacePicker with GPS "use current location" button
- [x] Session in Zustand memory (never localStorage)
- [x] Auth gate on ReportPage: shows sign-in prompt if not authenticated
- [x] createSighting mutation invalidates `["discoveries", "nearby"]` cache → map updates automatically
- [x] All copy in Brazilian Portuguese
