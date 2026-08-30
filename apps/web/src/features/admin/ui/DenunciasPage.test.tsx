import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { AdminQueueItem } from "@aonde-tem/contracts";
import { DenunciasPage } from "./DenunciasPage.js";
import { useModerationQueue, useActionTarget } from "../api/moderation.queries.js";
import { useAppStore } from "@/app/store/index.js";
import type { AppStore } from "@/app/store/types.js";

jest.mock("../api/moderation.queries.js", () => ({
  useModerationQueue: jest.fn(),
  useActionTarget: jest.fn(),
}));
const mockUseQueue = useModerationQueue as jest.MockedFunction<typeof useModerationQueue>;
const mockUseAction = useActionTarget as jest.MockedFunction<typeof useActionTarget>;

jest.mock("@/app/store/index.js");
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

function item(overrides: Partial<AdminQueueItem> = {}): AdminQueueItem {
  return {
    targetType: "discovery",
    targetId: "00000000-0000-0000-0000-0000000000d1",
    targetName: "Arroz 5kg",
    targetContext: "Mercadinho do Zé · R$ 24,90",
    flagCount: 1,
    reasons: ["spam"],
    latestComment: null,
    latestReporterEmail: "quem@denunciou.com",
    latestAt: "2026-08-30T12:00:00.000Z",
    ...overrides,
  } as AdminQueueItem;
}

function setup(
  query: Partial<{ data: unknown; isLoading: boolean; isError: boolean }> = {},
  mutateAsync = jest.fn().mockResolvedValue({ ok: true, resolved: 1 }),
) {
  const pushToast = jest.fn();
  mockUseAppStore.mockImplementation((selector: (s: AppStore) => unknown) =>
    selector({ pushToast } as unknown as AppStore),
  );
  mockUseQueue.mockReturnValue({
    data: query.data,
    isLoading: query.isLoading ?? false,
    isError: query.isError ?? false,
  } as unknown as ReturnType<typeof useModerationQueue>);
  mockUseAction.mockReturnValue({
    mutateAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useActionTarget>);

  render(
    <MemoryRouter>
      <DenunciasPage />
    </MemoryRouter>,
  );
  return { mutateAsync, pushToast };
}

describe("DenunciasPage", () => {
  it("shows a loading line while the queue is in flight", () => {
    setup({ isLoading: true });
    expect(screen.getByText("Carregando denúncias…")).toBeInTheDocument();
  });

  it("reports a fetch failure instead of implying the queue is empty", () => {
    setup({ isError: true });
    expect(screen.getByText("Não foi possível carregar as denúncias.")).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma denúncia aberta")).not.toBeInTheDocument();
  });

  it("says so plainly when there is nothing to moderate", () => {
    setup({ data: { items: [] } });
    expect(screen.getByText("Nenhuma denúncia aberta")).toBeInTheDocument();
  });

  it("counts the open targets next to the title", () => {
    setup({
      data: { items: [item(), item({ targetId: "00000000-0000-0000-0000-0000000000d2" })] },
    });
    expect(screen.getByText("2 abertas")).toBeInTheDocument();
  });

  it("renders one card per flagged target", () => {
    setup({
      data: {
        items: [
          item(),
          item({ targetId: "00000000-0000-0000-0000-0000000000p1", targetName: "Cerveja" }),
        ],
      },
    });
    expect(screen.getByText("Arroz 5kg")).toBeInTheDocument();
    expect(screen.getByText("Cerveja")).toBeInTheDocument();
  });

  it("sends the target and the action to the API when a card is ignored", async () => {
    const { mutateAsync } = setup({ data: { items: [item()] } });

    fireEvent.click(screen.getByRole("button", { name: "Ignorar Arroz 5kg" }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        targetType: "discovery",
        targetId: "00000000-0000-0000-0000-0000000000d1",
        action: "dismiss",
      }),
    );
  });

  it("confirms the removal to the moderator", async () => {
    const { pushToast } = setup({ data: { items: [item()] } });

    fireEvent.click(screen.getByRole("button", { name: "Remover Arroz 5kg" }));
    fireEvent.click(screen.getByRole("button", { name: "Sim, remover" }));

    await waitFor(() =>
      expect(pushToast).toHaveBeenCalledWith({ tone: "success", message: "Conteúdo removido." }),
    );
  });

  it("keeps the card and explains itself when the action fails", async () => {
    const mutateAsync = jest.fn().mockRejectedValue(new Error("boom"));
    const { pushToast } = setup({ data: { items: [item()] } }, mutateAsync);

    fireEvent.click(screen.getByRole("button", { name: "Ignorar Arroz 5kg" }));

    await waitFor(() =>
      expect(pushToast).toHaveBeenCalledWith({
        tone: "error",
        message: "Não foi possível concluir a ação.",
      }),
    );
    expect(screen.getByText("Arroz 5kg")).toBeInTheDocument();
  });
});
