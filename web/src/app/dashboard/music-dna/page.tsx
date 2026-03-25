"use client";

import { useQuery } from "@tanstack/react-query";
import { Dna } from "lucide-react";
import { useState } from "react";
import { BarChart } from "@/components/charts/bar-chart";
import { PieChart } from "@/components/charts/pie-chart";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";
import { TimeRangeSelector } from "@/components/ui/time-range-selector";
import { api } from "@/lib/api";

const GENRE_EMOJIS: Record<string, string> = {
  pop: "🎤",
  rock: "🎸",
  hip: "🎤",
  rap: "🎤",
  r: "🎵",
  jazz: "🎷",
  classical: "🎻",
  electronic: "🎧",
  dance: "💃",
  indie: "🎹",
  metal: "🤘",
  country: "🤠",
  latin: "💃",
  reggae: "🌴",
  folk: "🪕",
  blues: "🎺",
  soul: "❤️",
  punk: "⚡",
  k: "🇰🇷",
};

function getEmoji(genre: string): string {
  const lower = genre.toLowerCase();
  for (const [key, emoji] of Object.entries(GENRE_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return "🎵";
}

export default function MusicDnaPage() {
  const [period, setPeriod] = useState("all_time");

  const { data, isLoading } = useQuery({
    queryKey: ["genre-distribution-dna", period],
    queryFn: () => api.get<any>(`/api/v1/genres/distribution?period=${period}`),
  });

  const genres = data?.genres || [];
  const totalPlays = genres.reduce((sum: number, g: any) => sum + (g.play_count || 0), 0);

  const pieData = genres.slice(0, 8).map((g: any) => ({ name: g.name, value: g.play_count }));
  const barData = genres.slice(0, 15).map((g: any) => ({
    name: g.name.length > 12 ? `${g.name.slice(0, 12)}…` : g.name,
    plays: g.play_count,
  }));

  // Diversity score
  const diversityScore =
    genres.length > 0 ? Math.min(100, Math.round((genres.length / 30) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center gap-2">
            <Dna className="w-6 h-6 text-accent-dynamic" /> Music DNA
          </h1>
          <p className="text-theme-secondary mt-1">Deep dive into your genre preferences</p>
        </div>
        <TimeRangeSelector value={period} onChange={setPeriod} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <>
          {/* Diversity Score */}
          <FadeIn>
            <div className="glass-card p-6 flex flex-col sm:flex-row items-center gap-6">
              <div className="relative flex-shrink-0">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    fill="none"
                    stroke="rgb(var(--surface-3))"
                    strokeWidth="8"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    fill="none"
                    stroke="rgb(var(--accent))"
                    strokeWidth="8"
                    strokeDasharray={`${(diversityScore / 100) * 301} 301`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-theme">{diversityScore}</span>
                  <span className="text-[8px] text-theme-tertiary uppercase">/ 100</span>
                </div>
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-xl font-bold text-theme">Genre Diversity: {diversityScore}%</h2>
                <p className="text-sm text-theme-secondary mt-1">
                  You listen to {genres.length} different genres across{" "}
                  {totalPlays.toLocaleString()} plays
                </p>
                <p className="text-xs text-theme-tertiary mt-2">
                  {diversityScore > 70
                    ? "You're a true genre explorer! 🌍"
                    : diversityScore > 40
                      ? "Nice mix of variety and favorites 🎯"
                      : "You know exactly what you like 💎"}
                </p>
              </div>
            </div>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StaggerItem>
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-theme mb-4">Genre Distribution</h2>
                {pieData.length > 0 ? (
                  <PieChart data={pieData} height={280} />
                ) : (
                  <p className="text-theme-tertiary text-center py-12">No data</p>
                )}
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-theme mb-4">All Genres Ranked</h2>
                {barData.length > 0 ? (
                  <BarChart
                    data={barData}
                    xKey="name"
                    bars={[{ key: "plays", color: "rgb(var(--accent))" }]}
                    height={280}
                    layout="vertical"
                  />
                ) : (
                  <p className="text-theme-tertiary text-center py-12">No data</p>
                )}
              </div>
            </StaggerItem>
          </StaggerContainer>

          {/* Genre Cards */}
          <FadeIn delay={0.2}>
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-theme mb-4">
                Genre Breakdown ({genres.length} genres)
              </h2>
              <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {genres.map((genre: any, i: number) => {
                  const percent =
                    totalPlays > 0 ? Math.round((genre.play_count / totalPlays) * 100) : 0;
                  return (
                    <StaggerItem key={i}>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-theme-surface-2 hover:bg-current/[0.05] transition-colors">
                        <span className="text-xl">{getEmoji(genre.name)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-theme truncate capitalize">
                              {genre.name}
                            </span>
                            <span className="text-xs text-accent-dynamic ml-2">{percent}%</span>
                          </div>
                          <div className="w-full h-1 rounded-full bg-theme-surface-3 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${percent}%`,
                                backgroundColor: "rgb(var(--accent))",
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-theme-tertiary tabular-nums">
                          {genre.play_count}
                        </span>
                      </div>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            </div>
          </FadeIn>
        </>
      )}
    </div>
  );
}
