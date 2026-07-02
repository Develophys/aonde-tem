import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppStore } from "../../../app/store/index.js";

export function AppHeader() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const sessionUser = useAppStore((s) => s.sessionUser);
  const clearSession = useAppStore((s) => s.clearSession);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDropdownOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dropdownOpen]);

  // Invariant: `sessionUser` and `accessToken` are always kept in sync by
  // `setSession` / `clearSession` in session.slice.ts — so branching on
  // `sessionUser` here is equivalent to calling `isAuthenticated()` in
  // ProtectedRoute. Never clear one without the other.
  if (!sessionUser) {
    if (pathname === "/signin" || pathname === "/signup") return null;
    return (
      <button
        type="button"
        className="fixed right-3 z-50 bg-brand text-white rounded-full px-4 py-2 text-sm font-medium shadow-md"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
        onClick={() => navigate("/signin")}
      >
        Entrar
      </button>
    );
  }

  const initials = sessionUser.displayName
    ? sessionUser.displayName.slice(0, 2).toUpperCase()
    : sessionUser.email.slice(0, 1).toUpperCase();

  const displayName = sessionUser.displayName ?? sessionUser.email;

  return (
    <div
      ref={wrapperRef}
      className="fixed right-3 z-50"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
    >
      <button
        type="button"
        className="flex items-center gap-2 bg-brand text-white rounded-full px-3 py-1.5 shadow-md"
        onClick={() => setDropdownOpen((o) => !o)}
        // aria-expanded={dropdownOpen}
      >
        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">
          {initials}
        </span>
        <span className="text-sm font-medium max-w-30 truncate">{displayName}</span>
        <svg
          className={`w-3 h-3 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 bg-white border border-border rounded-xl shadow-lg py-1 min-w-30">
          <button
            type="button"
            className="w-full px-4 py-2 text-sm text-left text-error hover:bg-surface-alt"
            onClick={() => {
              clearSession();
              setDropdownOpen(false);
            }}
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
