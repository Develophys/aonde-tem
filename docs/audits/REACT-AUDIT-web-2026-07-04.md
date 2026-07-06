# React Migration Readiness Audit — `apps/web`

**Date:** 2026-07-04
**Scope:** `apps/web/src` (53 `.ts`/`.tsx` files — auth, map, report, seek, flag features + app shell + shared)
**Method:** `react-audit-grep-patterns` skill — static grep sweep for removed/deprecated React APIs, StrictMode-sensitive test patterns, and dependency/peer-version checks. No code changes made; this is a point-in-time readiness snapshot to re-run before any React version bump.

## Current Versions

| Package | Version |
|---|---|
| `react` | `^18.3.1` |
| `react-dom` | `^18.3.1` |
| `@types/react` | `^18.3.0` |
| `@types/react-dom` | `^18.3.0` |
| `react-router-dom` | `^7.18.0` |
| `@testing-library/react` | `^16.0.1` |
| `@testing-library/jest-dom` | `^6.5.0` |
| `@testing-library/user-event` | `^14.5.2` |
| `@vitejs/plugin-react` | `^4.3.0` |
| `zustand` | `^5.0.0` |
| `@tanstack/react-query` | `^5.59.0` |

`react`/`react-dom`/`@types/react`/`@types/react-dom` are all in lockstep on 18.3 — no split-version drift to untangle before a future bump. `react-router-dom` is already on v7 (not the legacy v5 `<Switch>`/`<Route>` API), and `@testing-library/react` v16 already supports React 19, so the test tooling won't be a blocker when the app itself moves.

## Verdict: Clean — no blockers found

Every removed-API, deprecated-API, and legacy-test-pattern scan came back with **zero hits**. This app was written against modern React idioms from the start (function components, hooks, the new JSX transform), so there's no accumulated legacy surface to pay down before a React 19 upgrade — this is a version-bump-and-retest exercise, not a rewrite.

## Scan Results

### Removed APIs (breaking if present) — none found
| Pattern | Hits |
|---|---|
| `ReactDOM.render` | 0 |
| `ReactDOM.hydrate` | 0 |
| `unmountComponentAtNode` | 0 |
| `findDOMNode` | 0 |
| `createFactory` | 0 |
| `react-dom/test-utils` imports | 0 |
| Legacy Context API (`contextTypes`/`childContextTypes`/`getChildContext`) | 0 |
| String refs (`this.refs.`) | 0 |

### Deprecated APIs (should migrate before/during upgrade) — none found
| Pattern | Hits |
|---|---|
| `forwardRef` | 0 |
| `defaultProps` (function components) | 0 |
| `useRef()` with no initial value | 0 |
| `propTypes` | 0 |
| `react-test-renderer` | 0 |
| Unnecessary `import React from 'react'` (new JSX transform) | 0 — confirmed the app relies on the automatic runtime via `@vitejs/plugin-react`; no file imports `React` just to use JSX |

### Test file scans (4 test files: `AppHeader`, `ProtectedRoute`, `ProductPicker`, `SeekPage`) — clean
| Pattern | Hits |
|---|---|
| `react-dom/test-utils` in tests | 0 |
| Enzyme (`from 'enzyme'`) | 0 |
| Enzyme `shallow(`/`mount(` | 0 |
| `react-test-renderer` in tests | 0 |
| Old `act()` import from `react-dom` | 0 |
| `ReactDOM.render` in tests | 0 |
| `toHaveBeenCalledTimes` | 1 — `AppHeader.test.tsx:114` (`expect(store.clearSession).toHaveBeenCalledTimes(1)`, asserting a mocked store action was called once from a click handler — not render/effect-count driven, so it's not expected to be sensitive to React 19's StrictMode double-invoke changes, but worth a quick re-check post-upgrade) |
| `console.error` assertions | 0 |
| `waitFor`/`findBy` usage | 0 — none of the 4 test files currently do async assertions |

### StrictMode & Enzyme
- `React.StrictMode` is already enabled at the root (`src/main.tsx:11,17`) — the app already exercises dev-mode double-invoke behavior today, which lowers the risk of surprises on a React 19 bump.
- No Enzyme adapter files found anywhere outside `node_modules`.

## What This Means

Because every scan is clean, there's no cleanup backlog blocking a React 19 upgrade attempt. When the time comes to actually bump versions:

1. Bump `react`, `react-dom`, `@types/react`, `@types/react-dom` together.
2. Re-run `npm ls` for peer-dependency conflicts (not run in this pass — do it live against the target versions, since peer ranges shift release to release).
3. Re-run the full test suite and pay attention to `AppHeader.test.tsx:114`'s call-count assertion first, as the one pre-existing pattern in this category.
4. Re-run this same grep sweep afterward as a smoke check — a clean-today codebase can still pick up a stray `forwardRef` or default `React` import in the meantime as new code lands.

## How to Re-run This Audit

This report was generated via the `react-audit-grep-patterns` skill (`~/.claude/skills/react-audit-grep-patterns`), which documents the full scan command library in `references/react19-scans.md`, `references/test-scans.md`, and `references/dep-scans.md`. Re-invoke it against `apps/web/` before any planned React version bump, or periodically to catch drift.
