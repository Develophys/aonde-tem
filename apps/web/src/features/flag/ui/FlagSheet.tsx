import { useState } from "react";
import { useCreateFlag } from "../api/flag.api.js";
import { BottomSheet } from "@/shared/ui/BottomSheet.js";
import { GhostButton } from "@/shared/ui/GhostButton.js";
import type { CreateFlagDto } from "@aonde-tem/contracts";

type FlagReason = CreateFlagDto["reason"];
type FlagTargetType = CreateFlagDto["targetType"];

const REASONS: { value: FlagReason; label: string }[] = [
  { value: "illegal", label: "Produto ilegal" },
  { value: "inappropriate", label: "Conteúdo inapropriado" },
  { value: "spam", label: "Spam / enganoso" },
  { value: "wrong_info", label: "Informação errada" },
  { value: "other", label: "Outro" },
];

interface Props {
  readonly targetType: FlagTargetType;
  readonly targetId: string;
  readonly onClose: () => void;
}

export function FlagSheet({ targetType, targetId, onClose }: Props) {
  const [reason, setReason] = useState<FlagReason | "">("");
  const createFlag = useCreateFlag();

  async function submit() {
    if (!reason) return;
    try {
      await createFlag.mutateAsync({ targetType, targetId, reason });
    } catch {
      // surfaced via createFlag.isError below
    }
  }

  if (createFlag.isSuccess) {
    return (
      <BottomSheet
        key="success"
        label="Denúncia enviada"
        onClose={onClose}
        className="p-6 pb-10 flex flex-col items-center gap-4"
      >
        <p className="text-text font-semibold">Denúncia enviada</p>
        <p className="text-text-muted text-sm text-center">Nossa equipe revisará em breve.</p>
        <button type="button" onClick={onClose} className="text-accent font-medium min-h-11 px-4">
          Fechar
        </button>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet key="form" label="Denunciar" onClose={onClose} className="p-6 pb-10">
      <h2 className="text-lg font-bold text-text mb-4">Denunciar</h2>
      <div className="flex flex-col gap-2 mb-6" role="radiogroup" aria-label="Motivo da denúncia">
        {REASONS.map((r) => (
          <button
            type="button"
            key={r.value}
            role="radio"
            aria-checked={reason === r.value}
            onClick={() => setReason(r.value)}
            className={`text-left px-4 py-3 rounded-control border text-sm font-medium min-h-11 ${
              reason === r.value
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-text"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {createFlag.isError && (
        <p className="text-error text-sm text-center mb-4" role="alert">
          Não foi possível enviar a denúncia. Tente novamente.
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!reason || createFlag.isPending}
        className="w-full bg-brand text-white font-semibold py-3 rounded-control min-h-11 disabled:opacity-50"
      >
        {createFlag.isPending ? "Enviando…" : "Enviar denúncia"}
      </button>
      <GhostButton fullWidth onClick={onClose} className="mt-2">
        Cancelar
      </GhostButton>
    </BottomSheet>
  );
}
