"use client";

import { Bell, Search } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 border-b border-white/5 bg-surface-1/50 backdrop-blur-lg flex items-center justify-between px-6">
      {/* Search */}
      <div className="relative max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          placeholder="Search tracks, artists, albums..."
          className="w-full pl-10 pr-4 py-2 bg-surface-2 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/25 transition-all"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
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
