-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE "places" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "category"  TEXT NOT NULL,
  "address"   TEXT,
  "location"  geography(Point, 4326) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- Spatial index — makes "find nearby" fast.
CREATE INDEX "places_location_idx" ON "places" USING GIST ("location");
