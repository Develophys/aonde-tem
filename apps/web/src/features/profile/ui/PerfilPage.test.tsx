import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PerfilPage } from "./PerfilPage.js";
import { useAppStore } from "@/app/store/index.js";
import type { AppStore } from "@/app/store/types.js";

jest.mock("@/app/store/index.js");
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const authenticatedUser = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "user@example.com",
  displayName: "Mauricio",
  role: "user" as const,
};

function setupStore(overrides: {
  theme?: "light" | "dark";
  sessionUser?: AppStore["sessionUser"];
}) {
  const store = {
    theme: overrides.theme ?? "light",
    setTheme: jest.fn(),
    sessionUser: overrides.sessionUser ?? null,
    clearSession: jest.fn(),
  };
  mockUseAppStore.mockImplementation((selector: (s: AppStore) => unknown) =>
    selector(store as unknown as AppStore),
  );
  return store;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <PerfilPage />
    </MemoryRouter>,
  );
}

describe("PerfilPage — theme control", () => {
  it("switches to dark mode when toggled from light", () => {
    const store = setupStore({ theme: "light" });
    renderPage();

    fireEvent.click(screen.getByRole("switch", { name: "Modo escuro" }));

    expect(store.setTheme).toHaveBeenCalledWith("dark");
  });

  it("switches back to light mode when toggled from dark", () => {
    const store = setupStore({ theme: "dark" });
    renderPage();

    const toggle = screen.getByRole("switch", { name: "Modo escuro" });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    fireEvent.click(toggle);

    expect(store.setTheme).toHaveBeenCalledWith("light");
  });
});

describe("PerfilPage — session controls", () => {
  it("offers sign-in when there is no session", () => {
    setupStore({ sessionUser: null });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(mockNavigate).toHaveBeenCalledWith("/signin");
    expect(screen.queryByRole("button", { name: "Sair" })).not.toBeInTheDocument();
  });

  it("offers sign-out and shows the account e-mail when signed in", () => {
    const store = setupStore({ sessionUser: authenticatedUser });
    renderPage();

    expect(screen.getByText("user@example.com")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sair" }));

    expect(store.clearSession).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Entrar" })).not.toBeInTheDocument();
  });
});
