import { QueryClient, QueryCache } from "@tanstack/react-query";
import { ApiError } from "../shared/api/http";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Don't retry expected client errors (4xx); retry transient ones once.
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
    },
  },
  queryCache: new QueryCache({
    onError: (err) => {
      if (err instanceof ApiError) console.warn(`[api ${err.status}] ${err.message}`);
    },
  }),
});
