interface SightingDraft {
  productName: string;
  placeName: string;
  priceBrl: number;
  quantity: number;
}

interface Props {
  draft: SightingDraft;
  onConfirm: () => void;
  onEdit: () => void;
  isSubmitting: boolean;
}

export function ConfirmStep({ draft, onConfirm, onEdit, isSubmitting }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-text">Confirmar relato</h2>

      <div className="bg-surface-alt rounded-2xl p-4 flex flex-col gap-3">
        <Row label="Produto" value={draft.productName} />
        <Row label="Local" value={draft.placeName} />
        <Row label="Preço" value={`R$ ${draft.priceBrl.toFixed(2).replace(".", ",")}`} />
        <Row label="Quantidade" value={`${draft.quantity} unidade(s)`} />
      </div>

      <p className="text-xs text-text-muted text-center">
        Ao confirmar, você declara que este preço é real e viu o produto hoje.
      </p>

      <button
        type="button"
        onClick={onConfirm}
        disabled={isSubmitting}
        className="w-full bg-brand text-white font-semibold py-3 min-h-[44px] rounded-xl disabled:opacity-60"
      >
        {isSubmitting ? "Enviando…" : "Confirmar relato"}
      </button>

      <button
        type="button"
        onClick={onEdit}
        disabled={isSubmitting}
        className="w-full text-text-muted font-medium py-3 min-h-[44px]"
      >
        Editar
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-text-muted text-sm">{label}</span>
      <span className="text-text font-medium text-sm text-right max-w-[60%]">{value}</span>
    </div>
  );
}
