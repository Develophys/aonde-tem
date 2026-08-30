import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { createBrowserRouter, Outlet, useNavigate, useLocation } from "react-router-dom";
import { AdminRoute } from "../features/auth/ui/AdminRoute.js";
import { ProtectedRoute } from "../features/auth/ui/ProtectedRoute.js";
import { OnboardingGate } from "../features/onboarding/ui/OnboardingGate.js";
import { AppShell } from "../features/shell/ui/AppShell.js";
import { OfflineBanner } from "../shared/ui/OfflineBanner.js";
import { ToastViewport } from "../shared/ui/ToastViewport.js";
import { useThemeSync } from "../shared/model/use-theme-sync.js";
import { useAppStore } from "./store/index.js";

const SeekPage = lazy(() =>
  import("../features/seek/ui/SeekPage.js").then((m) => ({ default: m.SeekPage })),
);
const ReportPage = lazy(() =>
  import("../features/report/ui/ReportPage.js").then((m) => ({ default: m.ReportPage })),
);
const SignInPage = lazy(() =>
  import("../features/auth/ui/SignInPage.js").then((m) => ({ default: m.SignInPage })),
);
const SignUpPage = lazy(() =>
  import("../features/auth/ui/SignUpPage.js").then((m) => ({ default: m.SignUpPage })),
);
const SearchPage = lazy(() =>
  import("../features/seek/ui/SearchPage.js").then((m) => ({ default: m.SearchPage })),
);
const AvisosPage = lazy(() =>
  import("../features/notifications/ui/AvisosPage.js").then((m) => ({ default: m.AvisosPage })),
);
const PerfilPage = lazy(() =>
  import("../features/profile/ui/PerfilPage.js").then((m) => ({ default: m.PerfilPage })),
);
const OnboardingPage = lazy(() =>
  import("../features/onboarding/ui/OnboardingPage.js").then((m) => ({
    default: m.OnboardingPage,
  })),
);
const DenunciasPage = lazy(() =>
  import("../features/admin/ui/DenunciasPage.js").then((m) => ({ default: m.DenunciasPage })),
);

function PageSuspense({ children }: { readonly children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-screen bg-surface-alt flex items-center justify-center">
          <span className="text-text-muted text-sm">Carregando…</span>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

function GoogleTokenCapture() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAppStore((s) => s.setSession);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    if (!token) return;

    // Decode JWT payload to get user info (no signature check needed — server already validated)
    try {
      const payloadB64 = token.split(".")[1] ?? "";
      const payload = JSON.parse(atob(payloadB64)) as {
        sub: string;
        email: string;
        role: "user" | "admin";
      };
      setSession(token, {
        id: payload.sub,
        email: payload.email,
        displayName: null,
        role: payload.role,
      });
    } catch {
      // Malformed token — ignore
    }
    // Remove ?token= from URL and go to home
    navigate("/", { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function RootLayout() {
  useThemeSync();
  return (
    <>
      <GoogleTokenCapture />
      <OfflineBanner />
      <Outlet />
      <ToastViewport />
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: "/",
            element: (
              <OnboardingGate>
                <PageSuspense>
                  <SeekPage />
                </PageSuspense>
              </OnboardingGate>
            ),
          },
          {
            path: "/buscar",
            element: (
              <PageSuspense>
                <SearchPage />
              </PageSuspense>
            ),
          },
          {
            path: "/avisos",
            element: (
              <ProtectedRoute>
                <PageSuspense>
                  <AvisosPage />
                </PageSuspense>
              </ProtectedRoute>
            ),
          },
          {
            path: "/perfil",
            element: (
              <PageSuspense>
                <PerfilPage />
              </PageSuspense>
            ),
          },
        ],
      },
      {
        path: "/onboarding",
        element: (
          <PageSuspense>
            <OnboardingPage />
          </PageSuspense>
        ),
      },
      {
        path: "/signin",
        element: (
          <PageSuspense>
            <SignInPage />
          </PageSuspense>
        ),
      },
      {
        path: "/signup",
        element: (
          <PageSuspense>
            <SignUpPage />
          </PageSuspense>
        ),
      },
      {
        path: "/report",
        element: (
          <ProtectedRoute>
            <PageSuspense>
              <ReportPage />
            </PageSuspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/denuncias",
        element: (
          <AdminRoute>
            <PageSuspense>
              <DenunciasPage />
            </PageSuspense>
          </AdminRoute>
        ),
      },
    ],
  },
]);
