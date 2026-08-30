import {
  adminQueueResponseSchema,
  adminActionResultSchema,
  type AdminQueueResponse,
  type AdminActionResult,
} from "@aonde-tem/contracts";
import { http } from "@/shared/api/http.js";

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
): Promise<AdminActionResult> {
  return http(`/api/admin/queue/${input.targetType}/${input.targetId}`, adminActionResultSchema, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ action: input.action }),
  });
}
