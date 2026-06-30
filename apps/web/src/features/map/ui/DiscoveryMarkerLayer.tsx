import { useEffect } from "react";
import { useMap } from "react-map-gl/maplibre";
import { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import type { DiscoveryResponse } from "@aonde-tem/contracts";
import { useAppStore } from "../../../app/store/index.js";

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
  if (ageMinutes < 120) return "#1a5c3a";
  if (ageMinutes < 720) return "#b45309";
  return "#9ca3af";
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
          "circle-color": "#1a5c3a",
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
