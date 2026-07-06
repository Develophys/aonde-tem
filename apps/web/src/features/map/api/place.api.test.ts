import { fetchPlaceWithDiscoveries } from "./place.api.js";
import { http } from "../../../shared/api/http.js";

jest.mock("../../../shared/api/http.js", () => ({
  http: jest.fn().mockResolvedValue({}),
}));
const mockHttp = http as jest.MockedFunction<typeof http>;

describe("fetchPlaceWithDiscoveries", () => {
  it("sends an Authorization header when an access token is provided", async () => {
    await fetchPlaceWithDiscoveries("place-1", "token-123");

    const [, , init] = mockHttp.mock.calls[0]!;
    expect((init as RequestInit).headers).toEqual({ Authorization: "Bearer token-123" });
  });

  it("omits the Authorization header when no access token is provided", async () => {
    await fetchPlaceWithDiscoveries("place-1");

    const [, , init] = mockHttp.mock.calls[0]!;
    expect((init as RequestInit).headers).toBeUndefined();
  });
});
