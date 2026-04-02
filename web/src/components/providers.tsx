"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { CommandPalette } from "@/components/ui/command-palette";
import { showToast, ToastContainer } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error: unknown) => {
              const err = error as { status?: number };
              // Don't retry on auth errors
              if (err?.status === 401 || err?.status === 403) return false;
              return failureCount < 2;
            },
          },
          mutations: {
            onError: (error: unknown) => {
              const err = error as { message?: string; status?: number };
              const message = err?.message || "Something went wrong";
              if (err?.status !== 401) {
                showToast("error", message);
              }
            },
          },
        },
      }),
  );

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <ToastContainer />
        <CommandPalette />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
