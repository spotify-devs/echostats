"use client";

import { Bell, Search } from "lucide-react";
import { GlobalSearch } from "@/components/layout/search";

export function Header() {
  return (
    <header className="h-16 border-b border-white/5 bg-surface-1/50 backdrop-blur-lg flex items-center justify-between px-4 sm:px-6">
      {/* Spacer for mobile hamburger */}
      <div className="w-10 lg:hidden" />

      {/* Search — hidden on mobile */}
      <div className="hidden sm:block flex-1">
        <GlobalSearch />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Mobile search button */}
        <button className="sm:hidden p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors">
          <Search className="w-5 h-5" />
        </button>
        <button className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center text-white text-sm font-bold">
          ?
        </div>
      </div>
    </header>
  );
}
