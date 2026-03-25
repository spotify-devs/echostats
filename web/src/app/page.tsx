"use client";

import { BarChart3, Clock, Disc3, Loader2, Music, Shield, Smartphone, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SpotifyConnectModal } from "@/components/ui/spotify-connect-modal";
import { api } from "@/lib/api";

export default function LandingPage() {
  const [connectOpen, setConnectOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  // Auto-redirect if already authenticated (single-user auto-login)
  useEffect(() => {
    api
      .get<{ authenticated: boolean }>("/api/v1/auth/status")
      .then((data) => {
        if (data.authenticated) {
          router.replace("/dashboard");
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        setChecking(false);
      });
  }, [router]);

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-accent-dynamic animate-spin" />
          <p className="text-sm text-theme-tertiary">Checking authentication…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-surface px-4">
      <div className="max-w-2xl w-full text-center space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 rounded-2xl bg-accent-gradient shadow-glow">
            <Music className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gradient">EchoStats</h1>
        </div>

        {/* Tagline */}
        <p className="text-xl text-theme-secondary max-w-md mx-auto">
          Discover deep insights about your Spotify listening habits with beautiful analytics.
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <div className="glass-card p-4 space-y-2">
            <BarChart3 className="w-6 h-6 text-accent-purple mx-auto" />
            <p className="text-sm font-medium text-theme">Listening Analytics</p>
            <p className="text-xs text-theme-tertiary">Charts, patterns, and trends</p>
          </div>
          <div className="glass-card p-4 space-y-2">
            <Disc3 className="w-6 h-6 text-spotify-green mx-auto" />
            <p className="text-sm font-medium text-theme">Artist Insights</p>
            <p className="text-xs text-theme-tertiary">Top artists, genres, and mood</p>
          </div>
          <div className="glass-card p-4 space-y-2">
            <TrendingUp className="w-6 h-6 text-accent-cyan mx-auto" />
            <p className="text-sm font-medium text-theme">Trend Tracking</p>
            <p className="text-xs text-theme-tertiary">See how your taste evolves</p>
          </div>
        </div>

        {/* More highlights */}
        <div className="flex flex-wrap justify-center gap-4 text-xs text-theme-tertiary">
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" /> Self-hosted & private
          </span>
          <span className="flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5" /> PWA — install on any device
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Import full Spotify history
          </span>
        </div>

        {/* Connect Button */}
        <div className="pt-4 flex flex-col items-center gap-3">
          <button
            onClick={() => setConnectOpen(true)}
            className="btn-spotify inline-flex items-center gap-2 text-lg px-8 py-3"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            Connect with Spotify
          </button>
          <p className="text-[11px] text-theme-tertiary">
            Free · No credit card · Your data stays on your server
          </p>
        </div>
      </div>

      {/* Spotify Connect Modal */}
      <SpotifyConnectModal isOpen={connectOpen} onClose={() => setConnectOpen(false)} />
    </main>
  );
}
