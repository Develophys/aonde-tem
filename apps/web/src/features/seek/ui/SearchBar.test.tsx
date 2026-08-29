import { render, screen, fireEvent, act } from "@testing-library/react";
import { SearchBar } from "./SearchBar.js";
import { useProductSearch } from "@/features/product/api/product-autocomplete.api.js";

jest.mock("@/features/product/api/product-autocomplete.api.js", () => ({
  useProductSearch: jest.fn(),
}));
const mockUseProductSearch = useProductSearch as jest.MockedFunction<typeof useProductSearch>;

function setupSuggestions(results: { id: string; name: string }[]) {
  mockUseProductSearch.mockReturnValue({ data: { results } } as unknown as ReturnType<
    typeof useProductSearch
  >);
}

const SUGGESTIONS = [
  { id: "p1", name: "Arroz 5kg" },
  { id: "p2", name: "Arroz integral 1kg" },
];

function renderBar(onSearch = jest.fn()) {
  render(<SearchBar onSearch={onSearch} />);
  return onSearch;
}

function expand() {
  fireEvent.click(screen.getByRole("button", { name: "Buscar produto" }));
}

describe("SearchBar — collapsing", () => {
  beforeEach(() => setupSuggestions([]));

  it("starts collapsed as a magnifier button with no input", () => {
    renderBar();

    expect(screen.getByRole("button", { name: "Buscar produto" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("expands into a focused input when the magnifier is pressed", () => {
    renderBar();
    expand();

    const input = screen.getByRole("combobox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it("collapses on Escape and returns focus to the magnifier", () => {
    renderBar();
    expand();

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });

    const trigger = screen.getByRole("button", { name: "Buscar produto" });
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("clears the query when it collapses", () => {
    renderBar();
    expand();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "arroz" } });
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });

    expand();
    expect(screen.getByRole("combobox")).toHaveValue("");
  });

  it("clears the query and collapses in one press of the × button", () => {
    renderBar();
    expand();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "arroz" } });

    fireEvent.click(screen.getByRole("button", { name: "Fechar busca" }));

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buscar produto" })).toHaveFocus();

    expand();
    expect(screen.getByRole("combobox")).toHaveValue("");
  });
});

describe("SearchBar — suggestions", () => {
  it("lists matching products once there is a query", () => {
    setupSuggestions(SUGGESTIONS);
    renderBar();
    expand();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "arroz" } });

    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true");
  });

  it("fills the input from a chosen suggestion and keeps the bar expanded", () => {
    setupSuggestions(SUGGESTIONS);
    renderBar();
    expand();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "arroz" } });

    fireEvent.mouseDown(screen.getAllByRole("option")[0]!);

    expect(screen.getByRole("combobox")).toHaveValue("Arroz 5kg");
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("closes only the dropdown on the first Escape, keeping the bar expanded", () => {
    setupSuggestions(SUGGESTIONS);
    renderBar();
    expand();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "arroz" } });

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("selects the highlighted suggestion with the keyboard", () => {
    setupSuggestions(SUGGESTIONS);
    renderBar();
    expand();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "arroz" } });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByRole("combobox")).toHaveValue("Arroz integral 1kg");
  });
});

describe("SearchBar — filtering", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setupSuggestions([]);
  });
  afterEach(() => jest.useRealTimers());

  it("reports the debounced query to its parent", () => {
    const onSearch = renderBar();
    expand();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "  arroz  " } });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(onSearch).toHaveBeenCalledWith("arroz");
  });
});
