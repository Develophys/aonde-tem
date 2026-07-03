import { useState } from "react";
import { useProductSearch } from "../api/product-autocomplete.api.js";

interface SelectedProduct {
  id?: string;
  name: string;
}

interface Props {
  readonly value: SelectedProduct | null;
  readonly onChange: (product: SelectedProduct) => void;
}

export function ProductPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [showDropdown, setShowDropdown] = useState(false);
  const { data } = useProductSearch(query);

  const results = data?.results ?? [];

  function selectProduct(product: { id: string; name: string }) {
    onChange({ id: product.id, name: product.name });
    setQuery(product.name);
    setShowDropdown(false);
  }

  function handleChange(v: string) {
    setQuery(v);
    onChange({ name: v }); // clear id if typing a new name
    setShowDropdown(true);
  }

  return (
    <div className="relative">
      <label htmlFor="product-picker-input" className="block text-sm font-medium text-text mb-1">
        Produto
      </label>
      <input
        id="product-picker-input"
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setShowDropdown(false);
        }}
        placeholder="Ex: Arroz 5kg, Leite 1L…"
        className="w-full border border-border rounded-xl px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-brand"
        autoComplete="off"
      />
      {showDropdown && results.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-lg overflow-hidden">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full text-left px-4 py-3 min-h-[44px] text-text hover:bg-surface-alt text-sm"
                onMouseDown={() => selectProduct(p)}
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.length >= 2 && results.length === 0 && (
        <p className="text-xs text-text-muted mt-1">Produto novo — será cadastrado.</p>
      )}
    </div>
  );
}
