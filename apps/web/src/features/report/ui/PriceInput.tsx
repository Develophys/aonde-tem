import { useState } from "react";

interface Props {
  readonly value: number | null;
  readonly onChange: (value: number | null) => void;
  readonly error?: string;
}

export function PriceInput({ value, onChange, error }: Props) {
  const [raw, setRaw] = useState(value == null ? "" : value.toFixed(2).replace(".", ","));

  function handleChange(text: string) {
    // Allow digits and comma
    const cleaned = text.replace(/[^0-9,]/g, "");
    setRaw(cleaned);

    const parsed = Number.parseFloat(cleaned.replace(",", "."));
    if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 99_999.99) {
      onChange(parsed);
    } else {
      onChange(null);
    }
  }

  return (
    <div>
      <label htmlFor="price-input" className="block text-sm font-medium text-text mb-1">
        Preço relatado
      </label>
      <div className="flex items-center border border-border rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-brand">
        <span className="text-text-muted text-base mr-2">R$</span>
        <input
          id="price-input"
          type="text"
          inputMode="decimal"
          value={raw}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="0,00"
          className="flex-1 bg-transparent text-text text-base outline-none min-h-[28px]"
        />
      </div>
      <p className="text-xs text-text-muted mt-1">Preço relatado pelo usuário — pode variar.</p>
      {error && <p className="text-error text-xs mt-1">{error}</p>}
    </div>
  );
}
