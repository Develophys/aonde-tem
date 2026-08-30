import { useNavigate } from "react-router-dom";
import type { AdminQueueItem } from "@aonde-tem/contracts";
import { useAppStore } from "@/app/store/index.js";
import { ComingSoon } from "@/shared/ui/ComingSoon.js";
import { ApiError } from "@/shared/api/http.js";
import { useModerationQueue, useActionTarget } from "../api/moderation.queries.js";
import { QueueCard } from "./QueueCard.js";

function QueueBody({ items }: { readonly items: AdminQueueItem[] }) {
  const action = useActionTarget();
  const pushToast = useAppStore((s) => s.pushToast);
  // Only the card whose action is actually in flight gets the "in progress" label —
  // `isPending` alone would bleed that label onto every other card (see QueueCard).
  const actingId = action.isPending ? action.variables?.targetId : null;

  if (items.length === 0) {
    return (
      <ComingSoon
        title="Nenhuma denúncia aberta"
        description="Quando alguém denunciar um produto ou relato, ele aparece aqui."
      />
    );
  }

  async function run(item: AdminQueueItem, kind: "hide" | "dismiss") {
    try {
      await action.mutateAsync({
        targetType: item.targetType,
        targetId: item.targetId,
        action: kind,
      });
      pushToast({
        tone: "success",
        message: kind === "hide" ? "Conteúdo removido." : "Denúncia ignorada.",
      });
    } catch (err) {
      // A 409 means another admin resolved this same target first — the content
      // mutation (if any) already happened, so the generic failure message would be
      // actively misleading here: this was not a failure to retry, it was a race lost.
      if (err instanceof ApiError && err.status === 409) {
        pushToast({ tone: "error", message: "Outro admin já resolveu esta denúncia." });
      } else {
        pushToast({ tone: "error", message: "Não foi possível concluir a ação." });
      }
    }
  }

  return (
    <ul className="px-4 py-4 flex flex-col gap-3">
      {items.map((item) => (
        <QueueCard
          key={`${item.targetType}:${item.targetId}`}
          item={item}
          isPending={action.isPending}
          isActing={actingId === item.targetId}
          onAction={(kind) => void run(item, kind)}
        />
      ))}
    </ul>
  );
}

/**
 * The moderation queue. Lives outside AppShell, so there is no tab bar and no
 * --bottom-nav-clearance padding — the back arrow is the only way out, exactly like
 * /report.
 */
export function DenunciasPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useModerationQueue();

  return (
    <div className="w-full min-h-screen bg-surface-alt">
      <div
        className="px-4 py-4 border-b border-border bg-surface flex items-center gap-3"
        style={{ paddingTop: "var(--header-inset-top)" }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="text-text-muted min-h-11 min-w-11 flex items-center justify-center shrink-0"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-text truncate">Denúncias</h1>
        {data && data.items.length > 0 && (
          <span className="text-text-muted text-sm tabular-nums shrink-0">
            {data.items.length} {data.items.length === 1 ? "aberta" : "abertas"}
          </span>
        )}
      </div>

      {isLoading && <p className="px-4 py-6 text-text-muted text-sm">Carregando denúncias…</p>}
      {/* Distinct from the empty state on purpose: a failed request must never read as
          "there is nothing to moderate". */}
      {isError && (
        <p className="px-4 py-6 text-error text-sm">Não foi possível carregar as denúncias.</p>
      )}
      {data && <QueueBody items={data.items} />}
    </div>
  );
}
