import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { OnboardingGate } from "./OnboardingGate.js";
import { useAppStore } from "@/app/store/index.js";
import type { AppStore } from "@/app/store/types.js";

jest.mock("@/app/store/index.js");
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

function renderGate(hasSeenOnboarding: boolean) {
  mockUseAppStore.mockImplementation((selector: (s: AppStore) => unknown) =>
    selector({ hasSeenOnboarding } as unknown as AppStore),
  );

  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route
          path="/"
          element={
            <OnboardingGate>
              <p>mapa</p>
            </OnboardingGate>
          }
        />
        <Route path="/onboarding" element={<p>intro</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("OnboardingGate", () => {
  it("redirects a first-time visitor to the intro", () => {
    renderGate(false);

    expect(screen.getByText("intro")).toBeInTheDocument();
    expect(screen.queryByText("mapa")).not.toBeInTheDocument();
  });

  it("renders the map for a returning visitor", () => {
    renderGate(true);

    expect(screen.getByText("mapa")).toBeInTheDocument();
    expect(screen.queryByText("intro")).not.toBeInTheDocument();
  });
});
