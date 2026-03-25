"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Music, Users, Clock, BarChart3 } from "lucide-react";

const BOTTOM_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/dashboard/tracks", icon: Music, label: "Tracks" },
  { href: "/dashboard/artists", icon: Users, label: "Artists" },
  { href: "/dashboard/history", icon: Clock, label: "History" },
  { href: "/dashboard/patterns", icon: BarChart3, label: "Stats" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t safe-bottom" style={{ backgroundColor: "rgb(var(--surface-1) / 0.95)", borderColor: "rgb(var(--border) / var(--border-opacity))" }}>
      <div className="flex items-center justify-around py-2">
        {BOTTOM_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[56px] ${
                isActive
                  ? "text-accent-dynamic"
                  : "text-theme-tertiary"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
