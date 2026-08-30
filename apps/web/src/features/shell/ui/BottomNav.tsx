import { Link, NavLink } from "react-router-dom";
import type { ReactNode } from "react";

const ICON_PROPS = {
  className: "w-6 h-6",
  fill: "none",
  viewBox: "0 0 24 24",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function MapIcon() {
  return (
    <svg {...ICON_PROPS}>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="11" cy="11" r="6" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

interface TabProps {
  readonly to: string;
  readonly label: string;
  readonly children: ReactNode;
}

function Tab({ to, label, children }: TabProps) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-0.5 min-h-11 text-[11px] font-medium ${
          isActive ? "text-accent" : "text-text-muted"
        }`
      }
    >
      {children}
      <span>{label}</span>
    </NavLink>
  );
}

// Global navigation. Deliberately presentational: /avisos and /report are auth-gated by
// ProtectedRoute in the router, so the bar never branches on session state and there is
// exactly one place where "signed out means /signin" is decided.
export function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-(--z-sticky) grid grid-cols-5 items-center bg-surface border-t border-border"
      style={{
        height: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <Tab to="/" label="Mapa">
        <MapIcon />
      </Tab>
      <Tab to="/buscar" label="Buscar">
        <SearchIcon />
      </Tab>
      <div className="flex items-center justify-center">
        {/* Replaces SeekPage's old FAB. Raised above the bar's top edge, so it covers the
            map — the one element here that earns a shadow under the Floating-Only Rule.

            Five slots rather than four so this lands at 50% of the bar: with an even
            count the raised control sits off-centre, and pulling it to the middle would
            straddle a tab's label and break its 44px target. */}
        <Link
          to="/report"
          aria-label="Relatar produto"
          className="-translate-y-5 bg-brand text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center"
        >
          <svg {...ICON_PROPS} className="w-7 h-7">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>
      </div>
      <Tab to="/avisos" label="Avisos">
        <BellIcon />
      </Tab>
      <Tab to="/perfil" label="Perfil">
        <UserIcon />
      </Tab>
    </nav>
  );
}
