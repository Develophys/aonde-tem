import { GhostButton } from "@/shared/ui/GhostButton.js";

interface SightingDraft {
  productName: string;
  placeName: string;
  priceBrl: number;
  quantity: number;
}

interface Props {
  readonly draft: SightingDraft;
  readonly onConfirm: () => void;
  readonly onEdit: () => void;
  readonly isSubmitting: boolean;
  readonly error?: string | null;
}

export function ConfirmStep({ draft, onConfirm, onEdit, isSubmitting, error }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-text">Confirmar relato</h2>

      <div className="bg-surface-alt rounded-sheet p-4 flex flex-col gap-3">
        <Row label="Produto" value={draft.productName} />
        <Row label="Local" value={draft.placeName} />
        <Row label="Preço" value={`R$ ${draft.priceBrl.toFixed(2).replace(".", ",")}`} />
        <Row label="Quantidade" value={`${draft.quantity} unidade(s)`} />
      </div>

      <div className="flex items-start gap-2.5 px-1">
        <svg
          className="w-4 h-4 text-accent shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 12l2 2 4-4" />
          <path d="M12 3l7 3v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" />
        </svg>
        <p className="text-sm text-text">
          Ao confirmar, você declara que este preço é real e viu o produto hoje.
        </p>
      </div>

      {error && (
        <p
          className="text-error text-sm text-center bg-error/10 rounded-control px-4 py-2.5"
          role="alert"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onConfirm}
        disabled={isSubmitting}
        className="w-full bg-brand text-white font-semibold py-3 min-h-11 rounded-control disabled:opacity-60"
      >
        {isSubmitting ? "Enviando…" : "Confirmar relato"}
      </button>

      <GhostButton fullWidth onClick={onEdit} disabled={isSubmitting}>
        Editar
      </GhostButton>
    </div>
  );
}

function Row({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex justify-between items-baseline gap-3">
      <span className="text-text-muted text-sm shrink-0">{label}</span>
      <span className="text-text font-medium text-sm text-right wrap-break-word min-w-0">
        {value}
      </span>
    </div>
  );
}
