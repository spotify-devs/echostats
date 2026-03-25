"use client";

import { useQuery } from "@tanstack/react-query";
import { Settings, User, RefreshCw, Upload, Shield } from "lucide-react";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { data: authStatus } = useQuery({
    queryKey: ["auth-status"],
    queryFn: () => api.get<any>("/api/v1/auth/status"),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-white/60" /> Settings
        </h1>
      </div>

      {/* Account */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-accent-purple" /> Account
        </h2>
        {authStatus?.authenticated ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/50">Display Name</span>
              <span className="text-sm text-white">{authStatus.user?.display_name || "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/50">Spotify ID</span>
              <span className="text-sm text-white font-mono">{authStatus.user?.spotify_id || "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/50">Plan</span>
              <span className="text-sm text-white capitalize">{authStatus.user?.product || "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/50">Token Expires</span>
              <span className="text-sm text-white/60">{authStatus.token_expires_at ? new Date(authStatus.token_expires_at).toLocaleString() : "—"}</span>
            </div>
          </div>
        ) : (
          <p className="text-white/40">Not authenticated</p>
        )}
      </div>

      {/* Data Management */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-spotify-green" /> Data Sync
        </h2>
        <div className="flex gap-3">
          <button className="btn-primary text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Force Sync
          </button>
          <button className="btn-primary text-sm flex items-center gap-2">
            <Upload className="w-4 h-4" /> Import History
          </button>
        </div>
        <p className="text-xs text-white/30">Data syncs automatically every 15 minutes</p>
      </div>

      {/* Security */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-accent-cyan" /> Security
        </h2>
        <p className="text-sm text-white/50">Your Spotify tokens are encrypted at rest using AES-256-GCM.</p>
        <button
          onClick={() => {
            fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" }).then(() => window.location.href = "/");
          }}
          className="px-4 py-2 text-sm text-red-400 border border-red-400/30 rounded-xl hover:bg-red-400/10 transition-all"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
