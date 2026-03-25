"use client";

import {
  Code,
  Cpu,
  Database,
  Github,
  Globe,
  Heart,
  Info,
  Palette,
  Shield,
  Smartphone,
} from "lucide-react";
import Link from "next/link";

const TECH_STACK = [
  { name: "FastAPI", desc: "Python backend", icon: Cpu, color: "#009688" },
  { name: "Next.js 16", desc: "React frontend", icon: Code, color: "#000000" },
  { name: "MongoDB", desc: "Document database", icon: Database, color: "#47A248" },
  { name: "Redis", desc: "Cache & queue", icon: Database, color: "#DC382D" },
  { name: "Recharts", desc: "Data visualization", icon: Palette, color: "#8884d8" },
  { name: "Tailwind CSS", desc: "Styling", icon: Palette, color: "#06B6D4" },
  { name: "Docker", desc: "Containerization", icon: Globe, color: "#2496ED" },
  { name: "PWA", desc: "Installable app", icon: Smartphone, color: "#5A0FC8" },
];

const FEATURES = [
  "40+ dashboard pages with interactive visualizations",
  "6 themes (Dark, Light, Dim, Ocean, Midnight, Forest) + 8 accent colors + custom picker",
  "Full Spotify API coverage (63 client methods, 35+ endpoints)",
  "Real-time player controls with device management",
  "Historical data import (StreamingHistory + Extended)",
  "AI playlist generator with mood/genre selection",
  "Audio feature analysis (danceability, energy, valence, etc.)",
  "Achievements, goals, and listening streak tracking",
  "Command palette (⌘K) with 33 commands",
  "Mobile-responsive with bottom navigation",
  "Data export (CSV/JSON)",
  "AES-256-GCM token encryption",
  "Background sync every 15 minutes",
  "Kubernetes Helm chart deployment",
];

export default function AboutPage() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      {/* Hero */}
      <div className="text-center pt-8 space-y-4">
        <div className="inline-flex p-4 rounded-3xl bg-accent-dynamic/15 shadow-accent-glow">
          <Info className="w-10 h-10 text-accent-dynamic" />
        </div>
        <h1 className="text-4xl font-bold text-gradient">EchoStats</h1>
        <p className="text-theme-secondary max-w-md mx-auto">
          Self-hosted Spotify analytics dashboard. Discover insights about your listening habits
          with beautiful visualizations.
        </p>
        <p className="text-xs text-theme-tertiary">Version 0.1.0 · MIT License</p>
      </div>

      {/* Features */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-theme mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-accent-pink" /> Features
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FEATURES.map((feature, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="text-accent-dynamic mt-0.5">✓</span>
              <span className="text-theme-secondary">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-theme mb-4 flex items-center gap-2">
          <Code className="w-5 h-5 text-accent-dynamic" /> Tech Stack
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TECH_STACK.map((tech) => (
            <div
              key={tech.name}
              className="p-3 rounded-xl bg-theme-surface-2 text-center space-y-1.5"
            >
              <tech.icon className="w-6 h-6 mx-auto" style={{ color: tech.color }} />
              <p className="text-sm font-medium text-theme">{tech.name}</p>
              <p className="text-[10px] text-theme-tertiary">{tech.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-theme mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" /> Privacy
        </h2>
        <div className="space-y-2 text-sm text-theme-secondary">
          <p>✓ Self-hosted — all data stays on YOUR server</p>
          <p>✓ No tracking, no analytics sent to third parties</p>
          <p>✓ OAuth tokens encrypted at rest (AES-256-GCM)</p>
          <p>✓ Open source — audit the code yourself</p>
        </div>
      </div>

      {/* Links */}
      <div className="flex justify-center gap-4">
        <a
          href="https://github.com/spotify-devs/echostats"
          target="_blank"
          rel="noopener noreferrer"
          className="glass-card px-5 py-3 flex items-center gap-2 text-sm text-theme-secondary hover:text-theme transition-colors"
        >
          <Github className="w-5 h-5" /> GitHub
        </a>
        <Link
          href="/dashboard/settings"
          className="glass-card px-5 py-3 flex items-center gap-2 text-sm text-theme-secondary hover:text-theme transition-colors"
        >
          <Palette className="w-5 h-5" /> Customize Theme
        </Link>
      </div>
    </div>
  );
}
