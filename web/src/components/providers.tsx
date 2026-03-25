"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastContainer } from "@/components/ui/toast";
import { CommandPalette } from "@/components/ui/command-palette";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error: any) => {
              // Don't retry on auth errors
              if (error?.status === 401 || error?.status === 403) return false;
              return failureCount < 2;
            },
          },
        },
      })
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
