import { useState } from "react";
import { useAppStore } from "../../../app/store/index.js";
import { usePlaceDiscoveries } from "../api/place.queries.js";
import { FlagSheet } from "../../flag/ui/FlagSheet.js";
import { EditDiscoverySheet } from "../../report/ui/EditDiscoverySheet.js";
import { DeleteDiscoveryConfirmSheet } from "../../report/ui/DeleteDiscoveryConfirmSheet.js";
import { BottomSheet } from "../../../shared/ui/BottomSheet.js";
import type { PlaceDiscoveryItem } from "@aonde-tem/contracts";

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
  const [editTarget, setEditTarget] = useState<PlaceDiscoveryItem | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = usePlaceDiscoveries(placeId);

  return (
    <BottomSheet
      label={data?.name ? `Detalhes de ${data.name}` : "Detalhes do local"}
      onClose={clearSelected}
      className="pb-8 animate-slide-up max-h-[80vh] flex flex-col"
    >
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

        {!isLoading && isError && (
          <div className="py-4 text-center">
            <p className="text-text-muted text-sm mb-2">Não foi possível carregar os itens.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-accent text-sm font-semibold min-h-11 px-4"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!isLoading && !isError && data?.discoveries.length === 0 && (
          <p className="text-text-muted text-sm py-4 text-center">
            Nenhum item disponível aqui no momento.
          </p>
        )}

        {data?.discoveries.map((item) => (
          <div key={item.id} className="py-3 border-b border-border last:border-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-text wrap-break-word min-w-0">
                {item.productName}
              </span>
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
            {(isAuthenticated || item.isMine) && (
              <div className="flex items-center gap-3 mt-1">
                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => setFlagTargetId(item.id)}
                    className="text-text-muted text-xs min-h-11 flex items-center"
                  >
                    Denunciar
                  </button>
                )}
                {item.isMine && (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditTarget(item)}
                      className="text-accent text-xs font-semibold min-h-11 flex items-center"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(item.id)}
                      className="text-error text-xs font-semibold min-h-11 flex items-center"
                    >
                      Excluir
                    </button>
                  </>
                )}
              </div>
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
            className="block w-full text-center bg-brand text-white font-semibold py-3 rounded-control"
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

      {editTarget && (
        <EditDiscoverySheet
          discoveryId={editTarget.id}
          initialPriceBrl={editTarget.priceBrl}
          initialQuantity={editTarget.quantity}
          initialNote={editTarget.note}
          onClose={() => setEditTarget(null)}
        />
      )}

      {deleteTargetId && (
        <DeleteDiscoveryConfirmSheet
          discoveryId={deleteTargetId}
          onClose={() => setDeleteTargetId(null)}
          onDeleted={() => setDeleteTargetId(null)}
        />
      )}
    </BottomSheet>
  );
}
