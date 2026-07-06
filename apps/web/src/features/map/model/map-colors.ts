// MapLibre's paint API and other non-CSS map-layer contexts need literal color
// strings — they can't consume CSS custom properties. Each value here MUST match
// its counterpart in apps/web/src/app/index.css's @theme block; this module exists
// so a palette change only has two places to touch (both commented against each
// other), instead of stray hex literals scattered across the map feature drifting
// silently out of sync.
export const MAP_COLORS = {
  /** Matches --color-brand (light mode) — used for the cluster circle's Trust Green
   * brand identity, not a freshness signal (a cluster aggregates multiple reports). */
  brand: "#1a5c3a",
  /** Matches --color-fresh (light mode). */
  fresh: "#1a5c3a",
  /** Matches --color-aging (light mode). */
  aging: "#b45309",
  /** Matches --color-stale (unchanged across themes). */
  stale: "#9ca3af",
} as const;
