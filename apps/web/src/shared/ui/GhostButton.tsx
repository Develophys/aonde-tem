import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Block, full-width, centered — standalone secondary actions (Cancelar, Editar).
   *  Omit for an inline trigger flush with sibling content (e.g. Denunciar in a list row). */
  readonly fullWidth?: boolean;
}

// The Ghost Button DESIGN.md already documents (Label-size, Ink Muted, no border/fill)
// had drifted into three slightly different hand-rolled versions — see PlaceModal's
// "Denunciar" (12px, no weight), ConfirmStep's "Editar" (16px, no size class), and
// FlagSheet's "Cancelar" (16px, no weight). One shared component so it can't drift again.
export function GhostButton({
  fullWidth = false,
  className = "",
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={[
        "text-sm font-medium text-text-muted min-h-11 hover:text-text disabled:opacity-60 disabled:cursor-not-allowed",
        fullWidth ? "w-full py-3 flex items-center justify-center" : "inline-flex items-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}
