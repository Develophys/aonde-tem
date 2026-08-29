import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/app/store/index.js";
import { ComingSoon } from "@/shared/ui/ComingSoon.js";

function ThemeRow() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const isDark = theme === "dark";

  return (
    <div className="flex items-center justify-between px-4 min-h-14">
      <span className="text-text text-base">Modo escuro</span>
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Modo escuro"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={`relative w-12 h-7 rounded-full transition-colors ${
          isDark ? "bg-brand" : "bg-surface-alt border border-border"
        }`}
      >
        <span
          className={`absolute top-1 w-5 h-5 rounded-full bg-surface shadow-sm transition-transform ${
            isDark ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function SessionRow() {
  const navigate = useNavigate();
  const sessionUser = useAppStore((s) => s.sessionUser);
  const clearSession = useAppStore((s) => s.clearSession);

  if (!sessionUser) {
    return (
      <div className="px-4 py-4">
        <button
          type="button"
          onClick={() => navigate("/signin")}
          className="w-full bg-brand text-white font-semibold py-3 rounded-full min-h-11"
        >
          Entrar
        </button>
        <p className="text-text-muted text-sm text-center mt-2">
          Entre para relatar e acompanhar itens.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <p className="text-text-muted text-sm mb-3 truncate">{sessionUser.email}</p>
      <button
        type="button"
        onClick={() => clearSession()}
        className="w-full text-error font-semibold py-3 rounded-full border border-border min-h-11"
      >
        Sair
      </button>
    </div>
  );
}

// New home for the theme toggle and the account controls, which used to live as fixed
// pills in the map's top corners (ThemeToggle / AppHeader). The avatar header, the stat
// columns and the real "meus relatos" list belong to the separate Watchlist/Profile spec.
export function PerfilPage() {
  return (
    <div
      className="w-full min-h-screen bg-surface"
      style={{ paddingBottom: "var(--bottom-nav-clearance)" }}
    >
      <header className="px-4 pt-4 pb-2" style={{ paddingTop: "var(--header-inset-top)" }}>
        <h1 className="text-text text-lg font-semibold">Perfil</h1>
      </header>

      <section aria-labelledby="perfil-ajustes" className="border-t border-border py-2">
        <h2
          id="perfil-ajustes"
          className="px-4 py-2 text-text-muted text-xs font-semibold uppercase"
        >
          Ajustes
        </h2>
        <ThemeRow />
        <SessionRow />
      </section>

      <section aria-labelledby="perfil-relatos" className="border-t border-border pt-2">
        <h2
          id="perfil-relatos"
          className="px-4 py-2 text-text-muted text-xs font-semibold uppercase"
        >
          Meus relatos
        </h2>
        <ComingSoon
          title="Em breve"
          description="Seus relatos ativos e suas estatísticas aparecem aqui."
        />
      </section>
    </div>
  );
}
