# Migrations — read this before running `prisma migrate dev`

## Hazard: `migrate dev` proposes dropping indexes we need

`schema.prisma` cannot declare GIST indexes, GIN/trigram indexes, or partial indexes —
Prisma's `@@index` only expresses plain B-tree indexes over a column list. Five indexes
in this database were created by hand-written SQL in past migrations instead, which
means Prisma's schema-diff sees them as drift and **will propose `DROP INDEX` for all
five** the next time you run `prisma migrate dev`:

| Index | Kind | Created in |
|---|---|---|
| `places_location_idx` | GIST (PostGIS) | `20260628161907_full_mvp_schema` |
| `discoveries_location_idx` | GIST (PostGIS) | `20260628161907_full_mvp_schema` |
| `products_name_trgm_idx` | GIN (`pg_trgm`) | `20260628161907_full_mvp_schema` |
| `products_normalized_key_trgm_idx` | GIN (`pg_trgm`) | `20260628161907_full_mvp_schema` |
| `discoveries_active_filter_idx` | partial B-tree | `20260628200000_discoveries_active_filter_idx` |

The two GIST indexes back every nearby-search radius query; the two trigram indexes
back fuzzy product-name search; the partial index backs the active/non-expired filter
applied to every nearby-search call. If the generated `DROP INDEX` statements are
applied unedited, nearby search silently degrades to sequential scans in production —
there is no test that catches this, because it's a performance regression, not a
correctness one.

## Required workflow

1. Run migrations with `--create-only` so nothing is applied automatically:
   `pnpm --filter @aonde-tem/api prisma migrate dev --create-only`
2. Open the generated `migration.sql` and delete any `DROP INDEX` line targeting the
   five indexes above. Keep everything else.
3. Review the rest of the diff normally, then apply.

Do not accept the generated SQL as-is. This has already bitten one migration
(`20260830183459_index_flags_status_target`, hand-trimmed for exactly this reason).
