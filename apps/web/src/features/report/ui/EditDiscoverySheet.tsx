import { useState } from "react";
import { useUpdateDiscovery } from "../api/report.api.js";
import { BottomSheet } from "../../../shared/ui/BottomSheet.js";
import { PriceInput } from "./PriceInput.js";
import { useAppStore } from "../../../app/store/index.js";

interface Props {
  readonly discoveryId: string;
  readonly initialPriceBrl: number;
  readonly initialQuantity: number;
  readonly initialNote: string | null;
  readonly onClose: () => void;
}

export function EditDiscoverySheet({
  discoveryId,
  initialPriceBrl,
  initialQuantity,
  initialNote,
  onClose,
}: Props) {
  const [priceBrl, setPriceBrl] = useState<number | null>(initialPriceBrl);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [note, setNote] = useState(initialNote ?? "");
  const updateDiscovery = useUpdateDiscovery();
  const pushToast = useAppStore((s) => s.pushToast);

  async function submit() {
    if (!priceBrl) return;
    try {
      await updateDiscovery.mutateAsync({
        id: discoveryId,
        dto: { priceBrl, quantity, note: note || undefined },
      });
      pushToast({ tone: "success", message: "Relato atualizado." });
      onClose();
    } catch {
      pushToast({ tone: "error", message: "Não foi possível atualizar o relato." });
    }
  }

  return (
    <BottomSheet label="Editar relato" onClose={onClose} className="p-6 pb-10">
      <h2 className="text-lg font-bold text-text mb-4">Editar relato</h2>

      <div className="flex flex-col gap-4 mb-6">
        <PriceInput value={priceBrl} onChange={setPriceBrl} />

        <div>
          <label htmlFor="edit-quantity" className="block text-sm font-medium text-text mb-1">
            Quantidade
          </label>
          <input
            id="edit-quantity"
            type="number"
            inputMode="numeric"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
            className="w-full border border-border rounded-control px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label htmlFor="edit-note" className="block text-sm font-medium text-text mb-1">
            Nota (opcional)
          </label>
          <input
            id="edit-note"
            type="text"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border border-border rounded-control px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!priceBrl || updateDiscovery.isPending}
        className="w-full bg-brand text-white font-semibold py-3 rounded-control min-h-11 disabled:opacity-50"
      >
        {updateDiscovery.isPending ? "Salvando…" : "Salvar"}
      </button>
      <button type="button" onClick={onClose} className="w-full text-text-muted py-2 mt-2 min-h-11">
        Cancelar
      </button>
    </BottomSheet>
  );
}
