import { render, screen, fireEvent } from "@testing-library/react";
import { PlaceModal } from "./PlaceModal.js";
import { usePlaceDiscoveries } from "../api/place.queries.js";
import { useAppStore } from "../../../app/store/index.js";
import type { AppStore } from "../../../app/store/types.js";

jest.mock("../api/place.queries.js", () => ({
  usePlaceDiscoveries: jest.fn(),
}));
const mockUsePlaceDiscoveries = usePlaceDiscoveries as jest.MockedFunction<
  typeof usePlaceDiscoveries
>;

jest.mock("../../../app/store/index.js");
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

jest.mock("../../flag/ui/FlagSheet.js", () => ({
  FlagSheet: () => <div data-testid="flag-sheet" />,
}));
jest.mock("../../report/ui/EditDiscoverySheet.js", () => ({
  EditDiscoverySheet: () => <div data-testid="edit-sheet" />,
}));
jest.mock("../../report/ui/DeleteDiscoveryConfirmSheet.js", () => ({
  DeleteDiscoveryConfirmSheet: () => <div data-testid="delete-sheet" />,
}));

function setupStore(isAuthenticated: boolean) {
  const store = {
    clearSelectedPlace: jest.fn(),
    isAuthenticated: () => isAuthenticated,
  };
  mockUseAppStore.mockImplementation((selector: (s: AppStore) => unknown) =>
    selector(store as unknown as AppStore),
  );
  return store;
}

function mockData(discoveries: Array<Record<string, unknown>>) {
  mockUsePlaceDiscoveries.mockReturnValue({
    data: {
      id: "place-1",
      name: "Loja Teste",
      address: undefined,
      coords: { lat: -23.5, lng: -46.6 },
      discoveries,
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof usePlaceDiscoveries>);
}

const mineItem = {
  id: "d1",
  productId: "p1",
  productName: "Arroz 5kg",
  priceBrl: 9.99,
  quantity: 3,
  note: null,
  isMine: true,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  ageMinutes: 5,
};

const othersItem = { ...mineItem, id: "d2", isMine: false };

describe("PlaceModal — edit/delete controls", () => {
  it("shows Editar/Excluir for a report the user owns", () => {
    setupStore(true);
    mockData([mineItem]);
    render(<PlaceModal placeId="place-1" onFlyTo={jest.fn()} />);

    expect(screen.getByText("Editar")).toBeInTheDocument();
    expect(screen.getByText("Excluir")).toBeInTheDocument();
  });

  it("hides Editar/Excluir for a report the user does not own", () => {
    setupStore(true);
    mockData([othersItem]);
    render(<PlaceModal placeId="place-1" onFlyTo={jest.fn()} />);

    expect(screen.queryByText("Editar")).not.toBeInTheDocument();
    expect(screen.queryByText("Excluir")).not.toBeInTheDocument();
  });

  it("opens the edit sheet when Editar is clicked", () => {
    setupStore(true);
    mockData([mineItem]);
    render(<PlaceModal placeId="place-1" onFlyTo={jest.fn()} />);

    fireEvent.click(screen.getByText("Editar"));
    expect(screen.getByTestId("edit-sheet")).toBeInTheDocument();
  });

  it("opens the delete confirm sheet when Excluir is clicked", () => {
    setupStore(true);
    mockData([mineItem]);
    render(<PlaceModal placeId="place-1" onFlyTo={jest.fn()} />);

    fireEvent.click(screen.getByText("Excluir"));
    expect(screen.getByTestId("delete-sheet")).toBeInTheDocument();
  });
});
