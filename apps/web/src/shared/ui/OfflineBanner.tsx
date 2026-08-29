import { useOnlineStatus } from "../model/use-online-status.js";

export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  // pointer-events-none: a role="status" strip with nothing to tap, but it is fixed at
  // top:0 and wraps to ~44px on a 393px viewport — enough to sit over ReportPage's back
  // button, the Avisos/Perfil headings and the collapsed magnifier and swallow their
  // taps while offline, i.e. exactly when retrying matters most.
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-(--z-sticky) bg-error text-white text-xs font-medium text-center py-1.5 pointer-events-none"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.375rem)" }}
    >
      Sem conexão — mostrando dados salvos. Tentaremos de novo automaticamente.
    </div>
  );
}
