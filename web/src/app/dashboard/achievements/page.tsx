"use client";

import { useQuery } from "@tanstack/react-query";
import { Trophy, Star, Flame, Music, Users, Clock, Disc3, Headphones, Sparkles, Target } from "lucide-react";
import { api } from "@/lib/api";

interface Achievement {
  id: string;
  icon: any;
  title: string;
  description: string;
  threshold: number;
  current: number;
  unit: string;
  color: string;
}

export default function AchievementsPage() {
  const { data } = useQuery({
    queryKey: ["analytics-overview", "all_time"],
    queryFn: () => api.get<any>("/api/v1/analytics/overview?period=all_time"),
  });

  const totalPlays = data?.total_tracks_played || 0;
  const totalHours = data?.total_hours || 0;
  const uniqueArtists = data?.unique_artists || 0;
  const uniqueGenres = data?.unique_genres || 0;
  const streak = data?.listening_streak_days || 0;
  const uniqueTracks = data?.unique_tracks || 0;

  const achievements: Achievement[] = [
    { id: "first-100", icon: Music, title: "Century", description: "Play 100 tracks", threshold: 100, current: totalPlays, unit: "plays", color: "#10b981" },
    { id: "first-500", icon: Star, title: "Half K", description: "Play 500 tracks", threshold: 500, current: totalPlays, unit: "plays", color: "#f59e0b" },
    { id: "first-1000", icon: Trophy, title: "Millennial", description: "Play 1,000 tracks", threshold: 1000, current: totalPlays, unit: "plays", color: "#a855f7" },
    { id: "first-5000", icon: Sparkles, title: "Legendary", description: "Play 5,000 tracks", threshold: 5000, current: totalPlays, unit: "plays", color: "#ef4444" },
    { id: "10-artists", icon: Users, title: "Social Butterfly", description: "Listen to 10 different artists", threshold: 10, current: uniqueArtists, unit: "artists", color: "#06b6d4" },
    { id: "50-artists", icon: Users, title: "Globetrotter", description: "Listen to 50 different artists", threshold: 50, current: uniqueArtists, unit: "artists", color: "#ec4899" },
    { id: "10h", icon: Clock, title: "Dedicated", description: "Listen for 10 hours", threshold: 10, current: totalHours, unit: "hours", color: "#10b981" },
    { id: "100h", icon: Headphones, title: "Audiophile", description: "Listen for 100 hours", threshold: 100, current: totalHours, unit: "hours", color: "#f59e0b" },
    { id: "7-streak", icon: Flame, title: "On Fire", description: "7-day listening streak", threshold: 7, current: streak, unit: "days", color: "#ef4444" },
    { id: "30-streak", icon: Flame, title: "Unstoppable", description: "30-day listening streak", threshold: 30, current: streak, unit: "days", color: "#a855f7" },
    { id: "5-genres", icon: Disc3, title: "Explorer", description: "Discover 5 genres", threshold: 5, current: uniqueGenres, unit: "genres", color: "#06b6d4" },
    { id: "20-genres", icon: Target, title: "Genre Master", description: "Discover 20 genres", threshold: 20, current: uniqueGenres, unit: "genres", color: "#ec4899" },
  ];

  const unlocked = achievements.filter((a) => a.current >= a.threshold);
  const locked = achievements.filter((a) => a.current < a.threshold);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
            <Trophy className="w-6 h-6 text-accent-amber" /> Achievements
          </h1>
          <p className="text-theme-secondary mt-1">{unlocked.length} of {achievements.length} unlocked</p>
        </div>
        <div className="glass-card px-4 py-2 text-center">
          <p className="text-2xl font-bold text-accent-dynamic">{unlocked.length}/{achievements.length}</p>
          <p className="text-[10px] text-theme-tertiary uppercase">Completed</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-3 rounded-full bg-theme-surface-3 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(unlocked.length / achievements.length) * 100}%`, background: "linear-gradient(90deg, var(--accent-gradient-from), var(--accent-gradient-via))" }} />
      </div>

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-theme mb-4">🏆 Unlocked</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {unlocked.map((a) => (
              <div key={a.id} className="glass-card p-5 flex items-start gap-4 border-l-4" style={{ borderLeftColor: a.color }}>
                <div className="p-2 rounded-xl" style={{ backgroundColor: `${a.color}20` }}>
                  <a.icon className="w-6 h-6" style={{ color: a.color }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-theme">{a.title}</p>
                  <p className="text-xs text-theme-tertiary">{a.description}</p>
                  <p className="text-xs text-accent-dynamic mt-1">✓ {a.current.toLocaleString()} {a.unit}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-theme mb-4">🔒 In Progress</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {locked.map((a) => {
              const progress = Math.min((a.current / a.threshold) * 100, 99);
              return (
                <div key={a.id} className="glass-card p-5 flex items-start gap-4 opacity-60">
                  <div className="p-2 rounded-xl bg-theme-surface-3">
                    <a.icon className="w-6 h-6 text-theme-tertiary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-theme">{a.title}</p>
                    <p className="text-xs text-theme-tertiary">{a.description}</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] text-theme-tertiary mb-1">
                        <span>{a.current.toLocaleString()} / {a.threshold.toLocaleString()} {a.unit}</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-theme-surface-3 overflow-hidden">
                        <div className="h-full rounded-full bg-theme-surface-4 transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
