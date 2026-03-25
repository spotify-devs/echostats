"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Music, Shield, Clock, ListMusic, BarChart3,
  Disc3, Headphones, CheckCircle, Loader2, ExternalLink
} from "lucide-react";

interface SpotifyConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: () => void;
}

const PERMISSIONS = [
  { icon: Music, label: "Listening History", desc: "Recently played tracks and top items" },
  { icon: BarChart3, label: "Audio Features", desc: "Track analysis data (tempo, energy, mood)" },
  { icon: ListMusic, label: "Playlists", desc: "View and manage your playlists" },
  { icon: Headphones, label: "Playback", desc: "See what's currently playing" },
  { icon: Disc3, label: "Library", desc: "Saved tracks, albums, and followed artists" },
  { icon: Shield, label: "Profile", desc: "Your account name, email, and country" },
];

type ConnectStatus = "idle" | "connecting" | "waiting" | "success" | "error";

export function SpotifyConnectModal({ isOpen, onClose, onConnected }: SpotifyConnectModalProps) {
  const [status, setStatus] = useState<ConnectStatus>("idle");
  const [error, setError] = useState("");
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for auth completion when popup is open
  const startPolling = useCallback(() => {
    pollRef.current = setInterval(async () => {
      // Check if popup was closed
      if (popupRef.current?.closed) {
        if (pollRef.current) clearInterval(pollRef.current);
        // Check if we're now authenticated
        try {
          const res = await fetch("/api/v1/auth/status", { credentials: "include" });
          const data = await res.json();
          if (data.authenticated) {
            setStatus("success");
            setTimeout(() => {
              onConnected?.();
              onClose();
              window.location.href = "/dashboard";
            }, 1500);
          } else {
            setStatus("idle");
          }
        } catch {
          setStatus("idle");
        }
        return;
      }
    }, 1000);
  }, [onClose, onConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  }, []);

  // Listen for message from callback page
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "spotify-auth-success") {
        setStatus("success");
        if (pollRef.current) clearInterval(pollRef.current);
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close();
        }
        setTimeout(() => {
          onConnected?.();
          onClose();
          window.location.href = "/dashboard";
        }, 1500);
      }
      if (event.data?.type === "spotify-auth-error") {
        setStatus("error");
        setError(event.data.error || "Authentication failed");
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onClose, onConnected]);

  const handleConnect = async () => {
    setStatus("connecting");
    setError("");

    try {
      // Get the Spotify auth URL from our API
      const res = await fetch("/api/v1/auth/login", {
        credentials: "include",
        headers: { "Accept": "application/json" },
      });
      const data = await res.json();

      if (!data.url) {
        throw new Error("Failed to get authorization URL");
      }

      // Open Spotify auth in popup
      const width = 500;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      popupRef.current = window.open(
        data.url,
        "spotify-auth",
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=yes`
      );

      if (!popupRef.current) {
        // Popup blocked — fall back to redirect
        window.location.href = data.url;
        return;
      }

      setStatus("waiting");
      startPolling();
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "Failed to connect");
    }
  };

  const handleDevLogin = async () => {
    setStatus("connecting");
    try {
      await fetch("/api/v1/auth/dev-login", { credentials: "include" });
      setStatus("success");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch {
      setStatus("error");
      setError("Demo login failed");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={status === "waiting" ? undefined : onClose} />
      <div className="relative glass-card p-0 max-w-md w-full animate-scale-in overflow-hidden">
        {/* Header with gradient */}
        <div className="relative p-8 pb-6 text-center bg-gradient-to-b from-spotify-green/10 to-transparent">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-theme-tertiary hover:text-theme transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex p-4 rounded-2xl bg-spotify-green/15 mb-4">
            <svg className="w-10 h-10 text-spotify-green" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
          </div>

          {status === "idle" && (
            <>
              <h2 className="text-xl font-bold text-theme">Connect to Spotify</h2>
              <p className="text-sm text-theme-secondary mt-2">
                Link your Spotify account to start tracking your listening habits
              </p>
            </>
          )}
          {status === "connecting" && (
            <>
              <Loader2 className="w-8 h-8 text-spotify-green animate-spin mx-auto mb-2" />
              <h2 className="text-xl font-bold text-theme">Connecting...</h2>
            </>
          )}
          {status === "waiting" && (
            <>
              <Loader2 className="w-8 h-8 text-spotify-green animate-spin mx-auto mb-2" />
              <h2 className="text-xl font-bold text-theme">Waiting for Spotify</h2>
              <p className="text-sm text-theme-secondary mt-2">
                Complete the authorization in the popup window
              </p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="w-10 h-10 text-spotify-green mx-auto mb-2" />
              <h2 className="text-xl font-bold text-theme">Connected!</h2>
              <p className="text-sm text-theme-secondary mt-2">Redirecting to your dashboard...</p>
            </>
          )}
          {status === "error" && (
            <>
              <X className="w-10 h-10 text-red-400 mx-auto mb-2" />
              <h2 className="text-xl font-bold text-theme">Connection Failed</h2>
              <p className="text-sm text-red-300 mt-2">{error}</p>
            </>
          )}
        </div>

        {/* Permissions list */}
        {status === "idle" && (
          <div className="px-6 pb-2">
            <p className="text-xs text-theme-tertiary uppercase tracking-wider mb-3">
              EchoStats will be able to:
            </p>
            <div className="space-y-2.5">
              {PERMISSIONS.map((perm) => (
                <div key={perm.label} className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-accent-dynamic/10">
                    <perm.icon className="w-4 h-4 text-accent-dynamic" />
                  </div>
                  <div>
                    <p className="text-sm text-theme font-medium">{perm.label}</p>
                    <p className="text-[11px] text-theme-tertiary">{perm.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-6 space-y-3">
          {(status === "idle" || status === "error") && (
            <>
              <button
                onClick={handleConnect}
                className="w-full btn-spotify flex items-center justify-center gap-2 text-base py-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                Connect with Spotify
              </button>
              <button
                onClick={handleDevLogin}
                className="w-full text-sm text-theme-tertiary hover:text-theme-secondary transition-colors py-2"
              >
                Use demo data instead
              </button>
            </>
          )}

          {status === "waiting" && (
            <div className="text-center">
              <p className="text-xs text-theme-tertiary mb-3">
                Popup didn&apos;t open?{" "}
                <button onClick={handleConnect} className="text-accent-dynamic hover:underline">
                  Try again
                </button>
              </p>
              <button
                onClick={() => {
                  if (pollRef.current) clearInterval(pollRef.current);
                  popupRef.current?.close();
                  setStatus("idle");
                }}
                className="text-sm text-theme-tertiary hover:text-theme-secondary transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {status === "idle" && (
          <div className="px-6 pb-5">
            <div className="flex items-center gap-2 text-[10px] text-theme-tertiary">
              <Shield className="w-3 h-3" />
              <span>Your data stays on your server. We never share with third parties.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
