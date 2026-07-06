import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EditDiscoverySheet } from "./EditDiscoverySheet.js";
import { useUpdateDiscovery } from "../api/report.api.js";
import { useAppStore } from "../../../app/store/index.js";
import type { AppStore } from "../../../app/store/types.js";

jest.mock("../api/report.api.js", () => ({
  useUpdateDiscovery: jest.fn(),
}));
const mockUseUpdateDiscovery = useUpdateDiscovery as jest.MockedFunction<typeof useUpdateDiscovery>;

jest.mock("../../../app/store/index.js");
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

function setup(mutateAsync = jest.fn().mockResolvedValue({})) {
  mockUseUpdateDiscovery.mockReturnValue({
    mutateAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateDiscovery>);

  const pushToast = jest.fn();
  mockUseAppStore.mockImplementation((selector: (s: AppStore) => unknown) =>
    selector({ pushToast } as unknown as AppStore),
  );

  const onClose = jest.fn();
  render(
    <EditDiscoverySheet
      discoveryId="d1"
      initialPriceBrl={9.99}
      initialQuantity={5}
      initialNote="nota original"
      onClose={onClose}
    />,
  );
  return { mutateAsync, pushToast, onClose };
}

describe("EditDiscoverySheet", () => {
  it("pre-fills price, quantity and note from the current item", () => {
    setup();
    expect(screen.getByDisplayValue("9,99")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantidade")).toHaveValue(5);
    expect(screen.getByLabelText("Nota (opcional)")).toHaveValue("nota original");
  });

  it("submits the edited fields and closes on success", async () => {
    const { mutateAsync, onClose } = setup();
    fireEvent.change(screen.getByLabelText("Quantidade"), { target: { value: "2" } });

    fireEvent.click(screen.getByText("Salvar"));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        id: "d1",
        dto: { priceBrl: 9.99, quantity: 2, note: "nota original" },
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("shows an error toast and stays open when the mutation fails", async () => {
    const mutateAsync = jest.fn().mockRejectedValue(new Error("boom"));
    const { pushToast, onClose } = setup(mutateAsync);

    fireEvent.click(screen.getByText("Salvar"));

    await waitFor(() =>
      expect(pushToast).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" })),
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
