import { useLayoutEffect } from "react";
import { useAppStore } from "@/app/store/index.js";

// useLayoutEffect (not useEffect) so the class lands before the browser paints —
// avoids a one-frame flash of the wrong theme on load.
export function useThemeSync(): void {
  const theme = useAppStore((s) => s.theme);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
}
