import { useState } from "react";
import type { AdminQueueItem, FlagReasonDto } from "@aonde-tem/contracts";
import { formatAge, minutesSince } from "@/shared/model/time.js";

const REASON_LABEL: Record<FlagReasonDto, string> = {
  illegal: "Ilegal",
  inappropriate: "Inapropriado",
  spam: "Spam",
  wrong_info: "Informação errada",
  other: "Outro",
};

// Two categories, not five colours. Five saturated hues on one screen would break the
// One Accent Rule; the handoff asks for one colour per reason *category*. This screen's
// single accent is `error`, shared by the harmful chips and the Remover button.
const HARMFUL: ReadonlySet<FlagReasonDto> = new Set(["illegal", "inappropriate"]);

function ReasonChip({ reason }: { readonly reason: FlagReasonDto }) {
  const harmful = HARMFUL.has(reason);
  return (
    <span
      className={`px-2 py-1 rounded-control text-xs font-medium ${
        harmful ? "bg-error/10 text-error" : "bg-surface-alt text-text-muted"
      }`}
    >
      {REASON_LABEL[reason]}
    </span>
  );
}

interface Props {
  readonly item: AdminQueueItem;
  readonly onAction: (action: "hide" | "dismiss") => void;
  readonly isPending: boolean;
}

export function QueueCard({ item, onAction, isPending }: Props) {
  const [confirming, setConfirming] = useState(false);

  // A target whose content is already gone cannot be removed again; dismissing is the
  // only resolution left, and offering "Remover" would be a button that does nothing.
  const isGone = item.targetName === null;
  // Buttons name their target: a list of identical "Remover" buttons is unusable by
  // screen reader rotor or by voice control.
  const suffix = isGone ? "denúncia" : item.targetName;

  return (
    <li className="bg-surface border border-border rounded-control p-4">
      <p className={`font-medium truncate ${isGone ? "text-text-muted italic" : "text-text"}`}>
        {item.targetName ?? "Conteúdo removido"}
      </p>
      {item.targetContext && (
        <p className="text-text-muted text-sm truncate">{item.targetContext}</p>
      )}

      <div className="flex flex-wrap gap-2 mt-3">
        {item.reasons.map((r) => (
          <ReasonChip key={r} reason={r} />
        ))}
        {item.flagCount > 1 && (
          <span className="px-2 py-1 rounded-control text-xs font-medium bg-surface-alt text-text-muted tabular-nums">
            {item.flagCount} denúncias
          </span>
        )}
      </div>

      {item.latestComment && (
        <p className="text-text-muted text-sm italic mt-2 wrap-break-word">
          “{item.latestComment}”
        </p>
      )}

      <p className="text-text-muted text-xs mt-2 truncate">
        por {item.latestReporterEmail} · {formatAge(minutesSince(item.latestAt))}
      </p>

      <div className="mt-3" aria-live="polite">
        {confirming ? (
          <>
            <p className="text-text text-sm font-medium mb-2">Remover mesmo?</p>
            <div className="flex gap-2 animate-toast-in">
              <button
                type="button"
                disabled={isPending}
                onClick={() => onAction("hide")}
                className="flex-1 min-h-11 rounded-control bg-error text-white font-semibold disabled:opacity-50"
              >
                {isPending ? "Removendo…" : "Sim, remover"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setConfirming(false)}
                className="flex-1 min-h-11 rounded-control border border-border text-text font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <div className="flex gap-2">
            {!isGone && (
              <button
                type="button"
                disabled={isPending}
                aria-label={`Remover ${suffix}`}
                onClick={() => setConfirming(true)}
                className="flex-1 min-h-11 rounded-control bg-error text-white font-semibold disabled:opacity-50"
              >
                Remover
              </button>
            )}
            <button
              type="button"
              disabled={isPending}
              aria-label={`Ignorar ${suffix}`}
              onClick={() => onAction("dismiss")}
              className="flex-1 min-h-11 rounded-control border border-border text-text font-semibold disabled:opacity-50"
            >
              {isPending ? "Ignorando…" : "Ignorar"}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
