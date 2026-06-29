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

// Freshness color based on age
function freshnessColor(ageMinutes: number): string {
  if (ageMinutes < 120) return "#1a5c3a"; // < 2h: fresh green
  if (ageMinutes < 720) return "#b45309"; // 2-12h: aging amber
  return "#9ca3af"; // > 12h: stale gray
}

export function DiscoveryMarkerLayer({ discoveries }: Props) {
  const { current: mapRef } = useMap();
  const setSelected = useAppStore((s) => s.selectDiscovery);

  useEffect(() => {
    if (!mapRef) return;
    const map: MapLibreMap = mapRef.getMap();

    const geojson: FeatureCollection = {
      type: "FeatureCollection",
      features: discoveries.map((d) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [d.lng, d.lat] },
        properties: {
          id: d.id,
          productName: d.productName,
          priceBrl: d.priceBrl,
          ageMinutes: d.ageMinutes,
          color: freshnessColor(d.ageMinutes),
        },
      })),
    };

    function applyLayers() {
      if (map.getSource("discoveries")) {
        (map.getSource("discoveries") as GeoJSONSource).setData(geojson);
        return;
      }

      map.addSource("discoveries", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 40,
      });

      map.addLayer({
        id: "discoveries-clusters",
        type: "circle",
        source: "discoveries",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#1a5c3a",
          "circle-radius": ["step", ["get", "point_count"], 16, 5, 22, 20, 28],
          "circle-opacity": 0.9,
        },
      });

      map.addLayer({
        id: "discoveries-points",
        type: "circle",
        source: "discoveries",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 10,
          "circle-color": ["get", "color"],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.9,
        },
      });

      map.on("click", "discoveries-points", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) setSelected(String(id));
      });
    }

    // The style may not be loaded yet when this effect first runs (map mounts
    // before the MapTiler style JSON returns). Gate on isStyleLoaded() and
    // fall back to the 'load' event so we never call addSource too early.
    if (map.isStyleLoaded()) {
      applyLayers();
    } else {
      map.once("load", applyLayers);
    }

    return () => {
      map.off("load", applyLayers);
      if (map.getLayer("discoveries-points")) map.removeLayer("discoveries-points");
      if (map.getLayer("discoveries-clusters")) map.removeLayer("discoveries-clusters");
      if (map.getSource("discoveries")) map.removeSource("discoveries");
    };
  }, [mapRef, discoveries, setSelected]);

  return null;
}
