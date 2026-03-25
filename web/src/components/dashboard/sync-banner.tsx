"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowUpCircle, Clock, RefreshCw, Shield, X } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";

function timeUntil(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return "expired";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function SyncBanner() {
  const [dismissedUpdate, setDismissedUpdate] = useState(false);

  const { data: authStatus } = useQuery({
    queryKey: ["auth-status"],
    queryFn: () => api.get<any>("/api/v1/auth/status"),
    refetchInterval: 30000,
    retry: false,
  });

  const { data: updateInfo } = useQuery({
    queryKey: ["update-check"],
    queryFn: () => api.get<any>("/api/health/update"),
    refetchInterval: 3600000, // check every hour
    retry: false,
    staleTime: 3600000,
  });

  const showUpdate = updateInfo?.update_available && !dismissedUpdate;

  if (!authStatus?.authenticated) return null;

  const tokenExpires = authStatus.token_expires_at ? new Date(authStatus.token_expires_at) : null;
  const isExpired = tokenExpires && tokenExpires < new Date();
  const isExpiringSoon =
    tokenExpires && !isExpired && tokenExpires.getTime() - Date.now() < 10 * 60 * 1000; // < 10 minutes

  // Build update banner element (shown alongside token status)
  const updateBanner = showUpdate ? (
    <div className="mx-4 sm:mx-6 mt-3 flex items-center gap-3 px-4 py-2.5 rounded-xl border border-accent-dynamic/20 bg-accent-dynamic/5">
      <ArrowUpCircle className="w-4 h-4 text-accent-dynamic flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-theme font-medium">
          Update available: v{updateInfo.latest_version}
        </p>
        <p className="text-[10px] text-theme-tertiary">
          Running v{updateInfo.current_version}
        </p>
      </div>
      <a
        href={updateInfo.release_url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-accent-dynamic hover:text-accent-dynamic/80 px-2.5 py-1 rounded-lg border border-accent-dynamic/30 hover:bg-accent-dynamic/10 transition-all flex-shrink-0"
      >
        View Release
      </a>
      <button
        onClick={() => setDismissedUpdate(true)}
        className="p-1 text-theme-tertiary hover:text-theme transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  ) : null;

  // Token expired
  if (isExpired) {
    return (
      <>
        {updateBanner}
        <div className="mx-4 sm:mx-6 mt-3 flex items-center gap-3 px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/5">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-red-300 font-medium">Spotify token expired</p>
            <p className="text-[10px] text-red-300/60">
              Auto-refresh will attempt on next sync cycle
            </p>
          </div>
          <a
            href="/api/v1/auth/login"
            className="text-xs text-red-400 hover:text-red-300 px-2.5 py-1 rounded-lg border border-red-400/30 hover:bg-red-400/10 transition-all"
          >
            Reconnect
          </a>
        </div>
      </>
    );
  }

  // Token expiring soon — auto-refresh will handle it
  if (isExpiringSoon && tokenExpires) {
    return (
      <>
        {updateBanner}
        <div className="mx-4 sm:mx-6 mt-3 flex items-center gap-3 px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <RefreshCw className="w-4 h-4 text-amber-400 flex-shrink-0 animate-spin" />
          <div className="flex-1">
            <p className="text-xs text-amber-300 font-medium">
              Token expires in {timeUntil(tokenExpires)}
            </p>
            <p className="text-[10px] text-amber-300/60">
              Auto-refresh is enabled — token will renew automatically
            </p>
          </div>
        </div>
      </>
    );
  }

  // Token is healthy — show compact status bar
  if (tokenExpires) {
    return (
      <>
        {updateBanner}
        <div className="mx-4 sm:mx-6 mt-3 flex items-center gap-3 px-3 py-2 rounded-xl border border-current/[0.08] bg-current/[0.03]">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-theme-tertiary">Connected</span>
            </div>
            <span className="text-[10px] text-theme-tertiary hidden sm:inline">·</span>
            <div className="items-center gap-1 text-[10px] text-theme-tertiary hidden sm:flex">
              <Clock className="w-3 h-3" />
              Token expires in {timeUntil(tokenExpires)}
            </div>
            <span className="text-[10px] text-theme-tertiary hidden sm:inline">·</span>
            <div className="items-center gap-1 text-[10px] text-emerald-400/70 hidden sm:flex">
              <Shield className="w-3 h-3" />
              Auto-refresh enabled
            </div>
          </div>
        </div>
      </>
    );
  }

  return updateBanner;
}
