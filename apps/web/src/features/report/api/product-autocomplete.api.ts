import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";

export function useProductSearch(query: string) {
  const [debouncedQuery] = useDebounce(query, 300);
  return useQuery({
    queryKey: ["products", "search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return { results: [] };
      const res = await fetch(`/api/products?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) return { results: [] };
      return res.json() as Promise<{ results: { id: string; name: string }[] }>;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 60_000,
  });
}
