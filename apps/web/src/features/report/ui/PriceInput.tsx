import { useState } from "react";

interface Props {
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
}

export function PriceInput({ value, onChange, error }: Props) {
  const [raw, setRaw] = useState(value != null ? value.toFixed(2).replace(".", ",") : "");

  function handleChange(text: string) {
    // Allow digits and comma
    const cleaned = text.replace(/[^0-9,]/g, "");
    setRaw(cleaned);

    const parsed = parseFloat(cleaned.replace(",", "."));
    if (!isNaN(parsed) && parsed > 0 && parsed <= 99_999.99) {
      onChange(parsed);
    } else {
      onChange(null);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-text mb-1">Preço relatado</label>
      <div className="flex items-center border border-border rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-brand">
        <span className="text-text-muted text-base mr-2">R$</span>
        <input
          type="text"
          inputMode="decimal"
          value={raw}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="0,00"
          className="flex-1 bg-transparent text-text text-base outline-none min-h-[28px]"
          aria-label="Preço em reais"
        />
      </div>
      <p className="text-xs text-text-muted mt-1">Preço relatado pelo usuário — pode variar.</p>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}
