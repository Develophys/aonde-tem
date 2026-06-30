import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppHeader } from "./AppHeader.js";
import { useAppStore } from "../../../app/store/index.js";
import type { AppStore } from "../../../app/store/types.js";

jest.mock("../../../app/store/index.js");
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

type MockStorePartial = {
  sessionUser: AppStore["sessionUser"];
  clearSession?: jest.Mock;
};

function setupStore({ sessionUser, clearSession = jest.fn() }: MockStorePartial) {
  const store = { sessionUser, clearSession };
  mockUseAppStore.mockImplementation((selector: (s: AppStore) => unknown) =>
    selector(store as unknown as AppStore),
  );
  return store;
}

function renderHeader() {
  return render(
    <MemoryRouter>
      <AppHeader />
    </MemoryRouter>,
  );
}

const authenticatedUser = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "user@example.com",
  displayName: "Mauricio",
  role: "user" as const,
};

describe("AppHeader — unauthenticated", () => {
  beforeEach(() => mockNavigate.mockReset());

  it("renders Entrar button when sessionUser is null", () => {
    setupStore({ sessionUser: null });
    renderHeader();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
  });

  it("navigates to /signin when Entrar is clicked", () => {
    setupStore({ sessionUser: null });
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(mockNavigate).toHaveBeenCalledWith("/signin");
  });

  it("returns nothing when on /signin", () => {
    setupStore({ sessionUser: null });
    render(
      <MemoryRouter initialEntries={["/signin"]}>
        <AppHeader />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: "Entrar" })).not.toBeInTheDocument();
  });

  it("returns nothing when on /signup", () => {
    setupStore({ sessionUser: null });
    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <AppHeader />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: "Entrar" })).not.toBeInTheDocument();
  });
});

describe("AppHeader — authenticated", () => {
  beforeEach(() => mockNavigate.mockReset());

  it("renders initials from displayName (first 2 chars, uppercased)", () => {
    setupStore({ sessionUser: authenticatedUser });
    renderHeader();
    expect(screen.getByText("MA")).toBeInTheDocument();
  });

  it("falls back to first char of email when displayName is null", () => {
    setupStore({ sessionUser: { ...authenticatedUser, displayName: null } });
    renderHeader();
    expect(screen.getByText("U")).toBeInTheDocument();
  });

  it("does not show Sair before avatar is clicked", () => {
    setupStore({ sessionUser: authenticatedUser });
    renderHeader();
    expect(screen.queryByText("Sair")).not.toBeInTheDocument();
  });

  it("shows Sair dropdown after avatar pill is clicked", () => {
    setupStore({ sessionUser: authenticatedUser });
    renderHeader();
    fireEvent.click(screen.getByText("MA").closest("button")!);
    expect(screen.getByText("Sair")).toBeInTheDocument();
  });

  it("calls clearSession when Sair is clicked", () => {
    const store = setupStore({ sessionUser: authenticatedUser });
    renderHeader();
    fireEvent.click(screen.getByText("MA").closest("button")!);
    fireEvent.click(screen.getByText("Sair"));
    expect(store.clearSession).toHaveBeenCalledTimes(1);
  });

  it("hides dropdown after Sair is clicked", () => {
    setupStore({ sessionUser: authenticatedUser });
    renderHeader();
    fireEvent.click(screen.getByText("MA").closest("button")!);
    fireEvent.click(screen.getByText("Sair"));
    expect(screen.queryByText("Sair")).not.toBeInTheDocument();
  });

  it("closes dropdown when Escape is pressed", () => {
    setupStore({ sessionUser: authenticatedUser });
    renderHeader();
    fireEvent.click(screen.getByText("MA").closest("button")!);
    expect(screen.getByText("Sair")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Sair")).not.toBeInTheDocument();
  });
});
