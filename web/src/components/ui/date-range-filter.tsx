"use client";

import { Calendar, ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onClear?: () => void;
}

const PRESETS = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 6 months", days: 180 },
  { label: "Last year", days: 365 },
  { label: "All time", days: -1 },
];

function formatForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
}: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const applyPreset = (days: number) => {
    if (days === -1) {
      onStartDateChange("");
      onEndDateChange("");
    } else {
      const end = new Date();
      const start = new Date();
      if (days > 0) start.setDate(start.getDate() - days);
      onStartDateChange(formatForInput(start));
      onEndDateChange(formatForInput(end));
    }
    setOpen(false);
  };

  const hasFilter = startDate || endDate;

  const displayLabel = () => {
    if (!hasFilter) return "All time";
    if (startDate && endDate) {
      return `${new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    if (startDate)
      return `From ${new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    if (endDate)
      return `Until ${new Date(endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    return "All time";
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-xl border transition-all ${
          hasFilter
            ? "border-accent-dynamic/50 bg-accent-dynamic/15 text-accent-dynamic"
            : "border-current/[0.1] bg-theme-surface-2 text-theme-secondary hover:border-current/[0.2]"
        }`}
      >
        <Calendar className="w-4 h-4" />
        <span>{displayLabel()}</span>
        {hasFilter && onClear ? (
          <X
            className="w-3.5 h-3.5 hover:text-theme"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          />
        ) : (
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 glass-card p-4 space-y-4 animate-scale-in">
          {/* Presets */}
          <div className="space-y-1">
            <p className="text-xs text-theme-tertiary font-medium uppercase tracking-wider mb-2">
              Quick Select
            </p>
            <div className="grid grid-cols-2 gap-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset.days)}
                  className="px-3 py-1.5 text-xs text-left rounded-lg text-theme-secondary hover:bg-current/[0.05] hover:text-theme transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom range */}
          <div className="border-t border-current/[0.08] pt-3 space-y-3">
            <p className="text-xs text-theme-tertiary font-medium uppercase tracking-wider">
              Custom Range
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-theme-tertiary uppercase">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="w-full mt-1 px-2 py-1.5 text-xs rounded-lg bg-theme-surface-2 border border-current/[0.1] text-theme focus:border-accent-dynamic/50 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] text-theme-tertiary uppercase">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="w-full mt-1 px-2 py-1.5 text-xs rounded-lg bg-theme-surface-2 border border-current/[0.1] text-theme focus:border-accent-dynamic/50 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Apply / Clear */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 px-3 py-1.5 text-xs btn-primary"
            >
              Apply
            </button>
            {hasFilter && (
              <button
                onClick={() => {
                  onStartDateChange("");
                  onEndDateChange("");
                  setOpen(false);
                }}
                className="px-3 py-1.5 text-xs rounded-lg border border-current/[0.1] text-theme-secondary hover:bg-current/[0.05] transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
