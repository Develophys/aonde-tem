import { useEffect } from "react";
import { useMap } from "react-map-gl/maplibre";
import { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import type { DiscoveryResponse } from "@aonde-tem/contracts";
import { useAppStore } from "@/app/store/index.js";
import { MAP_COLORS } from "../model/map-colors.js";

interface Props {
  discoveries: DiscoveryResponse[];
}

type PointFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Record<string, unknown>;
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: PointFeature[];
};

function freshnessColor(ageMinutes: number): string {
  if (ageMinutes < 120) return MAP_COLORS.fresh;
  if (ageMinutes < 720) return MAP_COLORS.aging;
  return MAP_COLORS.stale;
}

/** Deduplicate discoveries by placeId, keeping the freshest per place. */
function groupByPlace(discoveries: DiscoveryResponse[]): DiscoveryResponse[] {
  const map = new Map<string, DiscoveryResponse>();
  for (const d of discoveries) {
    const existing = map.get(d.placeId);
    if (!existing || d.createdAt > existing.createdAt) {
      map.set(d.placeId, d);
    }
  }
  return Array.from(map.values());
}

export function DiscoveryMarkerLayer({ discoveries }: Props) {
  const { current: mapRef } = useMap();
  const selectPlace = useAppStore((s) => s.selectPlace);

  useEffect(() => {
    if (!mapRef) return;
    const map: MapLibreMap = mapRef.getMap();

    const places = groupByPlace(discoveries);

    const geojson: FeatureCollection = {
      type: "FeatureCollection",
      features: places.map((d) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [d.lng, d.lat] },
        properties: {
          placeId: d.placeId,
          placeName: d.placeName,
          color: freshnessColor(d.ageMinutes),
        },
      })),
    };

    function applyLayers() {
      if (map.getSource("places")) {
        (map.getSource("places") as GeoJSONSource).setData(geojson);
        return;
      }

      map.addSource("places", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 40,
      });

      map.addLayer({
        id: "places-clusters",
        type: "circle",
        source: "places",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": MAP_COLORS.brand,
          "circle-radius": ["step", ["get", "point_count"], 16, 5, 22, 20, 28],
          "circle-opacity": 0.9,
        },
      });

      map.addLayer({
        id: "places-points",
        type: "circle",
        source: "places",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 12,
          "circle-color": ["get", "color"],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.9,
        },
      });

      map.on("click", "places-points", (e) => {
        const placeId = e.features?.[0]?.properties?.placeId;
        if (placeId) selectPlace(String(placeId));
      });

      // Clusters had no click handler at all — tapping one did nothing, on the one
      // surface (the map) that's the entire product. Standard cluster UX: zoom in
      // until it breaks apart, using the source's own expansion-zoom calculation
      // rather than guessing an increment.
      map.on("click", "places-clusters", (e) => {
        const feature = e.features?.[0];
        const clusterId = feature?.properties?.cluster_id;
        if (!feature || clusterId == null) return;

        const source = map.getSource("places") as GeoJSONSource;
        source
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => {
            const [lng, lat] = (
              feature.geometry as { type: "Point"; coordinates: [number, number] }
            ).coordinates;
            map.easeTo({ center: [lng, lat], zoom });
          })
          .catch(() => {
            // Expansion-zoom lookup failed — no-op, the tap just doesn't zoom this time.
          });
      });

      map.on("mouseenter", "places-clusters", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "places-clusters", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "places-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "places-points", () => {
        map.getCanvas().style.cursor = "";
      });
    }

    if (map.isStyleLoaded()) {
      applyLayers();
    } else {
      map.once("load", applyLayers);
    }

    return () => {
      map.off("load", applyLayers);
      try {
        if (map.getLayer("places-points")) map.removeLayer("places-points");
        if (map.getLayer("places-clusters")) map.removeLayer("places-clusters");
        if (map.getSource("places")) map.removeSource("places");
      } catch {
        // map already removed — nothing to clean up
      }
    };
  }, [mapRef, discoveries, selectPlace]);

  return null;
}
