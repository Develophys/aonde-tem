import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";

interface Props {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ onSearch, placeholder = "Buscar produto…" }: Props) {
  const [value, setValue] = useState("");
  const [debouncedValue] = useDebounce(value, 300);

  useEffect(() => {
    onSearch(debouncedValue.trim());
  }, [debouncedValue, onSearch]);

  return (
    <div className="flex items-center gap-2 bg-surface rounded-full shadow px-4 py-3 border border-border">
      <svg className="w-5 h-5 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-text placeholder:text-text-muted outline-none text-base"
        autoComplete="off"
        aria-label={placeholder}
      />
      {value && (
        <button
          onClick={() => setValue("")}
          className="p-3 text-text-muted text-xl leading-none flex items-center justify-center"
          aria-label="Limpar busca"
        >
          ×
        </button>
      )}
    </div>
  );
}
