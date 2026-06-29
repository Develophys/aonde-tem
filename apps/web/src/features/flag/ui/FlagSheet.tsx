import { useState } from "react";
import { useCreateFlag } from "../api/flag.api.js";
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
  targetType: FlagTargetType;
  targetId: string;
  onClose: () => void;
}

export function FlagSheet({ targetType, targetId, onClose }: Props) {
  const [reason, setReason] = useState<FlagReason | "">("");
  const createFlag = useCreateFlag();

  async function submit() {
    if (!reason) return;
    await createFlag.mutateAsync({ targetType, targetId, reason });
  }

  if (createFlag.isSuccess) {
    return (
      <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl shadow-xl p-6 pb-10 z-20 flex flex-col items-center gap-4">
        <p className="text-text font-semibold">Denúncia enviada</p>
        <p className="text-text-muted text-sm text-center">Nossa equipe revisará em breve.</p>
        <button
          type="button"
          onClick={onClose}
          className="text-brand font-medium min-h-11 px-4"
        >
          Fechar
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl shadow-xl p-6 pb-10 z-20">
      <h2 className="text-lg font-bold text-text mb-4">Denunciar</h2>
      <div className="flex flex-col gap-2 mb-6">
        {REASONS.map((r) => (
          <button
            type="button"
            key={r.value}
            onClick={() => setReason(r.value)}
            className={`text-left px-4 py-3 rounded-xl border text-sm font-medium min-h-11 ${
              reason === r.value
                ? "border-brand bg-brand/10 text-brand"
                : "border-border text-text"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={!reason || createFlag.isPending}
        className="w-full bg-brand text-white font-semibold py-3 rounded-xl min-h-11 disabled:opacity-50"
      >
        {createFlag.isPending ? "Enviando…" : "Enviar denúncia"}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="w-full text-text-muted py-2 mt-2 min-h-11"
      >
        Cancelar
      </button>
    </div>
  );
}
