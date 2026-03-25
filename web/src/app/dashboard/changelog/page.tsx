"use client";

import { Calendar, Sparkles, Zap } from "lucide-react";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  icon: any;
  color: string;
  changes: string[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.1.0",
    date: "March 2026",
    title: "Initial Release 🎉",
    icon: Sparkles,
    color: "#a855f7",
    changes: [
      "40+ dashboard pages with interactive visualizations",
      "Spotify OAuth 2.0 with encrypted token storage",
      "Full listening history tracking with 15-minute sync",
      "Historical data import (StreamingHistory + Extended format)",
      "Top tracks, artists, albums, and genres analytics",
      "Listening patterns: heatmap, listening clock, hourly/daily charts",
      "Mood & Vibe analysis with personality detection",
      "Audio Lab with radar chart and feature breakdowns",
      "Year in Review and Personal Wrapped pages",
      "Achievement system with 12 milestones",
      "Player controls with device management and queue",
      "Playlist Generator with mood/genre selection",
      "Playlist Analyzer with audio profiling",
      "Similar Tracks finder",
      "6 themes + 8 accent colors + custom color picker",
      "Command palette (⌘K) with 33 commands",
      "Keyboard shortcuts (g+d, g+t, etc.)",
      "Mobile-responsive with bottom navigation bar",
      "PWA — installable on any device",
      "Data export (CSV/JSON) for all data types",
      "API logs dashboard with live monitoring",
      "Notification center for sync and achievement alerts",
      "Docker Compose + Kubernetes Helm chart",
      "GitHub Actions CI/CD (lint, test, build, release)",
      "Astro Starlight documentation site",
      "13 API tests (health, auth, crypto, docs)",
      "63 Spotify API client methods covering all categories",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      <div className="text-center pt-4">
        <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center justify-center gap-2">
          <Zap className="w-6 h-6 text-accent-dynamic" /> What&apos;s New
        </h1>
        <p className="text-theme-secondary mt-1">Changelog and release notes</p>
      </div>

      {CHANGELOG.map((entry) => (
        <div key={entry.version} className="glass-card overflow-hidden">
          {/* Version Header */}
          <div className="p-5 border-b border-white/5 flex items-center gap-4 bg-gradient-to-r from-accent-dynamic/5 to-transparent">
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${entry.color}20` }}>
              <entry.icon className="w-6 h-6" style={{ color: entry.color }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-theme">v{entry.version}</h2>
                <span className="px-2 py-0.5 text-[10px] font-medium bg-accent-dynamic/15 text-accent-dynamic rounded-full">
                  Latest
                </span>
              </div>
              <p className="text-sm text-theme-secondary">{entry.title}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-theme-tertiary">
              <Calendar className="w-3.5 h-3.5" /> {entry.date}
            </div>
          </div>

          {/* Changes */}
          <div className="p-5">
            <div className="space-y-2">
              {entry.changes.map((change, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="text-accent-dynamic mt-0.5 flex-shrink-0">•</span>
                  <span className="text-theme-secondary">{change}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
