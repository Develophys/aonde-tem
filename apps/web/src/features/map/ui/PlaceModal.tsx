import { useState } from "react";
import { useAppStore } from "../../../app/store/index.js";
import { usePlaceDiscoveries } from "../api/place.queries.js";
import { FlagSheet } from "../../flag/ui/FlagSheet.js";

function freshnessLabel(ageMinutes: number): string {
  if (ageMinutes < 60) return `${ageMinutes}min atrás`;
  if (ageMinutes < 1440) return `${Math.floor(ageMinutes / 60)}h atrás`;
  return `${Math.floor(ageMinutes / 1440)}d atrás`;
}

function freshnessClass(ageMinutes: number): string {
  if (ageMinutes < 120) return "text-fresh";
  if (ageMinutes < 720) return "text-aging";
  return "text-text-muted";
}

interface Props {
  readonly placeId: string;
  readonly onFlyTo: (coords: { lat: number; lng: number }) => void;
}

export function PlaceModal({ placeId, onFlyTo }: Props) {
  const clearSelected = useAppStore((s) => s.clearSelectedPlace);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated());
  const [flagTargetId, setFlagTargetId] = useState<string | null>(null);

  const { data, isLoading } = usePlaceDiscoveries(placeId);

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl shadow-xl pb-8 z-10 animate-slide-up max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2 shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-text leading-snug">
            {data?.name ?? "Carregando…"}
          </h2>
          {data?.address && <p className="text-text-muted text-sm mt-0.5">{data.address}</p>}
        </div>
        <button
          type="button"
          onClick={clearSelected}
          className="text-text-muted text-2xl leading-none min-h-11 min-w-11 flex items-center justify-center"
          aria-label="Fechar"
        >
          ×
        </button>
      </div>

      {/* Item list */}
      <div className="overflow-y-auto flex-1 px-4">
        {isLoading && <p className="text-text-muted text-sm py-4 text-center">Carregando itens…</p>}

        {!isLoading && data?.discoveries.length === 0 && (
          <p className="text-text-muted text-sm py-4 text-center">
            Nenhum item disponível aqui no momento.
          </p>
        )}

        {data?.discoveries.map((item) => (
          <div key={item.id} className="py-3 border-b border-border last:border-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-text">{item.productName}</span>
              <span className="font-bold text-text tabular-nums shrink-0">
                R$ {item.priceBrl.toFixed(2).replace(".", ",")}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-text-muted text-sm">{item.quantity} unid.</span>
              <span className={`text-sm ${freshnessClass(item.ageMinutes)}`}>
                {freshnessLabel(item.ageMinutes)}
              </span>
            </div>
            {item.note && <p className="text-text-muted text-sm mt-1 italic">"{item.note}"</p>}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setFlagTargetId(item.id)}
                className="text-text-muted text-xs mt-1 min-h-8"
              >
                Denunciar
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer actions */}
      {data?.coords && (
        <div className="px-4 pt-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              clearSelected();
              onFlyTo(data.coords);
            }}
            className="block w-full text-center bg-brand text-white font-semibold py-3 rounded-xl"
          >
            Ver no mapa
          </button>
        </div>
      )}

      {flagTargetId && (
        <FlagSheet
          targetType="discovery"
          targetId={flagTargetId}
          onClose={() => setFlagTargetId(null)}
        />
      )}
    </div>
  );
}
