"use client";

import {
  Activity,
  ArrowRight,
  BarChart3,
  Calendar,
  Clock,
  Command,
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
  LayoutDashboard,
  Library,
  ListMusic,
  Mic2,
  Microscope,
  Music,
  Network,
  Play,
  Repeat,
  Search,
  Settings,
  Sparkles,
  Star,
  Target,
  Terminal,
  Trophy,
  Users,
  Wand2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "@/lib/types";

interface CommandItem {
  id: string;
  label: string;
  section: string;
  icon: LucideIcon;
  action: () => void;
  keywords?: string;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const nav = useCallback(
    (path: string) => {
      router.push(path);
      setIsOpen(false);
      setQuery("");
    },
    [router],
  );

  const commands: CommandItem[] = [
    // Navigation
    {
      id: "dashboard",
      label: "Overview",
      section: "Navigate",
      icon: LayoutDashboard,
      action: () => nav("/dashboard"),
      keywords: "home main",
    },
    {
      id: "player",
      label: "Player",
      section: "Navigate",
      icon: Play,
      action: () => nav("/dashboard/player"),
      keywords: "now playing music control",
    },
    {
      id: "history",
      label: "History",
      section: "Navigate",
      icon: Clock,
      action: () => nav("/dashboard/history"),
      keywords: "recently played listening",
    },
    {
      id: "tracks",
      label: "Top Tracks",
      section: "Navigate",
      icon: Music,
      action: () => nav("/dashboard/tracks"),
      keywords: "songs most played",
    },
    {
      id: "artists",
      label: "Top Artists",
      section: "Navigate",
      icon: Users,
      action: () => nav("/dashboard/artists"),
      keywords: "musicians bands",
    },
    {
      id: "albums",
      label: "Albums",
      section: "Navigate",
      icon: Disc3,
      action: () => nav("/dashboard/albums"),
    },
    {
      id: "genres",
      label: "Genres",
      section: "Navigate",
      icon: Disc3,
      action: () => nav("/dashboard/genres"),
      keywords: "categories styles",
    },
    {
      id: "patterns",
      label: "Patterns",
      section: "Navigate",
      icon: BarChart3,
      action: () => nav("/dashboard/patterns"),
      keywords: "heatmap when",
    },
    {
      id: "mood",
      label: "Mood & Vibe",
      section: "Navigate",
      icon: Heart,
      action: () => nav("/dashboard/mood"),
      keywords: "valence feeling happy sad",
    },
    {
      id: "playlists",
      label: "Playlists",
      section: "Navigate",
      icon: ListMusic,
      action: () => nav("/dashboard/playlists"),
    },
    {
      id: "library",
      label: "Library",
      section: "Navigate",
      icon: Library,
      action: () => nav("/dashboard/library"),
      keywords: "saved followed",
    },
    {
      id: "discover",
      label: "Discover",
      section: "Navigate",
      icon: Sparkles,
      action: () => nav("/dashboard/recommendations"),
      keywords: "browse new releases",
    },
    {
      id: "stats",
      label: "Deep Stats",
      section: "Analytics",
      icon: Activity,
      action: () => nav("/dashboard/stats"),
      keywords: "statistics numbers",
    },
    {
      id: "timeline",
      label: "Timeline",
      section: "Analytics",
      icon: Calendar,
      action: () => nav("/dashboard/timeline"),
      keywords: "milestones journey",
    },
    {
      id: "taste",
      label: "Taste Profile",
      section: "Analytics",
      icon: Fingerprint,
      action: () => nav("/dashboard/taste-profile"),
      keywords: "personality audio dna",
    },
    {
      id: "top50",
      label: "Top 50",
      section: "Analytics",
      icon: Crown,
      action: () => nav("/dashboard/top-50"),
      keywords: "ranked best",
    },
    {
      id: "replay",
      label: "On Repeat",
      section: "Analytics",
      icon: Repeat,
      action: () => nav("/dashboard/replay"),
      keywords: "most replayed",
    },
    {
      id: "habits",
      label: "Listening Habits",
      section: "Analytics",
      icon: Activity,
      action: () => nav("/dashboard/listening-habits"),
      keywords: "when time day night",
    },
    {
      id: "musicdna",
      label: "Music DNA",
      section: "Analytics",
      icon: Dna,
      action: () => nav("/dashboard/music-dna"),
      keywords: "genre diversity",
    },
    {
      id: "audiolab",
      label: "Audio Lab",
      section: "Analytics",
      icon: Mic2,
      action: () => nav("/dashboard/audio-lab"),
      keywords: "features tempo energy",
    },
    {
      id: "decades",
      label: "Decades",
      section: "Analytics",
      icon: Globe,
      action: () => nav("/dashboard/decades"),
      keywords: "era 80s 90s 2000s",
    },
    {
      id: "artistmap",
      label: "Artist Map",
      section: "Reports",
      icon: Network,
      action: () => nav("/dashboard/artist-map"),
      keywords: "connections network",
    },
    {
      id: "report",
      label: "Monthly Report",
      section: "Reports",
      icon: FileText,
      action: () => nav("/dashboard/listening-report"),
    },
    {
      id: "review",
      label: "Year in Review",
      section: "Reports",
      icon: Star,
      action: () => nav("/dashboard/review"),
      keywords: "annual summary",
    },
    {
      id: "wrapped",
      label: "Wrapped",
      section: "Reports",
      icon: Gift,
      action: () => nav("/dashboard/wrapped"),
      keywords: "share card",
    },
    {
      id: "compare",
      label: "Compare",
      section: "Reports",
      icon: GitCompare,
      action: () => nav("/dashboard/compare"),
      keywords: "period vs",
    },
    {
      id: "achievements",
      label: "Achievements",
      section: "Reports",
      icon: Trophy,
      action: () => nav("/dashboard/achievements"),
      keywords: "badges milestones",
    },
    {
      id: "goals",
      label: "Goals",
      section: "Reports",
      icon: Target,
      action: () => nav("/dashboard/goals"),
      keywords: "targets progress",
    },
    {
      id: "generator",
      label: "Playlist Generator",
      section: "Tools",
      icon: Wand2,
      action: () => nav("/dashboard/playlist-generator"),
      keywords: "create make ai",
    },
    {
      id: "analyzer",
      label: "Playlist Analyzer",
      section: "Tools",
      icon: Microscope,
      action: () => nav("/dashboard/playlist-analyzer"),
      keywords: "analyze inspect",
    },
    {
      id: "export",
      label: "Export Data",
      section: "Tools",
      icon: Download,
      action: () => nav("/dashboard/export"),
      keywords: "download csv json",
    },
    {
      id: "logs",
      label: "API Logs",
      section: "System",
      icon: Terminal,
      action: () => nav("/dashboard/api-logs"),
      keywords: "debug monitoring",
    },
    {
      id: "settings",
      label: "Settings",
      section: "System",
      icon: Settings,
      action: () => nav("/dashboard/settings"),
      keywords: "theme accent preferences",
    },
  ];

  // Filter
  const filtered =
    query.length > 0
      ? commands.filter((cmd) => {
          const q = query.toLowerCase();
          return (
            cmd.label.toLowerCase().includes(q) ||
            cmd.section.toLowerCase().includes(q) ||
            cmd.keywords?.toLowerCase().includes(q)
          );
        })
      : commands;

  // Group by section
  const sections = new Map<string, CommandItem[]>();
  filtered.forEach((cmd) => {
    const items = sections.get(cmd.section) || [];
    items.push(cmd);
    sections.set(cmd.section, items);
  });

  // Keyboard
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((v) => !v);
        return;
      }
      if (!isOpen) return;

      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].action();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  if (!isOpen) return null;

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh] px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => {
          setIsOpen(false);
          setQuery("");
        }}
      />
      <div className="relative w-full max-w-lg glass-card overflow-hidden animate-scale-in shadow-2xl">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-current/[0.08]">
          <Search className="w-5 h-5 text-theme-tertiary flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, tools, settings..."
            className="flex-1 bg-transparent text-sm text-theme placeholder:text-theme-tertiary focus:outline-none"
          />
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-theme-tertiary bg-theme-surface-3 rounded border border-current/[0.1]">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-theme-tertiary text-center py-8">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            Array.from(sections.entries()).map(([section, items]) => (
              <div key={section}>
                <p className="px-4 py-1.5 text-[10px] text-theme-tertiary uppercase tracking-widest font-semibold">
                  {section}
                </p>
                {items.map((cmd) => {
                  const idx = flatIndex++;
                  const isSelected = idx === selectedIndex;
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => cmd.action()}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected
                          ? "bg-accent-dynamic/10 text-accent-dynamic"
                          : "text-theme-secondary hover:bg-current/[0.04]"
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-sm">{cmd.label}</span>
                      {isSelected && <ArrowRight className="w-3.5 h-3.5 text-accent-dynamic" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-current/[0.08] text-[10px] text-theme-tertiary">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-theme-surface-3 rounded">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-theme-surface-3 rounded">↵</kbd> Select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command className="w-3 h-3" />K to toggle
          </span>
        </div>
      </div>
    </div>
  );
}
