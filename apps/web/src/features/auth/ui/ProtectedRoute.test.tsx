import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute.js";
import { useAppStore } from "../../../app/store/index.js";

jest.mock("../../../app/store/index.js");
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

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
    mockUseAppStore.mockReturnValue(true as never);
    renderWithRouter("/report");
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("redirects to /signin when not authenticated", () => {
    mockUseAppStore.mockReturnValue(false as never);
    renderWithRouter("/report");
    expect(screen.getByText("Sign In Page")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });
});
