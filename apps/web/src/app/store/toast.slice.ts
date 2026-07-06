import type { SliceCreator } from "./types.js";

export interface Toast {
  id: string;
  message: string;
  tone: "error" | "success" | "info";
}

export interface ToastSlice {
  toasts: Toast[];
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

export const createToastSlice: SliceCreator<ToastSlice> = (set) => ({
  toasts: [],
  pushToast: (toast) =>
    set(
      (s) => {
        s.toasts.push({ ...toast, id: crypto.randomUUID() });
      },
      undefined,
      "toast/push",
    ),
  dismissToast: (id) =>
    set(
      (s) => {
        s.toasts = s.toasts.filter((t) => t.id !== id);
      },
      undefined,
      "toast/dismiss",
    ),
});
