import { myDiscoveriesResponseSchema, type MyDiscoveriesResponse } from "@aonde-tem/contracts";
import { http } from "@/shared/api/http.js";

export async function fetchMyDiscoveries(accessToken: string): Promise<MyDiscoveriesResponse> {
  return http("/api/discoveries/mine", myDiscoveriesResponseSchema, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
