import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProductSearch } from "@/features/product/api/product-autocomplete.api.js";

const LISTBOX_ID = "search-page-listbox";
const PLACEHOLDER = "Buscar produto…";

function optionId(productId: string): string {
  return `search-page-option-${productId}`;
}

/**
 * The Buscar tab. Picking a product hands the term to the map as a URL filter rather
 * than listing results here: the map is where availability is read, and keeping one
 * place for that avoids two divergent answers to "where is this product".
 *
 * The filter travels in the query string, not in a store slice, so it survives a
 * reload and can be shared as a link.
 */
export function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data } = useProductSearch(query);
  const results = data?.results ?? [];
  const expanded = results.length > 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function applyFilter(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    navigate(`/?${new URLSearchParams({ item: trimmed }).toString()}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const highlighted = expanded && highlightedIndex >= 0 ? results[highlightedIndex] : undefined;
      // Enter with nothing highlighted searches the raw text — a product nobody has
      // reported yet still deserves an answer, even if that answer is an empty map.
      applyFilter(highlighted?.name ?? query);
      return;
    }
    if (!expanded) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    }
  }

  return (
    <div
      className="w-full min-h-screen bg-surface flex flex-col"
      style={{ paddingBottom: "var(--bottom-nav-clearance)" }}
    >
      <header className="px-4 pb-3" style={{ paddingTop: "var(--header-inset-top)" }}>
        <div className="flex items-center gap-2 bg-surface-alt rounded-full px-4 py-3 border border-border">
          <svg
            className="w-5 h-5 text-text-muted shrink-0"
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
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={LISTBOX_ID}
            aria-activedescendant={
              expanded && highlightedIndex >= 0
                ? optionId(results[highlightedIndex]!.id)
                : undefined
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlightedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder={PLACEHOLDER}
            aria-label={PLACEHOLDER}
            className="flex-1 bg-transparent text-text placeholder:text-text-muted outline-none text-base min-w-0"
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>
      </header>

      {expanded ? (
        <ul id={LISTBOX_ID} role="listbox" className="flex-1">
          {results.map((p, i) => (
            <li
              key={p.id}
              id={optionId(p.id)}
              role="option"
              aria-selected={i === highlightedIndex}
              onMouseDown={() => applyFilter(p.name)}
              className={`px-4 py-3 min-h-11 flex items-center text-text text-base border-b border-border cursor-pointer ${
                i === highlightedIndex ? "bg-surface-alt" : ""
              }`}
            >
              {p.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-6 py-10 text-center text-text-muted text-sm">
          {query.trim()
            ? "Nenhum produto encontrado."
            : "Busque um produto para ver onde tem perto de você."}
        </p>
      )}
    </div>
  );
}
