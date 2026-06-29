import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "../features/auth/ui/ProtectedRoute.js";

const SeekPage = lazy(() =>
  import("../features/seek/ui/SeekPage.js").then((m) => ({ default: m.SeekPage })),
);
const ReportPage = lazy(() =>
  import("../features/report/ui/ReportPage.js").then((m) => ({ default: m.ReportPage })),
);
const SignInPage = lazy(() =>
  import("../features/auth/ui/SignInPage.js").then((m) => ({ default: m.SignInPage })),
);

function PageSuspense({ children }: { children: ReactNode }) {
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

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <PageSuspense>
        <SeekPage />
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
    path: "/report",
    element: (
      <ProtectedRoute>
        <PageSuspense>
          <ReportPage />
        </PageSuspense>
      </ProtectedRoute>
    ),
  },
]);
