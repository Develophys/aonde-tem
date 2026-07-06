import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../app/store/index.js";
import type { Toast } from "../../app/store/toast.slice.js";

const TONE_CLASS: Record<Toast["tone"], string> = {
  error: "bg-error text-white",
  success: "bg-brand text-white",
  info: "bg-text text-white",
};

const AUTO_DISMISS_MS = 5000;

function ToastRow({ toast }: { readonly toast: Toast }) {
  const dismissToast = useAppStore((s) => s.dismissToast);
  const [paused, setPaused] = useState(false);
  // Tracks time left across pause/resume so hovering near the end of the window
  // doesn't grant a fresh 5s, and resuming doesn't dismiss instantly either.
  const remainingRef = useRef(AUTO_DISMISS_MS);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    if (paused) return;
    startedAtRef.current = Date.now();
    const timer = setTimeout(() => dismissToast(toast.id), remainingRef.current);
    return () => {
      clearTimeout(timer);
      remainingRef.current -= Date.now() - startedAtRef.current;
    };
  }, [paused, toast.id, dismissToast]);

  const className = `animate-toast-in pointer-events-auto flex items-start gap-3 rounded-control px-4 py-3 shadow-lg text-sm font-medium ${TONE_CLASS[toast.tone]}`;
  const children = (
    <>
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        aria-label="Dispensar"
        // Visual glyph stays small; the -my-3/-mr-4 negative margins expand the
        // tappable area to a full 44x44 by borrowing the toast's own px-4/py-3
        // padding, so the hit target grows without the toast visibly changing size.
        className="shrink-0 flex items-center justify-center text-white/80 hover:text-white leading-none min-h-11 min-w-11 -my-3 -mr-4"
      >
        ×
      </button>
    </>
  );

  const handlers = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocus: () => setPaused(true),
    onBlur: (e: React.FocusEvent<HTMLDivElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
    },
  };

  // role is written as a literal in each branch (not a computed expression) so static
  // ARIA linters can verify it — "alert" interrupts a screen reader, "status" is polite.
  return toast.tone === "error" ? (
    <div role="alert" className={className} {...handlers}>
      {children}
    </div>
  ) : (
    <div role="status" className={className} {...handlers}>
      {children}
    </div>
  );
}

export function ToastViewport() {
  const toasts = useAppStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed left-4 right-4 z-(--z-toast) flex flex-col gap-2 pointer-events-none"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
    >
      {toasts.map((toast) => (
        <ToastRow key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
