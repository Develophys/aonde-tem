<!-- Backlog: AT-008 -->

## What & why
<!-- What does this change do, and which problem/backlog item does it address? -->

Closes: <!-- AT-### / #issue -->

## Type
- [ ] feat
- [ ] fix
- [ ] chore / refactor
- [ ] docs

## Checklist
- [ ] `pnpm lint typecheck test build` passes locally
- [ ] Respects the dependency rule (domain imports nothing framework-specific)
- [ ] Validation at boundaries uses Zod schemas from `packages/contracts`
- [ ] Frontend changes follow the design system (Impeccable / `PRODUCT.md` · `DESIGN.md`)
- [ ] Tests added/updated for domain logic
- [ ] Bilingual docs kept in sync (`*.en.md` ↔ `*.pt.md`) if docs changed
- [ ] No new paid services without a cost note

## Notes for reviewers
<!-- Anything to call out: trade-offs, follow-ups, screenshots for UI changes. -->
