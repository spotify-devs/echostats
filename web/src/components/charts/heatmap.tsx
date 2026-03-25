"use client";

interface HeatmapProps {
  data: { day: number; hour: number; value: number }[];
  maxValue?: number;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getColor(value: number, max: number): string {
  if (value === 0) return "rgba(255,255,255,0.03)";
  const intensity = Math.min(value / max, 1);
  const r = Math.round(88 + intensity * 80);
  const g = Math.round(28 + intensity * 57);
  const b = Math.round(135 + intensity * 112);
  return `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.7})`;
}

export function Heatmap({ data, maxValue }: HeatmapProps) {
  const dataMap = new Map(data.map((d) => [`${d.day}-${d.hour}`, d.value]));
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Hour labels */}
        <div className="flex ml-12 mb-1">
          {HOURS.filter((h) => h % 3 === 0).map((h) => (
            <div key={h} className="text-xs text-white/30" style={{ width: `${100 / 8}%` }}>
              {h.toString().padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Grid */}
        {DAYS.map((day, dayIdx) => (
          <div key={day} className="flex items-center gap-1 mb-1">
            <span className="w-10 text-xs text-white/40 text-right">{day}</span>
            <div className="flex-1 flex gap-[2px]">
              {HOURS.map((hour) => {
                const value = dataMap.get(`${dayIdx}-${hour}`) || 0;
                return (
                  <div
                    key={hour}
                    className="flex-1 h-6 rounded-sm transition-colors cursor-pointer hover:ring-1 hover:ring-white/30"
                    style={{ backgroundColor: getColor(value, max) }}
                    title={`${day} ${hour}:00 — ${value} plays`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
