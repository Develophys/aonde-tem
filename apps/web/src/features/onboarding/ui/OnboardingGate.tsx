import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAppStore } from "@/app/store/index.js";

// Wraps only the map route. Deep links (/avisos, /perfil, /report, a shared place link)
// stay reachable directly — onboarding intercepts the front door, not every door. Same
// shape as ProtectedRoute, including the `replace` that keeps Back out of a redirect loop.
export function OnboardingGate({ children }: { readonly children: ReactNode }) {
  const hasSeenOnboarding = useAppStore((s) => s.hasSeenOnboarding);

  if (!hasSeenOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}
