-- Partial B-tree index: accelerates the WHERE hiddenAt IS NULL AND expiresAt > now filter
-- that every findNearbyWithDetails call applies. Without this, expired/hidden rows in the
-- spatial radius must be loaded and checked row-by-row even when the GIST index prunes
-- by location. This index lets PostgreSQL skip already-expired or hidden rows entirely.
CREATE INDEX discoveries_active_filter_idx
  ON discoveries ("expiresAt")
  WHERE "hiddenAt" IS NULL;
