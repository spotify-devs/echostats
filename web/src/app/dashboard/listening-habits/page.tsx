"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Moon, Sun, Sunrise, Sunset } from "lucide-react";
import { BarChart } from "@/components/charts/bar-chart";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";
import { api } from "@/lib/api";

const TIME_SLOTS = [
  {
    label: "Early Bird",
    range: "5AM – 9AM",
    hours: [5, 6, 7, 8],
    icon: Sunrise,
    color: "#f59e0b",
    emoji: "🌅",
  },
  {
    label: "Daytime",
    range: "9AM – 5PM",
    hours: [9, 10, 11, 12, 13, 14, 15, 16],
    icon: Sun,
    color: "#ef4444",
    emoji: "☀️",
  },
  {
    label: "Evening",
    range: "5PM – 10PM",
    hours: [17, 18, 19, 20, 21],
    icon: Sunset,
    color: "#a855f7",
    emoji: "🌆",
  },
  {
    label: "Night Owl",
    range: "10PM – 5AM",
    hours: [22, 23, 0, 1, 2, 3, 4],
    icon: Moon,
    color: "#06b6d4",
    emoji: "🌙",
  },
];

export default function ListeningHabitsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-overview", "all_time"],
    queryFn: () => api.get<any>("/api/v1/analytics/overview?period=all_time"),
  });

  const hourlyDist = data?.hourly_distribution || [];
  const dailyDist = data?.daily_distribution || [];

  // Calculate time slot totals
  const slotData = TIME_SLOTS.map((slot) => {
    const total = hourlyDist
      .filter((h: any) => slot.hours.includes(h.hour))
      .reduce((sum: number, h: any) => sum + h.count, 0);
    const totalMs = hourlyDist
      .filter((h: any) => slot.hours.includes(h.hour))
      .reduce((sum: number, h: any) => sum + h.total_ms, 0);
    return { ...slot, plays: total, hours: Math.round((totalMs / 3600000) * 10) / 10 };
  });

  const totalPlays = slotData.reduce((sum, s) => sum + s.plays, 0);
  const peakSlot = slotData.reduce((max, s) => (s.plays > max.plays ? s : max), slotData[0]);

  const hourlyData = hourlyDist.map((h: any) => ({
    hour: `${h.hour.toString().padStart(2, "0")}`,
    plays: h.count,
  }));

  const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const dailyData = dailyDist.map((d: any) => ({
    day: DAY_NAMES[d.day]?.slice(0, 3) || "",
    plays: d.count,
    hours: Math.round((d.total_ms / 3600000) * 10) / 10,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center gap-2">
          <Activity className="w-6 h-6 text-accent-dynamic" /> Listening Habits
        </h1>
        <p className="text-theme-secondary mt-1">When and how you listen to music</p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <>
          {/* Your Listening Personality */}
          {peakSlot && (
            <div className="glass-card p-5 sm:p-8 text-center bg-gradient-to-br from-accent-dynamic/5 to-transparent">
              <span className="text-5xl mb-3 block">{peakSlot.emoji}</span>
              <h2 className="text-2xl font-bold text-theme mb-1">You&apos;re a {peakSlot.label}</h2>
              <p className="text-theme-secondary">
                Most of your listening happens between {peakSlot.range}
              </p>
            </div>
          )}

          {/* Time Slot Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {slotData.map((slot) => {
              const percentage = totalPlays > 0 ? Math.round((slot.plays / totalPlays) * 100) : 0;
              const Icon = slot.icon;
              const isPeak = slot === peakSlot;
              return (
                <div
                  key={slot.label}
                  className={`glass-card p-5 space-y-3 ${isPeak ? "ring-1 ring-accent-dynamic/30" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className="w-5 h-5" style={{ color: slot.color }} />
                    {isPeak && (
                      <span className="text-[10px] text-accent-dynamic bg-accent-dynamic/15 px-2 py-0.5 rounded-full">
                        Peak
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-theme">{slot.label}</p>
                    <p className="text-[10px] text-theme-tertiary">{slot.range}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-theme">{percentage}%</p>
                    <p className="text-xs text-theme-tertiary">
                      {slot.plays.toLocaleString()} plays · {slot.hours}h
                    </p>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-theme-surface-3 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${percentage}%`, backgroundColor: slot.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hourly Distribution */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-theme mb-4">Plays by Hour</h2>
            <BarChart
              data={hourlyData}
              xKey="hour"
              bars={[{ key: "plays", color: "rgb(var(--accent))" }]}
              height={220}
            />
          </div>

          {/* Daily Distribution */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-theme mb-4">Plays by Day of Week</h2>
            <BarChart
              data={dailyData}
              xKey="day"
              bars={[{ key: "plays", color: "#10b981", name: "Plays" }]}
              height={220}
            />
          </div>
        </>
      )}
    </div>
  );
}
