import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  createDiscoveryResponseSchema,
  updateDiscoveryResponseSchema,
  type CreateDiscoveryDto,
  type UpdateDiscoveryDto,
} from "@aonde-tem/contracts";
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

export function useUpdateDiscovery() {
  const qc = useQueryClient();
  const accessToken = useAppStore((s) => s.accessToken);

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateDiscoveryDto }) => {
      return http(`/api/discoveries/${id}`, updateDiscoveryResponseSchema, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discoveries", "nearby"] });
      qc.invalidateQueries({ queryKey: ["places"] });
    },
  });
}

export function useDeleteDiscovery() {
  const qc = useQueryClient();
  const accessToken = useAppStore((s) => s.accessToken);

  return useMutation({
    mutationFn: async (id: string) => {
      return http(`/api/discoveries/${id}`, z.unknown(), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discoveries", "nearby"] });
      qc.invalidateQueries({ queryKey: ["places"] });
    },
  });
}
