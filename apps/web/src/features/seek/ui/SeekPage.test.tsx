import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SeekPage } from "./SeekPage.js";
import { useGeolocation, DEFAULT_COORDS } from "../../map/model/use-geolocation.js";
import { useNearbyDiscoveries } from "../api/discovery.queries.js";
import { useAppStore } from "@/app/store/index.js";
import { useSaveData } from "@/shared/model/use-save-data.js";
import type { AppStore } from "@/app/store/types.js";

// Explicit factories (not bare automocks) — matches ProductPicker.test.tsx.
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

function setup(path = "/") {
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

  return render(
    <MemoryRouter initialEntries={[path]}>
      <SeekPage />
    </MemoryRouter>,
  );
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

describe("SeekPage — report action", () => {
  it("no longer renders its own report FAB, since BottomNav owns that action", () => {
    setupGeolocation({
      coords: { lat: -23.5, lng: -46.6, accuracy: 10 },
      denied: false,
      loading: false,
    });
    setup();

    expect(screen.queryByRole("button", { name: "Relatar produto" })).not.toBeInTheDocument();
  });
});

describe("SeekPage — filter from the Buscar tab", () => {
  const coords = { lat: -23.5, lng: -46.6, accuracy: 10 };

  it("passes the URL's item parameter to the nearby query", () => {
    setupGeolocation({ coords, denied: false, loading: false });
    setup("/?item=Arroz%205kg");

    expect(mockUseNearbyDiscoveries).toHaveBeenCalledWith(
      expect.objectContaining({ item: "Arroz 5kg" }),
    );
  });

  it("sends no item at all when the map is unfiltered", () => {
    setupGeolocation({ coords, denied: false, loading: false });
    setup("/");

    expect(mockUseNearbyDiscoveries).toHaveBeenCalledWith(
      expect.objectContaining({ item: undefined }),
    );
  });

  it("shows the active term as a removable chip", () => {
    setupGeolocation({ coords, denied: false, loading: false });
    setup("/?item=Arroz%205kg");

    expect(screen.getByText("Arroz 5kg")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remover filtro Arroz 5kg" })).toBeInTheDocument();
  });

  it("renders no chip when there is no filter", () => {
    setupGeolocation({ coords, denied: false, loading: false });
    setup("/");

    expect(screen.queryByRole("button", { name: /Remover filtro/ })).not.toBeInTheDocument();
  });

  it("drops the filter from the query when the chip is dismissed", () => {
    setupGeolocation({ coords, denied: false, loading: false });
    setup("/?item=Arroz%205kg");

    fireEvent.click(screen.getByRole("button", { name: "Remover filtro Arroz 5kg" }));

    expect(screen.queryByRole("button", { name: /Remover filtro/ })).not.toBeInTheDocument();
    expect(mockUseNearbyDiscoveries).toHaveBeenLastCalledWith(
      expect.objectContaining({ item: undefined }),
    );
  });

  it("tells the empty state which term came up empty", () => {
    setupGeolocation({ coords, denied: false, loading: false });
    setup("/?item=Arroz%205kg");

    expect(screen.getByText(/Ninguém relatou "Arroz 5kg" por aqui ainda/)).toBeInTheDocument();
  });
});
