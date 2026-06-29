import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute.js";
import { useAppStore } from "../../../app/store/index.js";
import type { AppStore } from "../../../app/store/types.js";

jest.mock("../../../app/store/index.js");
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

function makeStoreSelector(isAuthenticated: boolean) {
  return (selector: (s: AppStore) => unknown) =>
    selector({ isAuthenticated: () => isAuthenticated } as unknown as AppStore);
}

function renderWithRouter(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/signin" element={<div>Sign In Page</div>} />
        <Route
          path="/report"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("renders children when authenticated", () => {
    mockUseAppStore.mockImplementation(makeStoreSelector(true));
    renderWithRouter("/report");
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("redirects to /signin when not authenticated", () => {
    mockUseAppStore.mockImplementation(makeStoreSelector(false));
    renderWithRouter("/report");
    expect(screen.getByText("Sign In Page")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });
});
