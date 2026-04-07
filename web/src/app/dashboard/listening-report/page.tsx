"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Disc3,
  FileText,
  Minus,
  Music,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import Image from "next/image";
import { BarChart } from "@/components/charts/bar-chart";
import { PieChart } from "@/components/charts/pie-chart";
import { CardSkeleton, ChartSkeleton } from "@/components/ui/loading-skeleton";
import { api } from "@/lib/api";
import type { AnalyticsOverview, ArtistPlay, GenrePlay, HourlyDistribution } from "@/lib/types";

export default function ListeningReportPage() {
  const { data: monthData, isLoading: loadingMonth } = useQuery({
    queryKey: ["analytics-overview", "month"],
    queryFn: () => api.get<AnalyticsOverview>("/api/v1/analytics/overview?period=month"),
  });

  const { data: weekData } = useQuery({
    queryKey: ["analytics-overview", "week"],
    queryFn: () => api.get<AnalyticsOverview>("/api/v1/analytics/overview?period=week"),
  });

  const isLoading = loadingMonth;

  function TrendBadge({ current, previous }: { current: number; previous: number }) {
    if (previous === 0) return null;
    const diff = Math.round(((current - previous) / previous) * 100);
    if (diff > 0)
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400">
          <TrendingUp className="w-3 h-3" />+{diff}%
        </span>
      );
    if (diff < 0)
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-red-400">
          <TrendingDown className="w-3 h-3" />
          {diff}%
        </span>
      );
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-theme-tertiary">
        <Minus className="w-3 h-3" />
        0%
      </span>
    );
  }

  const genrePie = (monthData?.top_genres || [])
    .slice(0, 6)
    .map((g: GenrePlay) => ({ name: g.name, value: g.play_count || 0 }));
  const hourlyData = (monthData?.hourly_distribution || []).map((h: HourlyDistribution) => ({
    hour: `${h.hour.toString().padStart(2, "0")}:00`,
    plays: h.count,
  }));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center gap-2">
            <FileText className="w-6 h-6 text-accent-dynamic" /> Monthly Report
          </h1>
          <p className="text-theme-secondary mt-1">
            {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <CardSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                icon: Clock,
                label: "Hours",
                value: monthData?.total_hours || 0,
                prev: weekData?.total_hours || 0,
                color: "text-accent-purple",
              },
              {
                icon: Music,
                label: "Tracks",
                value: monthData?.total_tracks_played || 0,
                prev: weekData?.total_tracks_played || 0,
                color: "text-spotify-green",
              },
              {
                icon: Users,
                label: "Artists",
                value: monthData?.unique_artists || 0,
                prev: weekData?.unique_artists || 0,
                color: "text-accent-cyan",
              },
              {
                icon: Disc3,
                label: "Genres",
                value: monthData?.unique_genres || 0,
                prev: weekData?.unique_genres || 0,
                color: "text-accent-pink",
              },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-4">
                <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                <p className="text-2xl font-bold text-theme">{stat.value.toLocaleString()}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-theme-tertiary">{stat.label}</p>
                  <TrendBadge current={stat.value} previous={stat.prev} />
                </div>
              </div>
            ))}
          </div>

          {/* Top 5 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-theme mb-4">Top Artists This Month</h2>
              <div className="space-y-3">
                {(monthData?.top_artists || []).slice(0, 5).map((a: ArtistPlay, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 text-center text-sm font-bold text-accent-dynamic">
                      {a.rank}
                    </span>
                    {a.image_url && (
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-theme-surface-3">
                        <Image
                          src={a.image_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-theme truncate">{a.name}</p>
                    </div>
                    <span className="text-xs text-theme-tertiary">{a.play_count} plays</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-theme mb-4">Genre Mix</h2>
              {genrePie.length > 0 ? (
                <PieChart data={genrePie} height={220} />
              ) : (
                <p className="text-theme-tertiary text-center py-12">No data</p>
              )}
            </div>
          </div>

          {/* Peak Hours */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-theme mb-4">Peak Listening Hours</h2>
            {hourlyData.length > 0 ? (
              <BarChart
                data={hourlyData}
                xKey="hour"
                bars={[{ key: "plays", color: "rgb(var(--accent))" }]}
                height={220}
              />
            ) : (
              <p className="text-theme-tertiary text-center py-12">No data</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
