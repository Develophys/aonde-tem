import { useEffect, useId, useRef, type ReactNode } from "react";
import { pushDialog, popDialog, isTopDialog } from "../model/dialog-stack.js";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface Props {
  readonly label: string;
  readonly onClose: () => void;
  readonly className?: string;
  readonly children: ReactNode;
}

// Stacks below other bottom sheets (e.g. FlagSheet opened from PlaceModal) rely on
// the shared dialog stack, not DOM nesting, to know which one should trap Tab/Escape.
export function BottomSheet({ label, onClose, className = "", children }: Props) {
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    pushDialog(id);
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const first = containerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    first?.focus();

    return () => {
      popDialog(id);
      previouslyFocused.current?.focus();
    };
  }, [id]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isTopDialog(id)) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const focusables = Array.from(
        containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [id, onClose]);

  return (
    <>
      {/* Backdrop: dims and inertizes whatever's behind (map, page content) and gives
          tap-outside-to-dismiss — previously missing entirely, despite aria-modal="true"
          claiming modal behavior and --z-modal-backdrop already existing in the z-index
          scale for exactly this. Fixed (not absolute) so it reliably covers the full
          viewport regardless of where a given BottomSheet instance is mounted in the
          tree — e.g. FlagSheet nested inside PlaceModal's own sheet. Stacked instances
          (FlagSheet opened from PlaceModal) each render their own backdrop; the later
          one in DOM order naturally paints on top at the same z tier, so only the
          topmost sheet's backdrop is ever actually clickable. */}
      <div
        className="fixed inset-0 bg-black/40 z-(--z-modal-backdrop) animate-backdrop-in"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`absolute bottom-0 left-0 right-0 bg-surface rounded-t-sheet shadow-xl z-(--z-modal) ${className}`}
      >
        {children}
      </div>
    </>
  );
}
