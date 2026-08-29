import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OnboardingPage } from "./OnboardingPage.js";
import { useAppStore } from "@/app/store/index.js";
import type { AppStore } from "@/app/store/types.js";

jest.mock("@/app/store/index.js");
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

function setupStore() {
  const store = { completeOnboarding: jest.fn() };
  mockUseAppStore.mockImplementation((selector: (s: AppStore) => unknown) =>
    selector(store as unknown as AppStore),
  );
  return store;
}

function renderPage() {
  const store = setupStore();
  render(
    <MemoryRouter>
      <OnboardingPage />
    </MemoryRouter>,
  );
  return store;
}

function advanceToLocationStep() {
  fireEvent.click(screen.getByRole("button", { name: "Começar" }));
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
}

describe("OnboardingPage — steps", () => {
  beforeEach(() => mockNavigate.mockReset());

  it("opens on the welcome screen", () => {
    renderPage();

    expect(screen.getByText("Aonde Tem")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Começar" })).toBeInTheDocument();
  });

  it("advances through the value prop to the location ask", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    expect(screen.getByText("Relatos da comunidade")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Ative sua localização")).toBeInTheDocument();
  });

  it("reports progress to assistive technology", () => {
    renderPage();

    expect(screen.getByText("Passo 1 de 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    expect(screen.getByText("Passo 2 de 3")).toBeInTheDocument();
  });
});

describe("OnboardingPage — completion", () => {
  beforeEach(() => mockNavigate.mockReset());

  it("finishes and goes to the map after allowing location", () => {
    const store = renderPage();
    advanceToLocationStep();

    fireEvent.click(screen.getByRole("button", { name: "Permitir localização" }));

    expect(store.completeOnboarding).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("finishes and goes to the map when location is skipped", () => {
    const store = renderPage();
    advanceToLocationStep();

    fireEvent.click(screen.getByRole("button", { name: "Agora não" }));

    expect(store.completeOnboarding).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("finishes before sending an existing user to sign in", () => {
    const store = renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Já tenho conta" }));

    expect(store.completeOnboarding).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/signin", { replace: true });
  });
});
