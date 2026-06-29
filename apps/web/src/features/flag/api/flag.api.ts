import { useMutation } from "@tanstack/react-query";
import { flagResponseSchema, type CreateFlagDto } from "@aonde-tem/contracts";
import { http } from "../../../shared/api/http.js";
import { useAppStore } from "../../../app/store/index.js";

export function useCreateFlag() {
  const accessToken = useAppStore((s) => s.accessToken);

  return useMutation({
    mutationFn: (dto: CreateFlagDto) =>
      http("/api/flags", flagResponseSchema, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(dto),
      }),
  });
}
