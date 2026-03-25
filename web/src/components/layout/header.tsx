"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, LogIn } from "lucide-react";
import Image from "next/image";
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
      <header className="h-16 border-b border-white/5 bg-surface-1/50 backdrop-blur-lg flex items-center justify-between px-4 sm:px-6">
        {/* App name on mobile, spacer for hamburger */}
        <div className="flex items-center gap-2 lg:hidden flex-shrink-0">
          <div className="w-10" /> {/* hamburger spacer */}
          <span className="text-sm font-bold text-gradient sm:hidden">EchoStats</span>
        </div>

        {/* Search — hidden on mobile, visible on sm+ */}
        <div className="flex-1 hidden sm:block">
          <GlobalSearch />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">

          {isAuthed ? (
            <>
              <button className="p-2 rounded-lg hover:bg-white/5 text-theme-tertiary hover:text-theme transition-colors">
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

      <SpotifyConnectModal
        isOpen={connectOpen}
        onClose={() => setConnectOpen(false)}
      />
    </>
  );
}
