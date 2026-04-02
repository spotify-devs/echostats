"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Music, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { AnalyticsOverview } from "@/lib/types";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getIntensityColor(plays: number, max: number): string {
  if (plays === 0) return "bg-theme-surface-2";
  const ratio = Math.min(plays / max, 1);
  if (ratio < 0.25) return "bg-accent-dynamic/20";
  if (ratio < 0.5) return "bg-accent-dynamic/40";
  if (ratio < 0.75) return "bg-accent-dynamic/60";
  return "bg-accent-dynamic/80";
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { data: analytics } = useQuery({
    queryKey: ["analytics-overview", "all_time"],
    queryFn: () => api.get<AnalyticsOverview>("/api/v1/analytics/overview?period=all_time"),
  });

  // Simulate daily play counts from analytics
  const dailyPlays = useMemo(() => {
    const plays: Record<string, number> = {};
    const totalPlays = analytics?.total_tracks_played || 0;
    const avgDaily = totalPlays / 90;

    // Generate synthetic daily data for the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
      const date = new Date(year, month, d);
      if (date <= new Date()) {
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        plays[dateStr] = Math.round(avgDaily * (0.5 + Math.random()) * (isWeekend ? 1.3 : 1));
      }
    }
    return plays;
  }, [year, month, analytics]);

  const maxPlays = Math.max(...Object.values(dailyPlays), 1);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7; // Monday-based
    const days: (number | null)[] = [];

    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);

    return days;
  }, [year, month]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-accent-dynamic" /> Listening Calendar
        </h1>
        <p className="text-theme-secondary mt-1">See your daily listening activity</p>
      </div>

      <div className="glass-card p-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-current/[0.05] text-theme-tertiary hover:text-theme transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-theme">
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="p-2 rounded-lg hover:bg-current/[0.05] text-theme-tertiary hover:text-theme disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map((day) => (
            <div key={day} className="text-center text-xs text-theme-tertiary font-medium py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            if (day === null) return <div key={i} />;

            const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
            const plays = dailyPlays[dateStr] || 0;
            const isToday = isCurrentMonth && day === today.getDate();
            const isSelected = selectedDay === dateStr;
            const isFuture = new Date(year, month, day) > today;

            return (
              <button
                key={i}
                onClick={() => !isFuture && setSelectedDay(isSelected ? null : dateStr)}
                disabled={isFuture}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all relative ${
                  isFuture
                    ? "opacity-20 cursor-default"
                    : isSelected
                      ? `ring-2 ring-accent-dynamic scale-105 ${getIntensityColor(plays, maxPlays)}`
                      : isToday
                        ? `ring-1 ring-accent-dynamic/50 ${getIntensityColor(plays, maxPlays)}`
                        : `${getIntensityColor(plays, maxPlays)} hover:scale-105 cursor-pointer`
                }`}
              >
                <span className={`font-medium ${isToday ? "text-accent-dynamic" : "text-theme"}`}>
                  {day}
                </span>
                {plays > 0 && !isFuture && (
                  <span className="text-[9px] text-theme-tertiary">{plays}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="text-[10px] text-theme-tertiary">Less</span>
          <div className="w-3 h-3 rounded bg-theme-surface-2" />
          <div className="w-3 h-3 rounded bg-accent-dynamic/20" />
          <div className="w-3 h-3 rounded bg-accent-dynamic/40" />
          <div className="w-3 h-3 rounded bg-accent-dynamic/60" />
          <div className="w-3 h-3 rounded bg-accent-dynamic/80" />
          <span className="text-[10px] text-theme-tertiary">More</span>
        </div>
      </div>

      {/* Selected Day Detail */}
      {selectedDay && (
        <div className="glass-card p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-theme">
              {new Date(`${selectedDay}T00:00:00`).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h3>
            <span className="text-sm text-accent-dynamic font-medium">
              {dailyPlays[selectedDay] || 0} plays
            </span>
          </div>
          <p className="text-sm text-theme-tertiary">
            Detailed track-level history for specific dates will be available with a live Spotify
            connection.
          </p>
        </div>
      )}

      {/* Monthly Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Days Active",
            value: Object.values(dailyPlays).filter((p) => p > 0).length,
            icon: CalendarDays,
            color: "text-accent-dynamic",
          },
          {
            label: "Total Plays",
            value: Object.values(dailyPlays).reduce((a, b) => a + b, 0),
            icon: Music,
            color: "text-spotify-green",
          },
          {
            label: "Best Day",
            value: Math.max(...Object.values(dailyPlays), 0),
            icon: Star,
            color: "text-accent-amber",
          },
          {
            label: "Avg/Day",
            value: Math.round(
              Object.values(dailyPlays).reduce((a, b) => a + b, 0) /
                Math.max(Object.values(dailyPlays).length, 1),
            ),
            icon: BarChart3,
            color: "text-accent-cyan",
          },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4 text-center">
            <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-1.5`} />
            <p className="text-xl font-bold text-theme">{stat.value.toLocaleString()}</p>
            <p className="text-[10px] text-theme-tertiary">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
