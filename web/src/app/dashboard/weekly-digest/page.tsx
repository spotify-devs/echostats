"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Newspaper, TrendingUp, TrendingDown, Minus, Clock, Music,
  Users, Disc3, Flame, Star, ArrowRight,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";
import { BarChart } from "@/components/charts/bar-chart";
import { ChartSkeleton, CardSkeleton } from "@/components/ui/loading-skeleton";

function Trend({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <span className="text-theme-tertiary text-xs">—</span>;
  const diff = Math.round(((current - previous) / previous) * 100);
  if (diff > 0) return <span className="flex items-center gap-0.5 text-xs text-emerald-400"><TrendingUp className="w-3 h-3" />+{diff}%</span>;
  if (diff < 0) return <span className="flex items-center gap-0.5 text-xs text-red-400"><TrendingDown className="w-3 h-3" />{diff}%</span>;
  return <span className="flex items-center gap-0.5 text-xs text-theme-tertiary"><Minus className="w-3 h-3" />0%</span>;
}

export default function WeeklyDigestPage() {
  const { data: thisWeek, isLoading } = useQuery({
    queryKey: ["analytics-overview", "week"],
    queryFn: () => api.get<any>("/api/v1/analytics/overview?period=week"),
  });

  const { data: lastMonth } = useQuery({
    queryKey: ["analytics-overview", "month"],
    queryFn: () => api.get<any>("/api/v1/analytics/overview?period=month"),
  });

  const dailyData = (thisWeek?.daily_distribution || []).map((d: any) => ({
    day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d.day] || "",
    plays: d.count,
    hours: Math.round((d.total_ms / 3600000) * 10) / 10,
  }));

  const topArtist = thisWeek?.top_artists?.[0];
  const topTrack = thisWeek?.top_tracks?.[0];

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center pt-4">
        <Newspaper className="w-10 h-10 text-accent-dynamic mx-auto mb-3" />
        <h1 className="text-3xl font-bold text-theme">Weekly Digest</h1>
        <p className="text-theme-secondary mt-1">
          {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-6"><CardSkeleton /><ChartSkeleton /></div>
      ) : (
        <>
          {/* Hero Stats */}
          <div className="glass-card p-6 bg-gradient-to-br from-accent-dynamic/5 to-transparent">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Clock, label: "Hours", value: thisWeek?.total_hours || 0, prev: (lastMonth?.total_hours || 0) / 4, color: "text-accent-purple" },
                { icon: Music, label: "Tracks", value: thisWeek?.total_tracks_played || 0, prev: (lastMonth?.total_tracks_played || 0) / 4, color: "text-spotify-green" },
                { icon: Users, label: "Artists", value: thisWeek?.unique_artists || 0, prev: (lastMonth?.unique_artists || 0), color: "text-accent-cyan" },
                { icon: Flame, label: "Streak", value: thisWeek?.listening_streak_days || 0, prev: 0, color: "text-accent-amber" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-1.5`} />
                  <p className="text-2xl font-bold text-theme tabular-nums">{typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}</p>
                  <p className="text-[10px] text-theme-tertiary">{stat.label}</p>
                  {stat.prev > 0 && <Trend current={stat.value} previous={stat.prev} />}
                </div>
              ))}
            </div>
          </div>

          {/* Daily Breakdown */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-theme mb-4">Daily Breakdown</h2>
            {dailyData.length > 0 ? (
              <BarChart
                data={dailyData}
                xKey="day"
                bars={[{ key: "plays", color: "rgb(var(--accent))", name: "Plays" }]}
                height={220}
              />
            ) : (
              <p className="text-theme-tertiary text-center py-8">No data this week</p>
            )}
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {topArtist && (
              <div className="glass-card p-5 flex items-center gap-4">
                {topArtist.image_url && (
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-theme-surface-3 flex-shrink-0">
                    <Image src={topArtist.image_url} alt="" fill className="object-cover" sizes="64px" />
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-accent-dynamic uppercase tracking-wider">Artist of the Week</p>
                  <p className="text-lg font-bold text-theme">{topArtist.name}</p>
                  <p className="text-xs text-theme-tertiary">{topArtist.play_count} plays</p>
                </div>
              </div>
            )}
            {topTrack && (
              <div className="glass-card p-5 flex items-center gap-4">
                {topTrack.image_url && (
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-theme-surface-3 flex-shrink-0">
                    <Image src={topTrack.image_url} alt="" fill className="object-cover" sizes="64px" />
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-accent-dynamic uppercase tracking-wider">Track of the Week</p>
                  <p className="text-lg font-bold text-theme truncate max-w-[180px]">{topTrack.name?.split(" — ")[0]}</p>
                  <p className="text-xs text-theme-tertiary">{topTrack.play_count} plays</p>
                </div>
              </div>
            )}
          </div>

          {/* Top 5 Lists */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-theme mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-accent-amber" /> Top 5 Tracks
              </h3>
              <div className="space-y-2">
                {(thisWeek?.top_tracks || []).slice(0, 5).map((t: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-5 text-center text-accent-dynamic font-bold text-xs">{i + 1}</span>
                    <span className="flex-1 text-theme-secondary truncate">{t.name?.split(" — ")[0]}</span>
                    <span className="text-xs text-theme-tertiary">{t.play_count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-theme mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-spotify-green" /> Top 5 Artists
              </h3>
              <div className="space-y-2">
                {(thisWeek?.top_artists || []).slice(0, 5).map((a: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-5 text-center text-spotify-green font-bold text-xs">{i + 1}</span>
                    <span className="flex-1 text-theme-secondary truncate">{a.name}</span>
                    <span className="text-xs text-theme-tertiary">{a.play_count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center py-4">
            <Link href="/dashboard" className="text-sm text-accent-dynamic hover:underline inline-flex items-center gap-1">
              View full dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
