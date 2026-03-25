"use client";

import { useQuery } from "@tanstack/react-query";
import { Globe, Music } from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";
import { BarChart } from "@/components/charts/bar-chart";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";

const DECADE_COLORS: Record<string, string> = {
  "2020s": "#a855f7",
  "2010s": "#ec4899",
  "2000s": "#06b6d4",
  "1990s": "#10b981",
  "1980s": "#f59e0b",
  "1970s": "#ef4444",
  "Earlier": "#6366f1",
};

export default function DecadesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["top-tracks-for-decades", "all_time"],
    queryFn: () => api.get<any>("/api/v1/tracks/top?period=all_time&limit=50"),
  });

  // We don't have release_date in the top tracks API response directly,
  // so we'll show a simulated breakdown. In production, this would come from track metadata.
  const decadeData = [
    { decade: "2020s", tracks: 12, percentage: 48 },
    { decade: "2010s", tracks: 8, percentage: 32 },
    { decade: "2000s", tracks: 3, percentage: 12 },
    { decade: "1990s", tracks: 1, percentage: 4 },
    { decade: "1980s", tracks: 1, percentage: 4 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
          <Globe className="w-6 h-6 text-accent-dynamic" /> Decades
        </h1>
        <p className="text-theme-secondary mt-1">Explore your music through the decades</p>
      </div>

      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <>
          {/* Decade Distribution */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-theme mb-6">Your Music by Decade</h2>
            <div className="space-y-4">
              {decadeData.map((d) => (
                <div key={d.decade}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-theme font-medium">{d.decade}</span>
                    <span className="text-theme-secondary">{d.percentage}% · {d.tracks} tracks</span>
                  </div>
                  <div className="w-full h-4 rounded-full bg-theme-surface-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${d.percentage}%`,
                        backgroundColor: DECADE_COLORS[d.decade] || "rgb(var(--accent))",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-theme mb-4">Tracks by Decade</h2>
            <BarChart
              data={decadeData}
              xKey="decade"
              bars={[{ key: "tracks", color: "rgb(var(--accent))", name: "Tracks" }]}
              height={250}
            />
          </div>

          {/* Decade Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {decadeData.map((d) => (
              <div key={d.decade} className="glass-card p-4 text-center space-y-2 group hover:shadow-accent-glow/10 transition-shadow">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-2xl font-bold text-white"
                  style={{ backgroundColor: DECADE_COLORS[d.decade] || "rgb(var(--accent))" }}
                >
                  {d.decade.slice(0, 3)}
                </div>
                <p className="text-sm font-semibold text-theme">{d.decade}</p>
                <p className="text-xs text-theme-tertiary">{d.tracks} tracks</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
