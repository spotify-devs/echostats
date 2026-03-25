"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Disc3 } from "lucide-react";
import { api } from "@/lib/api";
import { PieChart } from "@/components/charts/pie-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { TimeRangeSelector } from "@/components/ui/time-range-selector";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";

export default function GenresPage() {
  const [period, setPeriod] = useState("all_time");

  const { data, isLoading } = useQuery({
    queryKey: ["genre-distribution", period],
    queryFn: () => api.get<any>(`/api/v1/genres/distribution?period=${period}`),
  });

  const genres = data?.genres || [];
  const pieData = genres.slice(0, 10).map((g: any) => ({ name: g.name, value: g.play_count }));
  const barData = genres.slice(0, 15).map((g: any) => ({ name: g.name, plays: g.play_count }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Disc3 className="w-6 h-6 text-accent-cyan" /> Genres
          </h1>
          <p className="text-white/50 mt-1">Your genre distribution</p>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Genre Distribution</h2>
              {pieData.length > 0 ? (
                <PieChart data={pieData} height={350} />
              ) : (
                <p className="text-white/40 text-center py-12">No genre data available</p>
              )}
            </div>
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Top Genres by Plays</h2>
              {barData.length > 0 ? (
                <BarChart
                  data={barData}
                  xKey="name"
                  bars={[{ key: "plays", color: "#06b6d4", name: "Plays" }]}
                  height={350}
                  layout="vertical"
                />
              ) : (
                <p className="text-white/40 text-center py-12">No genre data available</p>
              )}
            </div>
          </div>

          {/* Genre list */}
          <div className="glass-card">
            <div className="p-4 border-b border-white/5">
              <h2 className="text-lg font-semibold text-white">All Genres ({data?.total_genres || 0})</h2>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {genres.map((genre: any, i: number) => (
                  <span key={i} className="px-3 py-1.5 text-xs rounded-full bg-surface-3 text-white/60 border border-white/5">
                    {genre.name} <span className="text-white/30 ml-1">{genre.play_count}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
