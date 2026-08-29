import { ComingSoon } from "@/shared/ui/ComingSoon.js";

// Placeholder for Epic E11 (Notifications & Watchlist). The route exists so the tab bar
// is complete and E11 has a slot to land in; the Watch / PushSubscription / Notification
// entities in docs/specs/NOTIFICATIONS.en.md do not exist yet, so there is nothing to fetch.
export function AvisosPage() {
  return (
    <div
      className="w-full min-h-screen bg-surface"
      style={{ paddingBottom: "var(--bottom-nav-clearance)" }}
    >
      <header className="px-4 pt-4 pb-2" style={{ paddingTop: "var(--header-inset-top)" }}>
        <h1 className="text-text text-lg font-semibold">Avisos</h1>
      </header>
      <ComingSoon
        title="Em breve"
        description="Aqui você vai acompanhar itens e receber um aviso quando alguém relatar um deles perto de você."
      />
    </div>
  );
}
