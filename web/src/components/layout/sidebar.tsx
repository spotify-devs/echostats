"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Music,
  Users,
  Disc3,
  Clock,
  BarChart3,
  ListMusic,
  Sparkles,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/tracks", icon: Music, label: "Top Tracks" },
  { href: "/dashboard/artists", icon: Users, label: "Top Artists" },
  { href: "/dashboard/genres", icon: Disc3, label: "Genres" },
  { href: "/dashboard/history", icon: Clock, label: "History" },
  { href: "/dashboard/patterns", icon: BarChart3, label: "Patterns" },
  { href: "/dashboard/playlists", icon: ListMusic, label: "Playlists" },
  { href: "/dashboard/recommendations", icon: Sparkles, label: "Discover" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-surface-1 border-r border-white/5 flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-brand-gradient">
          <Music className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold text-gradient">EchoStats</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-brand-500/15 text-accent-purple"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="p-3 border-t border-white/5">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-all duration-200"
        >
          <Settings className="w-4.5 h-4.5" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
