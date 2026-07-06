import { useState } from "react";

interface Props {
  readonly value: number | null;
  readonly onChange: (value: number | null) => void;
  readonly error?: string;
}

export function PriceInput({ value, onChange, error }: Props) {
  const [raw, setRaw] = useState(value == null ? "" : value.toFixed(2).replace(".", ","));
  const [hasRejectedChar, setHasRejectedChar] = useState(false);

  function handleChange(text: string) {
    // A "." (US/calculator muscle memory) or a second comma (pasted "1,2,3") used
    // to be silently stripped here: "12.50" quietly became "1250", which parsed as
    // a perfectly valid number and reached submission as a 100x-wrong price with no
    // validation signal anywhere. Now either case forces onChange(null) instead of
    // guessing a value, so it fails the existing "Informe um preço válido"
    // required-field check rather than silently succeeding — and the hint below
    // explains why, instead of leaving the user to notice on their own.
    const hadDisallowedChar = /[^0-9,]/.test(text);
    const hadExtraComma = (text.match(/,/g) ?? []).length > 1;
    setHasRejectedChar(hadDisallowedChar || hadExtraComma);

    const digitsAndComma = text.replace(/[^0-9,]/g, "");
    const firstComma = digitsAndComma.indexOf(",");
    const cleaned =
      firstComma === -1
        ? digitsAndComma
        : digitsAndComma.slice(0, firstComma + 1) +
          digitsAndComma.slice(firstComma + 1).replace(/,/g, "");
    setRaw(cleaned);

    if (hadDisallowedChar || hadExtraComma) {
      onChange(null);
      return;
    }

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
      <div className="flex items-center border border-border rounded-control px-4 py-3 focus-within:ring-2 focus-within:ring-accent">
        <span className="text-text-muted text-base mr-2">R$</span>
        <input
          id="price-input"
          type="text"
          inputMode="decimal"
          value={raw}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="0,00"
          className="flex-1 bg-transparent text-text text-base outline-none min-h-[28px]"
          aria-invalid={!!error || hasRejectedChar}
          aria-describedby={
            error ? "price-input-error" : hasRejectedChar ? "price-input-hint" : undefined
          }
        />
      </div>
      {hasRejectedChar ? (
        <p id="price-input-hint" role="alert" className="text-error text-xs mt-1">
          Use vírgula para os centavos (ex: 12,50)
        </p>
      ) : (
        <p className="text-xs text-text-muted mt-1">Preço relatado pelo usuário — pode variar.</p>
      )}
      {error && !hasRejectedChar && (
        <p id="price-input-error" role="alert" className="text-error text-xs mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
