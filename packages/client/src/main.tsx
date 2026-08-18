import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { queryClient } from "./query/queryClient";
import { ToastProvider } from "./toast/ToastContext";
import { ToastViewport } from "./toast/ToastViewport";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <App />
        <ToastViewport />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
