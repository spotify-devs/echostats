"use client";

import {
  Activity,
  BarChart3,
  Bell,
  Calendar,
  CalendarDays,
  Clock,
  Crown,
  Disc3,
  Dna,
  Download,
  FileText,
  Fingerprint,
  Gift,
  GitCompare,
  Globe,
  Heart,
  Info,
  LayoutDashboard,
  Library,
  ListMusic,
  Menu,
  Mic2,
  Microscope,
  Music,
  Network,
  Newspaper,
  Play,
  Podcast,
  Radio,
  RefreshCw,
  Repeat,
  Settings,
  Shuffle,
  Sparkles,
  Star,
  Target,
  Terminal,
  Trophy,
  Users,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavSection {
  title: string;
  items: { href: string; icon: any; label: string }[];
}

const navSections: NavSection[] = [
  {
    title: "Main",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
      { href: "/dashboard/player", icon: Play, label: "Player" },
      { href: "/dashboard/history", icon: Clock, label: "History" },
      { href: "/dashboard/calendar", icon: CalendarDays, label: "Calendar" },
    ],
  },
  {
    title: "Analytics",
    items: [
      { href: "/dashboard/tracks", icon: Music, label: "Top Tracks" },
      { href: "/dashboard/artists", icon: Users, label: "Top Artists" },
      { href: "/dashboard/albums", icon: Disc3, label: "Albums" },
      { href: "/dashboard/genres", icon: Radio, label: "Genres" },
      { href: "/dashboard/patterns", icon: BarChart3, label: "Patterns" },
      { href: "/dashboard/mood", icon: Heart, label: "Mood & Vibe" },
      { href: "/dashboard/stats", icon: Activity, label: "Deep Stats" },
      { href: "/dashboard/replay", icon: Repeat, label: "On Repeat" },
      { href: "/dashboard/listening-habits", icon: Activity, label: "Habits" },
      { href: "/dashboard/music-dna", icon: Dna, label: "Music DNA" },
      { href: "/dashboard/timeline", icon: Calendar, label: "Timeline" },
      { href: "/dashboard/taste-profile", icon: Fingerprint, label: "Taste Profile" },
      { href: "/dashboard/top-50", icon: Crown, label: "Top 50" },
    ],
  },
  {
    title: "Library",
    items: [
      { href: "/dashboard/playlists", icon: ListMusic, label: "Playlists" },
      { href: "/dashboard/library", icon: Library, label: "Library" },
      { href: "/dashboard/podcasts", icon: Podcast, label: "Podcasts" },
      { href: "/dashboard/recent-adds", icon: Zap, label: "Recently Added" },
      { href: "/dashboard/playlist-generator", icon: Wand2, label: "Playlist Gen" },
      { href: "/dashboard/playlist-analyzer", icon: Microscope, label: "Analyzer" },
    ],
  },
  {
    title: "Discover",
    items: [
      { href: "/dashboard/recommendations", icon: Sparkles, label: "Discover" },
      { href: "/dashboard/decades", icon: Globe, label: "Decades" },
      { href: "/dashboard/audio-lab", icon: Mic2, label: "Audio Lab" },
      { href: "/dashboard/similar", icon: Shuffle, label: "Similar Tracks" },
    ],
  },
  {
    title: "Reports",
    items: [
      { href: "/dashboard/review", icon: Star, label: "Year in Review" },
      { href: "/dashboard/compare", icon: GitCompare, label: "Compare" },
      { href: "/dashboard/achievements", icon: Trophy, label: "Achievements" },
      { href: "/dashboard/wrapped", icon: Gift, label: "Wrapped" },
      { href: "/dashboard/artist-map", icon: Network, label: "Artist Map" },
      { href: "/dashboard/listening-report", icon: FileText, label: "Monthly Report" },
      { href: "/dashboard/goals", icon: Target, label: "Goals" },
      { href: "/dashboard/weekly-digest", icon: Newspaper, label: "Weekly Digest" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/dashboard/api-logs", icon: Terminal, label: "API Logs" },
      { href: "/dashboard/sync-jobs", icon: RefreshCw, label: "Sync Jobs" },
      { href: "/dashboard/notifications", icon: Bell, label: "Notifications" },
      { href: "/dashboard/export", icon: Download, label: "Export" },
      { href: "/dashboard/changelog", icon: Zap, label: "What's New" },
      { href: "/dashboard/about", icon: Info, label: "About" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl border text-theme-secondary hover:text-theme transition-colors"
        style={{
          backgroundColor: "rgb(var(--surface-2))",
          borderColor: "rgb(var(--border) / 0.1)",
        }}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 border-r flex flex-col h-full transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          backgroundColor: "rgb(var(--surface-1))",
          borderColor: "rgb(var(--border) / var(--border-opacity))",
        }}
      >
        {/* Logo */}
        <div className="p-5 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent-gradient">
              <Music className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gradient">EchoStats</span>
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1 rounded-lg text-theme-tertiary hover:text-theme"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-4 scrollbar-thin">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-theme-tertiary uppercase tracking-widest">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map(({ href, icon: Icon, label }) => {
                  const isActive =
                    pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-accent-dynamic/15 text-accent-dynamic"
                          : "text-theme-secondary hover:text-theme hover:bg-white/5"
                      }`}
                    >
                      <Icon className="w-[16px] h-[16px]" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Settings */}
        <div
          className="p-3"
          style={{ borderTop: "1px solid rgb(var(--border) / var(--border-opacity))" }}
        >
          <Link
            href="/dashboard/settings"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
              pathname === "/dashboard/settings"
                ? "bg-accent-dynamic/15 text-accent-dynamic"
                : "text-theme-secondary hover:text-theme hover:bg-white/5"
            }`}
          >
            <Settings className="w-[16px] h-[16px]" />
            Settings
          </Link>
        </div>
      </aside>
    </>
  );
}
