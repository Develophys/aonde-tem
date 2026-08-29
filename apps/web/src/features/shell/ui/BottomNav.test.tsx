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
  it("renders the three tabs plus the report action", () => {
    renderNav();

    expect(screen.getByRole("link", { name: "Mapa" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Avisos" })).toHaveAttribute("href", "/avisos");
    expect(screen.getByRole("link", { name: "Perfil" })).toHaveAttribute("href", "/perfil");
    expect(screen.getByRole("link", { name: "Relatar produto" })).toHaveAttribute(
      "href",
      "/report",
    );
  });

  it("marks only the tab matching the current route as the current page", () => {
    renderNav("/perfil");

    expect(screen.getByRole("link", { name: "Perfil" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Mapa" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Avisos" })).not.toHaveAttribute("aria-current");
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
