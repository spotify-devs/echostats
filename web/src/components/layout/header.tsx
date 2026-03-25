"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell, LogIn, Music } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { GlobalSearch } from "@/components/layout/search";
import { SpotifyConnectModal } from "@/components/ui/spotify-connect-modal";
import { api } from "@/lib/api";

export function Header() {
  const [connectOpen, setConnectOpen] = useState(false);

  const { data: authStatus } = useQuery({
    queryKey: ["auth-status"],
    queryFn: () => api.get<any>("/api/v1/auth/status"),
    retry: false,
    refetchInterval: 60000,
  });

  const isAuthed = authStatus?.authenticated;
  const user = authStatus?.user;

  return (
    <>
      <header
        className="h-14 sm:h-16 border-b flex items-center px-4 sm:px-6 backdrop-blur-lg"
        style={{
          backgroundColor: "rgb(var(--surface-1) / 0.5)",
          borderColor: "rgb(var(--border) / var(--border-opacity))",
        }}
      >
        {/* Left: spacer for hamburger on mobile */}
        <div className="lg:hidden w-10 flex-shrink-0" />

        {/* Center: Logo + name on mobile */}
        <div className="flex-1 flex items-center justify-center sm:justify-start">
          <div className="flex items-center gap-2 sm:hidden">
            <div className="p-1.5 rounded-lg bg-accent-gradient">
              <Music className="w-4 h-4 text-white" />
            </div>
            <span
              className="text-base font-bold"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-via), var(--accent-gradient-to))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              EchoStats
            </span>
          </div>
          {/* Search — hidden on mobile, visible on sm+ */}
          <div className="hidden sm:block w-full">
            <GlobalSearch />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {isAuthed ? (
            <>
              <button className="p-2 rounded-lg hover:bg-current/[0.05] text-theme-tertiary hover:text-theme transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              {/* User avatar */}
              <div className="flex items-center gap-2">
                {user?.image_url ? (
                  <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-spotify-green/30">
                    <Image src={user.image_url} alt="" fill className="object-cover" sizes="32px" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent-gradient flex items-center justify-center text-white text-sm font-bold">
                    {user?.display_name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <span className="hidden md:block text-sm text-theme-secondary max-w-[120px] truncate">
                  {user?.display_name || "User"}
                </span>
              </div>
            </>
          ) : (
            <button
              onClick={() => setConnectOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-xl bg-spotify-green/15 text-spotify-green hover:bg-spotify-green/25 border border-spotify-green/20 transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Connect Spotify</span>
            </button>
          )}
        </div>
      </header>

      <SpotifyConnectModal isOpen={connectOpen} onClose={() => setConnectOpen(false)} />
    </>
  );
}
