"use client";

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
    <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-current/[0.08]">
      {TIME_RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            value === range.value
              ? "bg-accent-purple/20 text-accent-purple"
              : "text-theme-tertiary hover:text-theme-secondary hover:bg-current/[0.05]"
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
