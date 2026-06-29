import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./app/query-client.js";
import { SeekPage } from "./features/seek/ui/SeekPage.js";
import { ReportPage } from "./features/report/ui/ReportPage.js";
import { SignInPage } from "./features/auth/ui/SignInPage.js";
import "./app/index.css";

type Route = "seek" | "report" | "signin";

function App() {
  const [route, setRoute] = useState<Route>("seek");

  if (route === "signin") return <SignInPage onSuccess={() => setRoute("report")} />;
  if (route === "report")
    return (
      <ReportPage
        onSuccess={() => setRoute("seek")}
        onSignInRequired={() => setRoute("signin")}
      />
    );
  return <SeekPage onReport={() => setRoute("report")} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
