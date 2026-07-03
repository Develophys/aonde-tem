import { lazy, Suspense } from "react";
import type { DiscoveryResponse } from "@aonde-tem/contracts";

// MapView is heavy (MapLibre GL); load it lazily so it never blocks first paint
const MapView = lazy(() => import("./MapView.js").then((m) => ({ default: m.MapView })));

interface Props {
  readonly center: { lat: number; lng: number };
  readonly userPin?: { lat: number; lng: number };
  readonly discoveries: DiscoveryResponse[];
}

export function MapShell({ center, userPin, discoveries }: Props) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full bg-surface-alt flex items-center justify-center">
          <span className="text-text-muted text-sm">Carregando mapa…</span>
        </div>
      }
    >
      <MapView center={center} userPin={userPin} discoveries={discoveries} />
    </Suspense>
  );
}
