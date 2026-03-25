"use client";

import { useMemo } from "react";

interface StreakCalendarProps {
  data: Record<string, number>; // { "2026-01-15": 23, ... } date -> play count
  weeks?: number;
}

const DAYS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

function getIntensity(count: number, max: number): string {
  if (count === 0) return "rgb(var(--surface-3))";
  const ratio = Math.min(count / max, 1);
  const opacity = 0.2 + ratio * 0.8;
  return `rgb(var(--accent) / ${opacity})`;
}

export function StreakCalendar({ data, weeks = 20 }: StreakCalendarProps) {
  const { grid, months, maxCount } = useMemo(() => {
    const today = new Date();
    const grid: { date: string; count: number; day: number }[][] = [];
    const months: { label: string; col: number }[] = [];
    let maxCount = 1;

    // Build grid from right (today) to left
    const totalDays = weeks * 7;
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - totalDays + 1);

    // Align to Monday
    const dayOfWeek = startDate.getDay();
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(startDate.getDate() - offset);

    let currentWeek: { date: string; count: number; day: number }[] = [];
    let lastMonth = -1;
    const d = new Date(startDate);

    while (d <= today || currentWeek.length > 0) {
      const dateStr = d.toISOString().split("T")[0];
      const count = data[dateStr] || 0;
      if (count > maxCount) maxCount = count;

      const month = d.getMonth();
      if (month !== lastMonth && currentWeek.length === 0) {
        months.push({
          label: d.toLocaleDateString("en-US", { month: "short" }),
          col: grid.length,
        });
        lastMonth = month;
      }

      currentWeek.push({ date: dateStr, count, day: d.getDay() });

      if (currentWeek.length === 7) {
        grid.push(currentWeek);
        currentWeek = [];
      }

      d.setDate(d.getDate() + 1);
      if (d > today && currentWeek.length === 0) break;
    }

    if (currentWeek.length > 0) {
      grid.push(currentWeek);
    }

    return { grid, months, maxCount };
  }, [data, weeks]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-fit">
        {/* Month labels */}
        <div className="flex ml-8 mb-1">
          {months.map((m, i) => (
            <div
              key={i}
              className="text-[10px] text-theme-tertiary"
              style={{ marginLeft: i === 0 ? `${m.col * 14}px` : `${(m.col - (months[i - 1]?.col || 0)) * 14 - 24}px` }}
            >
              {m.label}
            </div>
          ))}
        </div>

        <div className="flex gap-0.5">
          {/* Day labels */}
          <div className="flex flex-col gap-0.5 mr-1">
            {DAYS.map((day, i) => (
              <div key={i} className="h-[12px] w-6 text-[9px] text-theme-tertiary flex items-center justify-end pr-1">
                {day}
              </div>
            ))}
          </div>

          {/* Grid */}
          {grid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.map((cell, di) => (
                <div
                  key={di}
                  className="w-[12px] h-[12px] rounded-[2px] transition-colors cursor-pointer hover:ring-1 hover:ring-white/30"
                  style={{ backgroundColor: getIntensity(cell.count, maxCount) }}
                  title={`${cell.date}: ${cell.count} plays`}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 ml-8">
          <span className="text-[10px] text-theme-tertiary">Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <div
              key={i}
              className="w-[12px] h-[12px] rounded-[2px]"
              style={{
                backgroundColor: ratio === 0
                  ? "rgb(var(--surface-3))"
                  : `rgb(var(--accent) / ${0.2 + ratio * 0.8})`,
              }}
            />
          ))}
          <span className="text-[10px] text-theme-tertiary">More</span>
        </div>
      </div>
    </div>
  );
}
