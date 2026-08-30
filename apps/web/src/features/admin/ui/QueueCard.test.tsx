import { render, screen, fireEvent } from "@testing-library/react";
import type { AdminQueueItem } from "@aonde-tem/contracts";
import { QueueCard } from "./QueueCard.js";

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
    latestAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  } as AdminQueueItem;
}

function setup(overrides: Partial<AdminQueueItem> = {}, isPending = false, isActing = isPending) {
  const onAction = jest.fn();
  render(
    <QueueCard
      item={item(overrides)}
      onAction={onAction}
      isPending={isPending}
      isActing={isActing}
    />,
  );
  return { onAction };
}

describe("QueueCard", () => {
  it("shows what was flagged and where", () => {
    setup();
    expect(screen.getByText("Arroz 5kg")).toBeInTheDocument();
    expect(screen.getByText("Mercadinho do Zé · R$ 24,90")).toBeInTheDocument();
  });

  it("names the reporter and how long ago they flagged it", () => {
    setup();
    expect(screen.getByText(/quem@denunciou\.com/)).toBeInTheDocument();
    expect(screen.getByText(/2h atrás/)).toBeInTheDocument();
  });

  it("counts the flags only when there is more than one", () => {
    const { unmount } = render(
      <QueueCard item={item()} onAction={jest.fn()} isPending={false} isActing={false} />,
    );
    expect(screen.queryByText(/denúncias/)).not.toBeInTheDocument();
    unmount();

    render(
      <QueueCard
        item={item({ flagCount: 3, reasons: ["illegal", "spam"] })}
        onAction={jest.fn()}
        isPending={false}
        isActing={false}
      />,
    );
    expect(screen.getByText("3 denúncias")).toBeInTheDocument();
  });

  it("colours harmful reasons differently from quality ones", () => {
    setup({ reasons: ["illegal", "spam"] });

    expect(screen.getByText("Ilegal").className).toContain("text-error");
    expect(screen.getByText("Spam").className).toContain("text-text-muted");
  });

  it("dismisses immediately — nothing is destroyed by ignoring a flag", () => {
    const { onAction } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Ignorar Arroz 5kg" }));

    expect(onAction).toHaveBeenCalledWith("dismiss");
  });

  it("does not remove on the first tap", () => {
    const { onAction } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Remover Arroz 5kg" }));

    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByText("Remover mesmo?")).toBeInTheDocument();
  });

  it("removes once confirmed", () => {
    const { onAction } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Remover Arroz 5kg" }));
    // The confirm pair carries a target-naming aria-label (WCAG 2.5.3), which overrides
    // their visible text ("Sim, remover") as the accessible name — so they are queried
    // by that aria-label, not by the text a sighted user sees.
    fireEvent.click(screen.getByRole("button", { name: "Confirmar remoção de Arroz 5kg" }));

    expect(onAction).toHaveBeenCalledWith("hide");
  });

  it("restores the original actions when the confirmation is cancelled", () => {
    const { onAction } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Remover Arroz 5kg" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar remoção de Arroz 5kg" }));

    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Remover Arroz 5kg" })).toBeInTheDocument();
  });

  it("names the target in the confirmation pair's accessible name", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Remover Arroz 5kg" }));

    // Two identical "Sim, remover" buttons across two open confirmations would be
    // unusable by screen reader rotor or voice control; the aria-label disambiguates.
    expect(
      screen.getByRole("button", { name: "Confirmar remoção de Arroz 5kg" }),
    ).toHaveTextContent("Sim, remover");
    expect(screen.getByRole("button", { name: "Cancelar remoção de Arroz 5kg" })).toHaveTextContent(
      "Cancelar",
    );
  });

  it("offers only Ignorar when the flagged content is already gone", () => {
    setup({ targetName: null, targetContext: null });

    expect(screen.getByText("Conteúdo removido")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ignorar denúncia" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remover/ })).not.toBeInTheDocument();
  });

  it("shows the reporter's comment when they left one", () => {
    setup({ latestComment: "produto proibido" });
    expect(screen.getByText("“produto proibido”")).toBeInTheDocument();
  });

  it("disables both actions while an action is in flight", () => {
    setup({}, true);

    expect(screen.getByRole("button", { name: "Remover Arroz 5kg" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ignorar Arroz 5kg" })).toBeDisabled();
  });

  it("disables but does not relabel Ignorar when this card is pending but not the one acting", () => {
    // isPending disables every card (deliberately shared, unchanged); isActing is what
    // decides whether *this* card's label says "in progress" — a card can be pending
    // (inert) while another card is the one whose action is actually running.
    setup({}, true, false);

    const ignorar = screen.getByRole("button", { name: "Ignorar Arroz 5kg" });
    expect(ignorar).toBeDisabled();
    expect(ignorar).toHaveTextContent("Ignorar");
  });

  it("relabels Ignorar to 'Ignorando…' only when this card is the one acting", () => {
    setup({}, true, true);

    expect(screen.getByRole("button", { name: "Ignorar Arroz 5kg" })).toHaveTextContent(
      "Ignorando…",
    );
  });

  it("relabels the confirm button to 'Removendo…' only when this card is the one acting", () => {
    const onAction = jest.fn();
    // Reach the confirming state first (requires an enabled button to click), then
    // rerender as pending+acting — mirroring what actually happens: the tap that
    // fires "hide" is what makes this card's own action start.
    const { rerender } = render(
      <QueueCard item={item()} onAction={onAction} isPending={false} isActing={false} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remover Arroz 5kg" }));

    rerender(<QueueCard item={item()} onAction={onAction} isPending={true} isActing={true} />);

    expect(
      screen.getByRole("button", { name: "Confirmar remoção de Arroz 5kg" }),
    ).toHaveTextContent("Removendo…");
  });
});
