import { useDeleteDiscovery } from "../api/report.api.js";
import { BottomSheet } from "../../../shared/ui/BottomSheet.js";
import { useAppStore } from "../../../app/store/index.js";

interface Props {
  readonly discoveryId: string;
  readonly onClose: () => void;
  readonly onDeleted: () => void;
}

export function DeleteDiscoveryConfirmSheet({ discoveryId, onClose, onDeleted }: Props) {
  const deleteDiscovery = useDeleteDiscovery();
  const pushToast = useAppStore((s) => s.pushToast);

  async function confirm() {
    try {
      await deleteDiscovery.mutateAsync(discoveryId);
      pushToast({ tone: "success", message: "Relato excluído." });
      onDeleted();
    } catch {
      pushToast({ tone: "error", message: "Não foi possível excluir o relato." });
    }
  }

  return (
    <BottomSheet label="Excluir relato" onClose={onClose} className="p-6 pb-10">
      <h2 className="text-lg font-bold text-text mb-2">Excluir este relato?</h2>
      <p className="text-text-muted text-sm mb-6">Esta ação não pode ser desfeita.</p>
      <button
        type="button"
        onClick={confirm}
        disabled={deleteDiscovery.isPending}
        className="w-full bg-error text-white font-semibold py-3 rounded-control min-h-11 disabled:opacity-50"
      >
        {deleteDiscovery.isPending ? "Excluindo…" : "Excluir"}
      </button>
      <button type="button" onClick={onClose} className="w-full text-text-muted py-2 mt-2 min-h-11">
        Cancelar
      </button>
    </BottomSheet>
  );
}
