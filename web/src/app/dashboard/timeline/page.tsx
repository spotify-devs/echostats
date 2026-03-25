"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, TrendingUp } from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";
import { LineChart } from "@/components/charts/line-chart";
import { TimeRangeSelector } from "@/components/ui/time-range-selector";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";

export default function TimelinePage() {
  const [period, setPeriod] = useState("all_time");

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-overview", period],
    queryFn: () => api.get<any>(`/api/v1/analytics/overview?period=${period}`),
  });

  const dailyTrend = (data?.daily_distribution || []).map((d: any) => ({
    day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d.day] || "",
    plays: d.count,
    hours: Math.round((d.total_ms / 3600000) * 10) / 10,
  }));

  const totalPlays = data?.total_tracks_played || 0;
  const milestones = [
    { threshold: 100, label: "First 100 plays", icon: "🎵", reached: totalPlays >= 100 },
    { threshold: 500, label: "500 plays!", icon: "🎶", reached: totalPlays >= 500 },
    { threshold: 1000, label: "1,000 plays milestone", icon: "🏆", reached: totalPlays >= 1000 },
    { threshold: 2000, label: "2,000 plays achieved", icon: "⭐", reached: totalPlays >= 2000 },
    { threshold: 5000, label: "5,000 plays legend", icon: "👑", reached: totalPlays >= 5000 },
  ];

  const topArtist = data?.top_artists?.[0];
  const topTrack = data?.top_tracks?.[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
            <Calendar className="w-6 h-6 text-accent-dynamic" /> Listening Timeline
          </h1>
          <p className="text-theme-secondary mt-1">Your musical journey at a glance</p>
        </div>
        <TimeRangeSelector value={period} onChange={setPeriod} />
      </div>

      {isLoading ? (
        <div className="space-y-6"><ChartSkeleton /><ChartSkeleton /></div>
      ) : (
        <>
          {/* Weekly Trend */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-theme mb-4">Weekly Listening Trend</h2>
            {dailyTrend.length > 0 ? (
              <LineChart
                data={dailyTrend}
                xKey="day"
                lines={[
                  { key: "plays", color: "rgb(var(--accent))", name: "Plays" },
                  { key: "hours", color: "#10b981", name: "Hours" },
                ]}
                height={280}
                showLegend
              />
            ) : (
              <p className="text-theme-tertiary text-center py-12">No data yet</p>
            )}
          </div>

          {/* Key Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topArtist && (
              <div className="glass-card p-5 flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-full overflow-hidden bg-theme-surface-3 flex-shrink-0">
                  {topArtist.image_url && <Image src={topArtist.image_url} alt="" fill className="object-cover" sizes="56px" />}
                </div>
                <div>
                  <p className="text-[10px] text-accent-dynamic uppercase tracking-wider font-medium">Most Played Artist</p>
                  <p className="text-sm font-bold text-theme">{topArtist.name}</p>
                  <p className="text-xs text-theme-tertiary">{topArtist.play_count} plays</p>
                </div>
              </div>
            )}
            {topTrack && (
              <div className="glass-card p-5 flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-theme-surface-3 flex-shrink-0">
                  {topTrack.image_url && <Image src={topTrack.image_url} alt="" fill className="object-cover" sizes="56px" />}
                </div>
                <div>
                  <p className="text-[10px] text-accent-dynamic uppercase tracking-wider font-medium">Most Played Track</p>
                  <p className="text-sm font-bold text-theme truncate max-w-[160px]">{topTrack.name?.split(" — ")[0]}</p>
                  <p className="text-xs text-theme-tertiary">{topTrack.play_count} plays</p>
                </div>
              </div>
            )}
            <div className="glass-card p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent-dynamic/15">
                <TrendingUp className="w-6 h-6 text-accent-dynamic" />
              </div>
              <div>
                <p className="text-[10px] text-accent-dynamic uppercase tracking-wider font-medium">Total Listening</p>
                <p className="text-sm font-bold text-theme">{data?.total_hours || 0} hours</p>
                <p className="text-xs text-theme-tertiary">{totalPlays.toLocaleString()} tracks played</p>
              </div>
            </div>
          </div>

          {/* Milestones Timeline */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-theme mb-6">Milestones</h2>
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-theme-surface-3" />
              <div className="space-y-6">
                {milestones.map((m, i) => (
                  <div key={i} className={`relative flex items-center gap-4 pl-12 ${m.reached ? "" : "opacity-40"}`}>
                    <div className={`absolute left-4 w-5 h-5 rounded-full flex items-center justify-center text-sm ${
                      m.reached ? "bg-accent-dynamic" : "bg-theme-surface-3"
                    }`}>
                      {m.reached ? "✓" : ""}
                    </div>
                    <span className="text-xl">{m.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-theme">{m.label}</p>
                      <p className="text-xs text-theme-tertiary">{m.threshold.toLocaleString()} plays</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
