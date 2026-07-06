import { render, screen } from "@testing-library/react";
import { SeekPage } from "./SeekPage.js";
import { useGeolocation, DEFAULT_COORDS } from "../../map/model/use-geolocation.js";
import { useNearbyDiscoveries } from "../api/discovery.queries.js";
import { useAppStore } from "@/app/store/index.js";
import { useSaveData } from "@/shared/model/use-save-data.js";
import type { AppStore } from "@/app/store/types.js";

// Explicit factories (not bare automocks) — matches ProductPicker.test.tsx / AppHeader.test.tsx.
jest.mock("../../map/model/use-geolocation.js", () => ({
  ...jest.requireActual("../../map/model/use-geolocation.js"),
  useGeolocation: jest.fn(),
}));
const mockUseGeolocation = useGeolocation as jest.MockedFunction<typeof useGeolocation>;

const mockMapShell = jest.fn((_props: unknown) => <div data-testid="map-shell" />);
jest.mock("../../map/ui/MapShell.js", () => ({
  MapShell: (_props: unknown) => mockMapShell(_props),
}));

jest.mock("../api/discovery.queries.js", () => ({
  useNearbyDiscoveries: jest.fn(),
}));
const mockUseNearbyDiscoveries = useNearbyDiscoveries as jest.MockedFunction<
  typeof useNearbyDiscoveries
>;

jest.mock("@/app/store/index.js");
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

jest.mock("@/shared/model/use-save-data.js", () => ({
  useSaveData: jest.fn(),
}));
const mockUseSaveData = useSaveData as jest.MockedFunction<typeof useSaveData>;

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

function setupGeolocation(state: {
  coords: { lat: number; lng: number; accuracy: number } | null;
  denied: boolean;
  loading: boolean;
}) {
  mockUseGeolocation.mockReturnValue({ ...state, error: null });
}

function setup() {
  mockUseNearbyDiscoveries.mockReturnValue({
    data: { results: [] },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useNearbyDiscoveries>);

  const store = { mapRadius: 5_000, setRadius: jest.fn(), selectedPlaceId: null };
  mockUseAppStore.mockImplementation((selector: (s: AppStore) => unknown) =>
    selector(store as unknown as AppStore),
  );

  mockUseSaveData.mockReturnValue(false);

  return render(<SeekPage />);
}

describe("SeekPage — map mount gating", () => {
  it("shows a full-screen loading state and does not mount the map while geolocation is resolving", () => {
    setupGeolocation({ coords: null, denied: false, loading: true });
    setup();

    expect(screen.getByText("Localizando você…")).toBeInTheDocument();
    expect(screen.queryByTestId("map-shell")).not.toBeInTheDocument();
    expect(mockMapShell).not.toHaveBeenCalled();
  });

  it("mounts the map centered on the resolved coordinates once geolocation settles", () => {
    const coords = { lat: -23.5, lng: -46.6, accuracy: 5 };
    setupGeolocation({ coords, denied: false, loading: false });
    setup();

    expect(screen.queryByText("Localizando você…")).not.toBeInTheDocument();
    expect(mockMapShell).toHaveBeenCalledWith(
      expect.objectContaining({ center: coords, userPin: coords }),
    );
  });

  it("mounts the map centered on DEFAULT_COORDS when geolocation is denied", () => {
    setupGeolocation({ coords: null, denied: true, loading: false });
    setup();

    expect(mockMapShell).toHaveBeenCalledWith(
      expect.objectContaining({ center: DEFAULT_COORDS, userPin: undefined }),
    );
    expect(screen.getByText(/Localização negada/)).toBeInTheDocument();
  });
});
