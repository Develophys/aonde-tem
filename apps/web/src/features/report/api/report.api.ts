import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDiscoveryResponseSchema, type CreateDiscoveryDto } from "@aonde-tem/contracts";
import { http } from "../../../shared/api/http.js";
import { useAppStore } from "../../../app/store/index.js";

export function useCreateDiscovery() {
  const qc = useQueryClient();
  const accessToken = useAppStore((s) => s.accessToken);

  return useMutation({
    mutationFn: async (dto: CreateDiscoveryDto) => {
      return http("/api/discoveries", createDiscoveryResponseSchema, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discoveries", "nearby"] });
    },
  });
}
