import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { SquadProvider } from "./hooks/useSquad";
import { ApiError } from "./lib/api";
import "./styles/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // Chỉ thử lại khi lỗi mạng / server, không thử lại 4xx (kể cả 429 để tránh tốn quota)
      retry: (count, err) => count < 2 && (!(err instanceof ApiError) || err.status === 0 || err.status >= 500),
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SquadProvider>
          <App />
        </SquadProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
