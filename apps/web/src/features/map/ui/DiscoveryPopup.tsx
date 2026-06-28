import type { DiscoveryResponse } from "@aonde-tem/contracts";
import { useAppStore } from "../../../app/store/index.js";

interface Props {
  discovery: DiscoveryResponse;
}

function freshnessLabel(ageMinutes: number): string {
  if (ageMinutes < 60) return `${ageMinutes}min atrás`;
  if (ageMinutes < 1440) return `${Math.floor(ageMinutes / 60)}h atrás`;
  return `${Math.floor(ageMinutes / 1440)}d atrás`;
}

export function DiscoveryPopup({ discovery }: Props) {
  const clearSelected = useAppStore((s) => s.clearSelectedDiscovery);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${discovery.lat},${discovery.lng}`;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl shadow-xl p-4 pb-8 z-10 animate-slide-up">
      <button
        onClick={clearSelected}
        className="absolute top-3 right-4 text-text-muted text-2xl leading-none min-h-11 min-w-11 flex items-center justify-center"
        aria-label="Fechar"
      >
        ×
      </button>

      <h2 className="text-lg font-semibold text-text mb-1">{discovery.productName}</h2>
      <p className="text-text-muted text-sm mb-3">{discovery.placeName}</p>

      <div className="flex gap-3 mb-4">
        <span className="bg-surface-alt text-text font-bold px-3 py-1 rounded-full text-sm">
          R$ {discovery.priceBrl.toFixed(2).replace(".", ",")}
        </span>
        <span className="bg-surface-alt text-text-muted px-3 py-1 rounded-full text-sm">
          {discovery.quantity} unid.
        </span>
        <span className="text-text-muted text-sm px-3 py-1">
          {freshnessLabel(discovery.ageMinutes)}
        </span>
      </div>

      {discovery.distanceMeters < 1000 ? (
        <p className="text-fresh text-sm mb-3">{discovery.distanceMeters}m de você</p>
      ) : (
        <p className="text-text-muted text-sm mb-3">
          {(discovery.distanceMeters / 1000).toFixed(1)}km de você
        </p>
      )}

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center bg-brand text-white font-semibold py-3 rounded-xl"
      >
        Ver no mapa
      </a>
    </div>
  );
}
