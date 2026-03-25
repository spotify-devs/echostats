"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Loader2,
  Paintbrush,
  Palette,
  RefreshCw,
  Settings,
  Shield,
  Upload,
  User,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { ImportHistoryModal } from "@/components/ui/import-modal";
import { showToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { accents, themes } from "@/lib/themes";

export default function SettingsPage() {
  const [importOpen, setImportOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  const { data: authStatus } = useQuery({
    queryKey: ["auth-status"],
    queryFn: () => api.get<any>("/api/v1/auth/status"),
  });

  const { themeId, accentId, customAccentColor, setTheme, setAccent, setCustomAccentColor } =
    useTheme();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center gap-2">
          <Settings className="w-6 h-6 text-theme-secondary" /> Settings
        </h1>
      </div>

      {/* Appearance — Theme */}
      <div className="glass-card p-6 space-y-5">
        <h2 className="text-lg font-semibold text-theme flex items-center gap-2">
          <Palette className="w-5 h-5 text-accent-dynamic" /> Theme
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {themes.map((theme) => {
            const isActive = themeId === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => setTheme(theme.id)}
                className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                  isActive
                    ? "border-accent-dynamic/50 bg-accent-dynamic/15 shadow-accent-glow/10"
                    : "border-white/10 hover:border-white/20 hover:bg-white/5"
                }`}
              >
                <span className="text-lg">{theme.emoji}</span>
                <span
                  className={`text-sm font-medium ${isActive ? "text-accent-dynamic" : "text-theme-secondary"}`}
                >
                  {theme.name}
                </span>
                {isActive && (
                  <Check className="w-4 h-4 text-accent-dynamic absolute top-2 right-2" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Appearance — Accent Color */}
      <div className="glass-card p-6 space-y-5">
        <h2 className="text-lg font-semibold text-theme flex items-center gap-2">
          <Paintbrush className="w-5 h-5 text-accent-dynamic" /> Accent Color
        </h2>
        <div className="flex flex-wrap gap-3">
          {accents.map((accent) => {
            const isActive = accentId === accent.id;
            return (
              <button
                key={accent.id}
                onClick={() => setAccent(accent.id)}
                className={`relative group flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200 ${
                  isActive ? "bg-white/10 scale-105" : "hover:bg-white/5"
                }`}
                title={accent.name}
              >
                <div
                  className={`w-8 h-8 rounded-full transition-all duration-200 ${
                    isActive
                      ? "ring-2 ring-white/50 ring-offset-2 ring-offset-transparent scale-110"
                      : "group-hover:scale-110"
                  }`}
                  style={{ backgroundColor: accent.color }}
                />
                <span className="text-[10px] text-theme-tertiary">{accent.name}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Color Picker */}
        <div className="pt-2 border-t border-white/5">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="color"
                value={customAccentColor}
                onChange={(e) => setCustomAccentColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-2 border-white/10 bg-transparent"
              />
            </div>
            <div className="flex-1">
              <p
                className={`text-sm font-medium ${accentId === "custom" ? "text-accent-dynamic" : "text-theme-secondary"}`}
              >
                Custom Color
              </p>
              <p className="text-xs text-theme-tertiary">
                Pick any color · {customAccentColor.toUpperCase()}
              </p>
            </div>
            {accentId === "custom" && <Check className="w-4 h-4 text-accent-dynamic" />}
          </label>
        </div>
      </div>

      {/* Account */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-theme flex items-center gap-2">
          <User className="w-5 h-5 text-accent-dynamic" /> Account
        </h2>
        {authStatus?.authenticated ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-theme-secondary">Display Name</span>
              <span className="text-sm text-theme">{authStatus.user?.display_name || "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-theme-secondary">Spotify ID</span>
              <span className="text-sm text-theme font-mono">
                {authStatus.user?.spotify_id || "—"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-theme-secondary">Plan</span>
              <span className="text-sm text-theme capitalize">
                {authStatus.user?.product || "—"}
              </span>
            </div>

            {/* Token Status */}
            <div className="mt-4 p-4 rounded-xl bg-theme-surface-2 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-theme flex items-center gap-2">
                  <Shield className="w-4 h-4 text-accent-dynamic" /> Token Status
                </span>
                {authStatus.token_expires_at &&
                new Date(authStatus.token_expires_at) > new Date() ? (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    Expired
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-theme-tertiary">Expires At</span>
                <span className="text-xs text-theme-secondary font-mono">
                  {authStatus.token_expires_at
                    ? new Date(authStatus.token_expires_at).toLocaleString()
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-theme-tertiary">Auto-Refresh</span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <RefreshCw className="w-3 h-3" /> Enabled
                </span>
              </div>
              <p className="text-[10px] text-theme-tertiary border-t border-white/5 pt-2">
                Tokens are automatically refreshed 5 minutes before expiry. Your tokens are
                encrypted at rest with AES-256-GCM.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-theme-tertiary">Not authenticated</p>
        )}
      </div>

      {/* Data Management */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-theme flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-spotify-green" /> Data Sync
        </h2>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              setSyncing(true);
              try {
                await api.post("/api/v1/analytics/refresh?period=all_time");
                queryClient.invalidateQueries();
                showToast("success", "Analytics refreshed successfully");
              } catch {
                showToast("error", "Sync failed — check your Spotify connection");
              } finally {
                setSyncing(false);
              }
            }}
            disabled={syncing}
            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {syncing ? "Syncing..." : "Force Sync"}
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> Import History
          </button>
        </div>
        <p className="text-xs text-theme-tertiary">Data syncs automatically every 15 minutes</p>
      </div>

      {/* Import Modal */}
      <ImportHistoryModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onComplete={() => queryClient.invalidateQueries()}
      />

      {/* Security */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-theme flex items-center gap-2">
          <Shield className="w-5 h-5 text-accent-dynamic" /> Security
        </h2>
        <p className="text-sm text-theme-secondary">
          Your Spotify tokens are encrypted at rest using AES-256-GCM.
        </p>
        <button
          onClick={() => {
            fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" }).then(
              () => (window.location.href = "/"),
            );
          }}
          className="px-4 py-2 text-sm text-red-400 border border-red-400/30 rounded-xl hover:bg-red-400/10 transition-all"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
