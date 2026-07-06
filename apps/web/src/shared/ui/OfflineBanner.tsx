import { useOnlineStatus } from "../model/use-online-status.js";

export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-(--z-sticky) bg-error text-white text-xs font-medium text-center py-1.5"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.375rem)" }}
    >
      Sem conexão — mostrando dados salvos. Tentaremos de novo automaticamente.
    </div>
  );
}
