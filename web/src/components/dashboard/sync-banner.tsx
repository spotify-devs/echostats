"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

export function SyncBanner() {
  const { data: authStatus } = useQuery({
    queryKey: ["auth-status"],
    queryFn: () => api.get<any>("/api/v1/auth/status"),
    refetchInterval: 60000,
    retry: false,
  });

  if (!authStatus?.authenticated) return null;

  const tokenExpires = authStatus.token_expires_at
    ? new Date(authStatus.token_expires_at)
    : null;
  const isExpired = tokenExpires && tokenExpires < new Date();

  if (isExpired) {
    return (
      <div className="mx-4 sm:mx-6 mt-4 flex items-center gap-3 px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <p className="text-xs text-amber-300 flex-1">
          Spotify token expired. Data sync is paused.
        </p>
        <a href="/api/v1/auth/login" className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2">
          Reconnect
        </a>
      </div>
    );
  }

  return null;
}
