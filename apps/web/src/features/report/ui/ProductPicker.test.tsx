import { render, screen, fireEvent } from "@testing-library/react";
import { ProductPicker } from "./ProductPicker.js";
import { useProductSearch } from "../api/product-autocomplete.api.js";

// Explicit factory (not bare automock) so Jest never has to load/transpile the real
// module — it uses `import.meta.env`, which ts-jest's CommonJS target can't parse.
jest.mock("../api/product-autocomplete.api.js", () => ({
  useProductSearch: jest.fn(),
}));
const mockUseProductSearch = useProductSearch as jest.MockedFunction<typeof useProductSearch>;

const results = [
  { id: "p1", name: "Arroz 5kg" },
  { id: "p2", name: "Arroz 1kg" },
];

function mockResults(data: { results: { id: string; name: string }[] }) {
  mockUseProductSearch.mockReturnValue({ data } as unknown as ReturnType<typeof useProductSearch>);
}

function setup() {
  const onChange = jest.fn();
  render(<ProductPicker value={null} onChange={onChange} />);
  const input = screen.getByRole("combobox");
  return { input, onChange };
}

describe("ProductPicker", () => {
  beforeEach(() => mockResults({ results: [] }));

  it("has combobox semantics collapsed by default", () => {
    const { input } = setup();
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("shows a listbox of options once results arrive and the field is focused", () => {
    mockResults({ results });
    const { input } = setup();
    fireEvent.focus(input);

    expect(input).toHaveAttribute("aria-expanded", "true");
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent("Arroz 5kg");
  });

  it("ArrowDown highlights options and wraps around", () => {
    mockResults({ results });
    const { input } = setup();
    fireEvent.focus(input);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", "product-picker-option-p1");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", "product-picker-option-p2");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
  });

  it("ArrowUp from the top wraps to the last option", () => {
    mockResults({ results });
    const { input } = setup();
    fireEvent.focus(input);

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
  });

  it("Enter selects the highlighted option and closes the listbox", () => {
    mockResults({ results });
    const { input, onChange } = setup();
    fireEvent.focus(input);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenLastCalledWith({ id: "p1", name: "Arroz 5kg" });
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("Escape closes the listbox without selecting", () => {
    mockResults({ results });
    const { input, onChange } = setup();
    fireEvent.focus(input);

    fireEvent.keyDown(input, { key: "Escape" });

    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clicking an option selects it directly", () => {
    mockResults({ results });
    const { input, onChange } = setup();
    fireEvent.focus(input);

    fireEvent.mouseDown(screen.getAllByRole("option")[1]!);

    expect(onChange).toHaveBeenLastCalledWith({ id: "p2", name: "Arroz 1kg" });
  });

  it("mousedown outside the field closes the listbox without selecting — the only dismissal touch users (no Escape key) have", () => {
    mockResults({ results });
    const { input, onChange } = setup();
    fireEvent.focus(input);
    expect(input).toHaveAttribute("aria-expanded", "true");

    fireEvent.mouseDown(document.body);

    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("mousedown inside the field (e.g. on the input itself) does not close the listbox", () => {
    mockResults({ results });
    const { input } = setup();
    fireEvent.focus(input);

    fireEvent.mouseDown(input);

    expect(input).toHaveAttribute("aria-expanded", "true");
  });
});
