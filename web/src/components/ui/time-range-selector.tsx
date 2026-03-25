"use client";

import { useState } from "react";

const TIME_RANGES = [
  { value: "week", label: "7 Days" },
  { value: "month", label: "30 Days" },
  { value: "quarter", label: "90 Days" },
  { value: "year", label: "1 Year" },
  { value: "all_time", label: "All Time" },
];

interface TimeRangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-white/5">
      {TIME_RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            value === range.value
              ? "bg-accent-purple/20 text-accent-purple"
              : "text-white/40 hover:text-white/60 hover:bg-white/5"
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
