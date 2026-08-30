import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BottomNav } from "./BottomNav.js";

function renderNav(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <BottomNav />
    </MemoryRouter>,
  );
}

describe("BottomNav", () => {
  it("renders the four tabs plus the report action", () => {
    renderNav();

    expect(screen.getByRole("link", { name: "Mapa" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Buscar" })).toHaveAttribute("href", "/buscar");
    expect(screen.getByRole("link", { name: "Avisos" })).toHaveAttribute("href", "/avisos");
    expect(screen.getByRole("link", { name: "Perfil" })).toHaveAttribute("href", "/perfil");
    expect(screen.getByRole("link", { name: "Relatar produto" })).toHaveAttribute(
      "href",
      "/report",
    );
  });

  it("puts the report action dead centre, with two tabs on each side", () => {
    const { container } = renderNav();

    // The whole point of five slots: an odd count is what lets the raised control sit at
    // 50% instead of straddling a tab label. Assert the DOM order the centring depends on,
    // since jsdom cannot measure the grid itself.
    const slots = Array.from(container.querySelectorAll("nav > *"));
    expect(slots).toHaveLength(5);
    expect(slots[2]!.querySelector("a")).toHaveAttribute("href", "/report");
    expect(slots[0]!.textContent).toContain("Mapa");
    expect(slots[1]!.textContent).toContain("Buscar");
    expect(slots[3]!.textContent).toContain("Avisos");
    expect(slots[4]!.textContent).toContain("Perfil");
  });

  it("marks only the tab matching the current route as the current page", () => {
    renderNav("/perfil");

    expect(screen.getByRole("link", { name: "Perfil" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Mapa" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Buscar" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Avisos" })).not.toHaveAttribute("aria-current");
  });

  it("marks the search tab when the map is showing a filter from it", () => {
    renderNav("/buscar");

    expect(screen.getByRole("link", { name: "Buscar" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Mapa" })).not.toHaveAttribute("aria-current");
  });

  it("never marks the report action as the current page", () => {
    renderNav("/report");

    expect(screen.getByRole("link", { name: "Relatar produto" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("labels the navigation landmark", () => {
    renderNav();

    expect(screen.getByRole("navigation", { name: "Navegação principal" })).toBeInTheDocument();
  });
});
