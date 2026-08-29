import { useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import { useProductSearch } from "@/features/product/api/product-autocomplete.api.js";

interface Props {
  readonly onSearch: (query: string) => void;
  readonly placeholder?: string;
}

const LISTBOX_ID = "search-suggestions-listbox";

function optionId(productId: string): string {
  return `search-suggestion-${productId}`;
}

// Shared by the collapsed trigger and the expanded bar — the two usages are visually
// identical apart from sizing/color classes, which callers pass in via className.
function MagnifierIcon({ className }: { readonly className: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// Collapsed by default so the map keeps its full canvas: the top-left corner holds a
// single 44x44 affordance instead of a permanent full-width bar. Expanding reveals the
// same debounced live filter as before, now with a product-suggestion dropdown fed by
// the shared autocomplete hook — suggestions are additive, typing alone still works.
export function SearchBar({ onSearch, placeholder = "Buscar produto…" }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [debouncedValue] = useDebounce(value, 300);

  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // The magnifier is unmounted while expanded, so focus can only return to it after the
  // collapse has rendered — hence a flag read in an effect, not a call in the handler.
  const returnFocusRef = useRef(false);

  const { data } = useProductSearch(value);
  const results = data?.results ?? [];
  const dropdownOpen = showDropdown && results.length > 0;

  useEffect(() => {
    onSearch(debouncedValue.trim());
  }, [debouncedValue, onSearch]);

  useEffect(() => {
    if (expanded) {
      inputRef.current?.focus();
      return;
    }
    if (returnFocusRef.current) {
      triggerRef.current?.focus();
      returnFocusRef.current = false;
    }
  }, [expanded]);

  // Same outside-click discipline as ProductPicker: a document-level mousedown listener
  // rather than onBlur, because blur fires before an option's own mousedown can register.
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  function collapse() {
    returnFocusRef.current = true;
    setValue("");
    setShowDropdown(false);
    setHighlightedIndex(-1);
    setExpanded(false);
  }

  function selectSuggestion(product: { id: string; name: string }) {
    setValue(product.name);
    setShowDropdown(false);
    setHighlightedIndex(-1);
  }

  function handleChange(next: string) {
    setValue(next);
    setShowDropdown(true);
    setHighlightedIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      // Two-stage: the dropdown goes first, the bar only on a second press.
      if (dropdownOpen) {
        setShowDropdown(false);
        setHighlightedIndex(-1);
      } else {
        collapse();
      }
      return;
    }
    if (!dropdownOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      const option = results[highlightedIndex];
      if (option) selectSuggestion(option);
    }
  }

  if (!expanded) {
    return (
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setExpanded(true)}
        aria-label="Buscar produto"
        className="bg-surface border border-border text-text-muted rounded-full w-11 h-11 flex items-center justify-center shadow-md"
      >
        <MagnifierIcon className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="flex items-center gap-2 bg-surface rounded-full shadow px-4 py-3 border border-border">
        <MagnifierIcon className="w-5 h-5 text-text-muted shrink-0" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={dropdownOpen}
          aria-controls={LISTBOX_ID}
          aria-activedescendant={
            dropdownOpen && highlightedIndex >= 0
              ? optionId(results[highlightedIndex]!.id)
              : undefined
          }
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-text placeholder:text-text-muted outline-none text-base min-w-0"
          autoComplete="off"
          aria-label={placeholder}
        />
        <button
          type="button"
          onClick={collapse}
          className="p-3 -mr-3 text-text-muted text-xl leading-none flex items-center justify-center min-w-11 min-h-11"
          aria-label="Fechar busca"
        >
          ×
        </button>
      </div>

      {dropdownOpen && (
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
              onMouseDown={() => selectSuggestion(p)}
              className={`w-full text-left px-4 py-3 min-h-11 text-text text-sm cursor-pointer ${
                i === highlightedIndex ? "bg-surface-alt" : ""
              }`}
            >
              {p.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
