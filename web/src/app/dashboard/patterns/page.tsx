"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { api } from "@/lib/api";
import { Heatmap } from "@/components/charts/heatmap";
import { BarChart } from "@/components/charts/bar-chart";
import { TimeRangeSelector } from "@/components/ui/time-range-selector";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function PatternsPage() {
  const [period, setPeriod] = useState("all_time");

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-overview", period],
    queryFn: () => api.get<any>(`/api/v1/analytics/overview?period=${period}`),
  });

  // Build heatmap data from hourly + daily distributions
  const heatmapData: { day: number; hour: number; value: number }[] = [];
  if (data?.hourly_distribution && data?.daily_distribution) {
    for (let day = 0; day < 7; day++) {
      const dayData = data.daily_distribution.find((d: any) => d.day === day);
      for (let hour = 0; hour < 24; hour++) {
        const hourData = data.hourly_distribution.find((h: any) => h.hour === hour);
        // Approximate: spread daily counts across hours proportionally
        const value = dayData && hourData ? Math.round((dayData.count * hourData.count) / Math.max(data.total_tracks_played, 1)) : 0;
        heatmapData.push({ day, hour, value });
      }
    }
  }

  const hourlyData = (data?.hourly_distribution || []).map((h: any) => ({
    hour: `${h.hour.toString().padStart(2, "0")}:00`,
    plays: h.count,
    minutes: Math.round(h.total_ms / 60000),
  }));

  const dailyData = (data?.daily_distribution || []).map((d: any) => ({
    day: DAY_NAMES[d.day] || `Day ${d.day}`,
    plays: d.count,
    hours: Math.round(d.total_ms / 3600000 * 10) / 10,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-accent-pink" /> Listening Patterns
          </h1>
          <p className="text-white/50 mt-1">When do you listen to music?</p>
        </div>
        <TimeRangeSelector value={period} onChange={setPeriod} />
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <ChartSkeleton height={200} />
          <ChartSkeleton />
        </div>
      ) : (
        <>
          {/* Heatmap */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Activity Heatmap</h2>
            {heatmapData.length > 0 ? (
              <Heatmap data={heatmapData} />
            ) : (
              <p className="text-white/40 text-center py-8">Not enough data for heatmap</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hourly distribution */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">By Hour of Day</h2>
              <BarChart
                data={hourlyData}
                xKey="hour"
                bars={[{ key: "plays", color: "#a855f7", name: "Plays" }]}
                height={250}
              />
            </div>

            {/* Daily distribution */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">By Day of Week</h2>
              <BarChart
                data={dailyData}
                xKey="day"
                bars={[{ key: "plays", color: "#ec4899", name: "Plays" }]}
                height={250}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
