import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SearchPage } from "./SearchPage.js";
import { useProductSearch } from "@/features/product/api/product-autocomplete.api.js";

jest.mock("@/features/product/api/product-autocomplete.api.js", () => ({
  useProductSearch: jest.fn(),
}));
const mockUseProductSearch = useProductSearch as jest.MockedFunction<typeof useProductSearch>;

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const SUGGESTIONS = [
  { id: "p1", name: "Arroz 5kg" },
  { id: "p2", name: "Arroz integral 1kg" },
];

function setupSuggestions(results: { id: string; name: string }[]) {
  mockUseProductSearch.mockReturnValue({ data: { results } } as unknown as ReturnType<
    typeof useProductSearch
  >);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SearchPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockReset();
  setupSuggestions([]);
});

describe("SearchPage", () => {
  it("opens with the input focused, so the keyboard is already up", () => {
    renderPage();

    expect(screen.getByRole("combobox")).toHaveFocus();
  });

  it("lists matching products once there is a query", () => {
    setupSuggestions(SUGGESTIONS);
    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "arroz" } });

    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true");
  });

  it("sends the chosen product to the map as a filter", () => {
    setupSuggestions(SUGGESTIONS);
    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "arroz" } });

    fireEvent.mouseDown(screen.getAllByRole("option")[0]!);

    expect(mockNavigate).toHaveBeenCalledWith("/?item=Arroz+5kg");
  });

  it("selects the highlighted suggestion with the keyboard", () => {
    setupSuggestions(SUGGESTIONS);
    renderPage();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "arroz" } });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockNavigate).toHaveBeenCalledWith("/?item=Arroz+integral+1kg");
  });

  it("searches the typed text when Enter is pressed with nothing highlighted", () => {
    setupSuggestions(SUGGESTIONS);
    renderPage();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "arroz" } });

    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockNavigate).toHaveBeenCalledWith("/?item=arroz");
  });

  it("percent-encodes a product name so the map filter survives the URL", () => {
    setupSuggestions([{ id: "p3", name: "Feijão & arroz 1kg" }]);
    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "feijao" } });

    fireEvent.mouseDown(screen.getAllByRole("option")[0]!);

    expect(mockNavigate).toHaveBeenCalledWith("/?item=Feij%C3%A3o+%26+arroz+1kg");
  });

  it("does nothing on Enter when the field is empty", () => {
    renderPage();

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("invites a search instead of showing an empty list", () => {
    renderPage();

    expect(
      screen.getByText("Busque um produto para ver onde tem perto de você."),
    ).toBeInTheDocument();
  });

  it("says so when nothing matches, rather than leaving the screen blank", () => {
    setupSuggestions([]);
    renderPage();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "xyzabc" } });

    expect(screen.getByText("Nenhum produto encontrado.")).toBeInTheDocument();
  });
});
