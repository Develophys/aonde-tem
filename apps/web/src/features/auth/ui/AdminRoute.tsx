import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppStore } from "@/app/store/index.js";

/**
 * Role gate, beside ProtectedRoute. The two failure modes are answered differently on
 * purpose: no session goes to /signin so the visitor can act on it, while a session
 * without the role goes to the map silently — redirecting them to sign in would imply
 * there is something here worth signing in for.
 */
export function AdminRoute({ children }: { readonly children: ReactNode }) {
  const sessionUser = useAppStore((s) => s.sessionUser);
  const location = useLocation();

  if (!sessionUser) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }
  if (sessionUser.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
