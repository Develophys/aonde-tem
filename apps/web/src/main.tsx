import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./app/query-client.js";
import { SeekPage } from "./features/seek/ui/SeekPage.js";
import "./app/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SeekPage />
    </QueryClientProvider>
  </React.StrictMode>,
);
