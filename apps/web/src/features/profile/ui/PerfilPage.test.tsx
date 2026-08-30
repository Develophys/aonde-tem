import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PerfilPage } from "./PerfilPage.js";
import { useAppStore } from "@/app/store/index.js";
import { useMyDiscoveries } from "../api/my-discoveries.queries.js";
import type { AppStore } from "@/app/store/types.js";

jest.mock("@/app/store/index.js");
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

jest.mock("../api/my-discoveries.queries.js", () => ({
  useMyDiscoveries: jest.fn(),
}));
const mockUseMyDiscoveries = useMyDiscoveries as jest.MockedFunction<typeof useMyDiscoveries>;

function setupQuery(state: Partial<{ data: unknown; isLoading: boolean; isError: boolean }> = {}) {
  mockUseMyDiscoveries.mockReturnValue({
    data: state.data,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
  } as unknown as ReturnType<typeof useMyDiscoveries>);
}

function report(overrides: Record<string, unknown> = {}) {
  return {
    id: "d1",
    productId: "00000000-0000-0000-0000-0000000000p1",
    productName: "Arroz 5kg",
    placeId: "00000000-0000-0000-0000-0000000000l1",
    placeName: "Mercadinho do Zé",
    priceBrl: 24.9,
    quantity: 3,
    note: null,
    createdAt: "2026-08-29T11:00:00.000Z",
    expiresAt: "2026-08-29T23:00:00.000Z",
    isExpired: false,
    ...overrides,
  };
}

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

beforeEach(() => setupQuery({ data: undefined }));

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

describe("PerfilPage — header", () => {
  it("shows the account's initials, name and join month once the profile loads", () => {
    setupStore({ sessionUser: authenticatedUser });
    setupQuery({
      data: {
        results: [],
        stats: { total: 0, active: 0, memberSince: "2026-06-14T09:30:00.000Z" },
      },
    });
    renderPage();

    expect(screen.getByText("MA")).toBeInTheDocument();
    expect(screen.getByText("Mauricio")).toBeInTheDocument();
    expect(screen.getByText(/Reportando desde jun\.? 2026/i)).toBeInTheDocument();
  });

  it("shows both stat columns from the server, not a computed guess", () => {
    setupStore({ sessionUser: authenticatedUser });
    setupQuery({
      data: {
        results: [report(), report({ id: "d2", isExpired: true })],
        stats: { total: 27, active: 4, memberSince: "2026-06-14T09:30:00.000Z" },
      },
    });
    renderPage();

    expect(screen.getByText("27")).toBeInTheDocument();
    expect(screen.getByText("relatos")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("ativos")).toBeInTheDocument();
  });

  it("renders no header at all when there is no session", () => {
    setupStore({ sessionUser: null });
    renderPage();

    expect(screen.queryByText(/Reportando desde/i)).not.toBeInTheDocument();
  });
});

describe("PerfilPage — my reports list", () => {
  it("lists each report with its product, place and price", () => {
    setupStore({ sessionUser: authenticatedUser });
    setupQuery({
      data: {
        results: [report()],
        stats: { total: 1, active: 1, memberSince: "2026-06-14T09:30:00.000Z" },
      },
    });
    renderPage();

    expect(screen.getByText("Arroz 5kg")).toBeInTheDocument();
    expect(screen.getByText("Mercadinho do Zé")).toBeInTheDocument();
    expect(screen.getByText("R$ 24,90")).toBeInTheDocument();
  });

  it("marks an expired report and leaves a live one unmarked", () => {
    setupStore({ sessionUser: authenticatedUser });
    setupQuery({
      data: {
        results: [
          report({ id: "live", productName: "Arroz 5kg", isExpired: false }),
          report({ id: "dead", productName: "Óleo de soja 900ml", isExpired: true }),
        ],
        stats: { total: 2, active: 1, memberSince: "2026-06-14T09:30:00.000Z" },
      },
    });
    renderPage();

    expect(screen.getAllByText("expirado")).toHaveLength(1);
    expect(screen.getByText("Óleo de soja 900ml")).toBeInTheDocument();
  });

  it("invites a first report instead of showing an empty list", () => {
    setupStore({ sessionUser: authenticatedUser });
    setupQuery({
      data: {
        results: [],
        stats: { total: 0, active: 0, memberSince: "2026-06-14T09:30:00.000Z" },
      },
    });
    renderPage();

    expect(screen.getByText("Você ainda não relatou nada")).toBeInTheDocument();
  });

  it("asks the visitor to sign in rather than fetching without a session", () => {
    setupStore({ sessionUser: null });
    renderPage();

    expect(screen.getByText("Entre para ver seus relatos.")).toBeInTheDocument();
    expect(screen.queryByText("Você ainda não relatou nada")).not.toBeInTheDocument();
  });

  it("reports a fetch failure instead of implying the user has no reports", () => {
    setupStore({ sessionUser: authenticatedUser });
    setupQuery({ isError: true });
    renderPage();

    expect(screen.getByText("Não foi possível carregar seus relatos.")).toBeInTheDocument();
    expect(screen.queryByText("Você ainda não relatou nada")).not.toBeInTheDocument();
  });

  it("shows a loading line while the history is in flight", () => {
    setupStore({ sessionUser: authenticatedUser });
    setupQuery({ isLoading: true });
    renderPage();

    expect(screen.getByText("Carregando seus relatos…")).toBeInTheDocument();
  });
});

describe("PerfilPage — admin entry point", () => {
  it("offers the moderation queue to an admin", () => {
    setupStore({ sessionUser: { ...authenticatedUser, role: "admin" } });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Denúncias" }));

    expect(mockNavigate).toHaveBeenCalledWith("/admin/denuncias");
  });

  it("hides it from everyone else", () => {
    setupStore({ sessionUser: authenticatedUser });
    renderPage();

    expect(screen.queryByRole("button", { name: "Denúncias" })).not.toBeInTheDocument();
  });
});
