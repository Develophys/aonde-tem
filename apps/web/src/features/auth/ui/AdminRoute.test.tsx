import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminRoute } from "./AdminRoute.js";
import { useAppStore } from "@/app/store/index.js";
import type { AppStore } from "@/app/store/types.js";

jest.mock("../../../app/store/index.js");
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

function makeStoreSelector(sessionUser: AppStore["sessionUser"]) {
  return (selector: (s: AppStore) => unknown) =>
    selector({
      sessionUser,
      isAuthenticated: () => sessionUser !== null,
    } as unknown as AppStore);
}

const admin = {
  id: "00000000-0000-0000-0000-000000000002",
  email: "admin@aonde-tem.dev",
  displayName: "Admin",
  role: "admin" as const,
};
const plainUser = { ...admin, id: "00000000-0000-0000-0000-000000000001", role: "user" as const };

function renderAt() {
  return render(
    <MemoryRouter initialEntries={["/admin/denuncias"]}>
      <Routes>
        <Route path="/" element={<div>Mapa</div>} />
        <Route path="/signin" element={<div>Sign In Page</div>} />
        <Route
          path="/admin/denuncias"
          element={
            <AdminRoute>
              <div>Fila de denúncias</div>
            </AdminRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminRoute", () => {
  it("renders the page for an admin", () => {
    mockUseAppStore.mockImplementation(makeStoreSelector(admin));
    renderAt();
    expect(screen.getByText("Fila de denúncias")).toBeInTheDocument();
  });

  it("sends a signed-out visitor to sign in", () => {
    mockUseAppStore.mockImplementation(makeStoreSelector(null));
    renderAt();
    expect(screen.getByText("Sign In Page")).toBeInTheDocument();
  });

  it("sends a signed-in non-admin to the map, not to sign-in", () => {
    mockUseAppStore.mockImplementation(makeStoreSelector(plainUser));
    renderAt();

    // Bouncing them to /signin would tell them, by implication, that a page exists
    // here that they are not allowed to see.
    expect(screen.getByText("Mapa")).toBeInTheDocument();
    expect(screen.queryByText("Sign In Page")).not.toBeInTheDocument();
    expect(screen.queryByText("Fila de denúncias")).not.toBeInTheDocument();
  });
});
