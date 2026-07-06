import { useEffect, useRef, useState } from "react";
import { useProductSearch } from "../api/product-autocomplete.api.js";

interface SelectedProduct {
  id?: string;
  name: string;
}

interface Props {
  readonly value: SelectedProduct | null;
  readonly onChange: (product: SelectedProduct) => void;
  readonly errorId?: string;
}

const LISTBOX_ID = "product-picker-listbox";

function optionId(productId: string): string {
  return `product-picker-option-${productId}`;
}

export function ProductPicker({ value, onChange, errorId }: Props) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { data } = useProductSearch(query);

  const results = data?.results ?? [];
  const expanded = showDropdown && results.length > 0;

  // Touch users have no Escape key — without this, tapping away from the input (not
  // onto an option) left the dropdown open indefinitely, since selecting an option
  // was the only other path that closed it. Mirrors AppHeader's account-menu
  // outside-click pattern: a document-level mousedown listener, not onBlur, since
  // blur fires before an option's own onMouseDown can register the selection
  // (that race is exactly why selectProduct below uses onMouseDown, not onClick).
  useEffect(() => {
    if (!expanded) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expanded]);

  function selectProduct(product: { id: string; name: string }) {
    onChange({ id: product.id, name: product.name });
    setQuery(product.name);
    setShowDropdown(false);
    setHighlightedIndex(-1);
  }

  function handleChange(v: string) {
    setQuery(v);
    onChange({ name: v }); // clear id if typing a new name
    setShowDropdown(true);
    setHighlightedIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setShowDropdown(false);
      setHighlightedIndex(-1);
      return;
    }
    if (!expanded) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      const option = results[highlightedIndex];
      if (option) selectProduct(option);
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <label htmlFor="product-picker-input" className="block text-sm font-medium text-text mb-1">
        Produto
      </label>
      <input
        id="product-picker-input"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={LISTBOX_ID}
        aria-activedescendant={
          expanded && highlightedIndex >= 0 ? optionId(results[highlightedIndex]!.id) : undefined
        }
        aria-invalid={!!errorId}
        aria-describedby={errorId}
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        onKeyDown={handleKeyDown}
        placeholder="Ex: Arroz 5kg, Leite 1L…"
        className="w-full border border-border rounded-control px-4 py-3 text-text text-base outline-none focus:ring-2 focus:ring-accent"
        autoComplete="off"
      />
      {expanded && (
        <ul
          id={LISTBOX_ID}
          role="listbox"
          className="absolute z-(--z-dropdown) left-0 right-0 top-full mt-1 bg-surface border border-border rounded-control shadow-lg overflow-hidden"
        >
          {results.map((p, i) => (
            <li
              key={p.id}
              id={optionId(p.id)}
              role="option"
              aria-selected={i === highlightedIndex}
              className={`w-full text-left px-4 py-3 min-h-11 text-text text-sm cursor-pointer ${
                i === highlightedIndex ? "bg-surface-alt" : ""
              }`}
              onMouseDown={() => selectProduct(p)}
              onMouseEnter={() => setHighlightedIndex(i)}
            >
              {p.name}
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
