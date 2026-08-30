import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchModerationQueue,
  actionModerationTarget,
  type ActionTargetInput,
} from "./moderation.api.js";
import { useAppStore } from "@/app/store/index.js";

const keys = {
  // Token in the key for the same reason useMyDiscoveries does it: signing out and back
  // in as someone else must not serve the previous account's data from cache.
  queue: (accessToken: string | null) => ["admin", "queue", accessToken] as const,
};

export function useModerationQueue() {
  const accessToken = useAppStore((s) => s.accessToken);

  return useQuery({
    queryKey: keys.queue(accessToken),
    queryFn: () => fetchModerationQueue(accessToken!),
    enabled: !!accessToken,
    // No staleTime: a moderation queue is shared mutable state between admins, and
    // acting on something another admin already resolved is the failure to avoid.
    staleTime: 0,
  });
}

export function useActionTarget() {
  const accessToken = useAppStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ActionTargetInput) => actionModerationTarget(accessToken!, input),
    // Prefix match — the full key carries the token, which this call site does not need.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "queue"] }),
  });
}
