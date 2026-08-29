import { useQuery } from "@tanstack/react-query";
import { fetchMyDiscoveries } from "./my-discoveries.api.js";
import { useAppStore } from "@/app/store/index.js";

const keys = {
  // The token is part of the key, not just an argument: this response is one specific
  // person's history, so signing out and in as someone else must not serve the previous
  // account's reports from cache. Same discipline as the place-detail query.
  mine: (accessToken: string | null) => ["discoveries", "mine", accessToken] as const,
};

export function useMyDiscoveries() {
  const accessToken = useAppStore((s) => s.accessToken);

  return useQuery({
    queryKey: keys.mine(accessToken),
    queryFn: () => fetchMyDiscoveries(accessToken!),
    enabled: !!accessToken,
    staleTime: 30_000,
  });
}
