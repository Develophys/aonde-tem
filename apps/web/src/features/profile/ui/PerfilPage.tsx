import { useNavigate } from "react-router-dom";
import type { MyDiscovery } from "@aonde-tem/contracts";
import { useAppStore } from "@/app/store/index.js";
import { ComingSoon } from "@/shared/ui/ComingSoon.js";
import { useMyDiscoveries } from "../api/my-discoveries.queries.js";

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
        className="flex items-center justify-center min-h-11"
      >
        <span
          className={`relative w-12 h-7 rounded-full transition-colors ${
            isDark ? "bg-brand" : "bg-surface-alt border border-border"
          }`}
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-surface shadow-sm transition-transform ${
              isDark ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </span>
      </button>
    </div>
  );
}

/**
 * The only way into the moderation queue. Deliberately carries no open count: fetching
 * the admin queue on every Perfil render, for every admin, to decorate a link is a cost
 * the screen it points at can pay instead.
 */
function AdminRow() {
  const navigate = useNavigate();
  const sessionUser = useAppStore((s) => s.sessionUser);

  if (sessionUser?.role !== "admin") return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/admin/denuncias")}
      className="w-full flex items-center justify-between px-4 min-h-14 text-left"
    >
      <span className="text-text text-base">Denúncias</span>
      <svg
        className="w-5 h-5 text-text-muted"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
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

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
// Month and year are formatted separately and joined by hand: asking Intl for both at
// once yields "jun. de 2026" in pt-BR, while the design specifies the compact "jun. 2026".
const monthOnly = new Intl.DateTimeFormat("pt-BR", { month: "short" });

function monthYear(date: Date): string {
  return `${monthOnly.format(date)} ${date.getFullYear()}`;
}

function initialsOf(user: { displayName: string | null; email: string }): string {
  return user.displayName
    ? user.displayName.slice(0, 2).toUpperCase()
    : user.email.slice(0, 1).toUpperCase();
}

/**
 * Avatar, name and the two stat columns. Rendered only with a session — a signed-out
 * visitor reaches this screen for the theme switch and the Entrar button, and a header
 * with nothing in it would just be a gap.
 */
function ProfileHeader() {
  const sessionUser = useAppStore((s) => s.sessionUser);
  const { data } = useMyDiscoveries();

  if (!sessionUser) return null;

  return (
    <section className="px-4 pb-4 flex flex-col items-center text-center">
      <span className="w-16 h-16 rounded-full bg-brand text-white flex items-center justify-center text-xl font-bold mb-2">
        {initialsOf(sessionUser)}
      </span>
      <p className="text-text text-base font-semibold">
        {sessionUser.displayName ?? sessionUser.email}
      </p>
      {data && (
        <>
          <p className="text-text-muted text-sm">
            Reportando desde {monthYear(new Date(data.stats.memberSince))}
          </p>
          <div className="mt-4 w-full flex">
            <div className="flex-1">
              <p className="text-text text-lg font-bold tabular-nums">{data.stats.total}</p>
              <p className="text-text-muted text-xs">relatos</p>
            </div>
            <div className="flex-1 border-l border-border">
              <p className="text-text text-lg font-bold tabular-nums">{data.stats.active}</p>
              <p className="text-text-muted text-xs">ativos</p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ReportRow({ report }: { readonly report: MyDiscovery }) {
  return (
    <li
      className={`px-4 py-3 border-b border-border last:border-b-0 flex items-baseline gap-3 ${
        report.isExpired ? "text-stale" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${report.isExpired ? "" : "text-text"}`}>
          {report.productName}
        </p>
        <p className={`text-sm truncate ${report.isExpired ? "" : "text-text-muted"}`}>
          {report.placeName}
          {report.isExpired && <span className="ml-2 italic">expirado</span>}
        </p>
      </div>
      <p className={`font-bold tabular-nums shrink-0 ${report.isExpired ? "" : "text-text"}`}>
        {brl.format(report.priceBrl)}
      </p>
    </li>
  );
}

/**
 * The reporter's own history — expired entries included but de-emphasised, because the
 * point of this list is "what have I contributed", not "what is live right now".
 */
function MyReportsList() {
  const sessionUser = useAppStore((s) => s.sessionUser);
  const { data, isLoading, isError } = useMyDiscoveries();

  if (!sessionUser) {
    return <p className="px-4 py-6 text-text-muted text-sm">Entre para ver seus relatos.</p>;
  }
  if (isLoading) {
    return <p className="px-4 py-6 text-text-muted text-sm">Carregando seus relatos…</p>;
  }
  // Distinct from the empty state on purpose: a failed request must never read as
  // "you have never reported anything".
  if (isError) {
    return <p className="px-4 py-6 text-error text-sm">Não foi possível carregar seus relatos.</p>;
  }
  if (!data || data.results.length === 0) {
    return (
      <ComingSoon
        title="Você ainda não relatou nada"
        description="Quando você relatar um produto, ele aparece aqui."
      />
    );
  }

  return (
    <ul>
      {data.results.map((r) => (
        <ReportRow key={r.id} report={r} />
      ))}
    </ul>
  );
}

// New home for the theme toggle and the account controls, which used to live as fixed
// pills in the map's top corners (ThemeToggle / AppHeader).
export function PerfilPage() {
  return (
    <div
      className="w-full min-h-screen bg-surface"
      style={{ paddingBottom: "var(--bottom-nav-clearance)" }}
    >
      <header className="px-4 pb-2" style={{ paddingTop: "var(--header-inset-top)" }}>
        <h1 className="text-text text-lg font-semibold">Perfil</h1>
      </header>

      <ProfileHeader />

      <section aria-labelledby="perfil-ajustes" className="border-t border-border py-2">
        <h2
          id="perfil-ajustes"
          className="px-4 py-2 text-text-muted text-xs font-semibold uppercase"
        >
          Ajustes
        </h2>
        <ThemeRow />
        <AdminRow />
        <SessionRow />
      </section>

      <section aria-labelledby="perfil-relatos" className="border-t border-border pt-2">
        <h2
          id="perfil-relatos"
          className="px-4 py-2 text-text-muted text-xs font-semibold uppercase"
        >
          Meus relatos
        </h2>
        <MyReportsList />
      </section>
    </div>
  );
}
