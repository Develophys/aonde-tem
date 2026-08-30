import { z } from "zod";
import { adminQueueResponseSchema, type AdminQueueResponse } from "@aonde-tem/contracts";
import { http } from "@/shared/api/http.js";

const actionResultSchema = z.object({ ok: z.boolean(), resolved: z.number().int() });

export async function fetchModerationQueue(accessToken: string): Promise<AdminQueueResponse> {
  return http("/api/admin/queue", adminQueueResponseSchema, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export interface ActionTargetInput {
  targetType: "product" | "discovery";
  targetId: string;
  action: "hide" | "dismiss";
}

export async function actionModerationTarget(
  accessToken: string,
  input: ActionTargetInput,
): Promise<{ ok: boolean; resolved: number }> {
  return http(`/api/admin/queue/${input.targetType}/${input.targetId}`, actionResultSchema, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ action: input.action }),
  });
}
