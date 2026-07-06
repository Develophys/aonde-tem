interface Props {
  readonly value: number;
  readonly onChange: (value: number) => void;
}

const MIN_QUANTITY = 1;

export function QuantityStepper({ value, onChange }: Props) {
  function clamp(next: number): number {
    return Math.max(MIN_QUANTITY, Number.isFinite(next) ? next : MIN_QUANTITY);
  }

  return (
    <div>
      <label htmlFor="report-quantity" className="block text-sm font-medium text-text mb-1">
        Quantidade
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= MIN_QUANTITY}
          aria-label="Diminuir quantidade"
          className="w-11 h-11 rounded-control border border-border text-text flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
          </svg>
        </button>

        <input
          id="report-quantity"
          type="number"
          inputMode="numeric"
          min={MIN_QUANTITY}
          value={value}
          onChange={(e) => onChange(clamp(Number.parseInt(e.target.value) || MIN_QUANTITY))}
          className="w-16 shrink-0 border border-border rounded-control px-2 py-3 text-text text-base text-center tabular-nums outline-none focus:ring-2 focus:ring-accent"
        />

        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          aria-label="Aumentar quantidade"
          className="w-11 h-11 rounded-control border border-border text-text flex items-center justify-center shrink-0"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
}
