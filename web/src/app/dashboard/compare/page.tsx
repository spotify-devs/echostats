"use client";

import { useQuery } from "@tanstack/react-query";
import { GitCompare, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";
import { api } from "@/lib/api";

const PERIODS = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "all_time", label: "All Time" },
];

function CompareRow({
  label,
  left,
  right,
  unit,
}: {
  label: string;
  left: number;
  right: number;
  unit?: string;
}) {
  const diff = left - right;
  const pct = right > 0 ? Math.round((diff / right) * 100) : 0;
  return (
    <div className="flex items-center py-3 border-b border-white/5 last:border-0">
      <span className="flex-1 text-sm text-theme-secondary">{label}</span>
      <span className="w-24 text-right text-sm font-semibold text-theme tabular-nums">
        {left.toLocaleString()}
        {unit}
      </span>
      <div className="w-20 text-center">
        {diff > 0 ? (
          <span className="inline-flex items-center gap-0.5 text-xs text-emerald-400">
            <TrendingUp className="w-3 h-3" /> +{pct}%
          </span>
        ) : diff < 0 ? (
          <span className="inline-flex items-center gap-0.5 text-xs text-red-400">
            <TrendingDown className="w-3 h-3" /> {pct}%
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 text-xs text-theme-tertiary">
            <Minus className="w-3 h-3" /> 0%
          </span>
        )}
      </div>
      <span className="w-24 text-right text-sm text-theme-tertiary tabular-nums">
        {right.toLocaleString()}
        {unit}
      </span>
    </div>
  );
}

export default function ComparePage() {
  const [periodA, setPeriodA] = useState("month");
  const [periodB, setPeriodB] = useState("year");

  const { data: dataA, isLoading: loadingA } = useQuery({
    queryKey: ["analytics-overview", periodA],
    queryFn: () => api.get<any>(`/api/v1/analytics/overview?period=${periodA}`),
  });

  const { data: dataB, isLoading: loadingB } = useQuery({
    queryKey: ["analytics-overview", periodB],
    queryFn: () => api.get<any>(`/api/v1/analytics/overview?period=${periodB}`),
  });

  const isLoading = loadingA || loadingB;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center gap-2">
          <GitCompare className="w-6 h-6 text-accent-dynamic" /> Compare Periods
        </h1>
        <p className="text-theme-secondary mt-1">See how your listening changes over time</p>
      </div>

      {/* Period selectors */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 w-full">
          <label className="text-xs text-theme-tertiary uppercase tracking-wider mb-2 block">
            Period A
          </label>
          <select
            value={periodA}
            onChange={(e) => setPeriodA(e.target.value)}
            className="w-full px-4 py-2.5 bg-theme-surface-2 border border-white/10 rounded-xl text-sm text-theme focus:outline-none focus:border-accent-dynamic/50"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <GitCompare className="w-6 h-6 text-theme-tertiary mt-5" />
        <div className="flex-1 w-full">
          <label className="text-xs text-theme-tertiary uppercase tracking-wider mb-2 block">
            Period B
          </label>
          <select
            value={periodB}
            onChange={(e) => setPeriodB(e.target.value)}
            className="w-full px-4 py-2.5 bg-theme-surface-2 border border-white/10 rounded-xl text-sm text-theme focus:outline-none focus:border-accent-dynamic/50"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <div className="glass-card p-6">
          {/* Header */}
          <div className="flex items-center py-2 mb-2">
            <span className="flex-1" />
            <span className="w-24 text-right text-xs text-accent-dynamic font-medium uppercase">
              {PERIODS.find((p) => p.value === periodA)?.label}
            </span>
            <span className="w-20 text-center text-xs text-theme-tertiary">Change</span>
            <span className="w-24 text-right text-xs text-theme-tertiary font-medium uppercase">
              {PERIODS.find((p) => p.value === periodB)?.label}
            </span>
          </div>

          <CompareRow
            label="Tracks Played"
            left={dataA?.total_tracks_played || 0}
            right={dataB?.total_tracks_played || 0}
          />
          <CompareRow
            label="Listening Hours"
            left={dataA?.total_hours || 0}
            right={dataB?.total_hours || 0}
            unit="h"
          />
          <CompareRow
            label="Unique Tracks"
            left={dataA?.unique_tracks || 0}
            right={dataB?.unique_tracks || 0}
          />
          <CompareRow
            label="Unique Artists"
            left={dataA?.unique_artists || 0}
            right={dataB?.unique_artists || 0}
          />
          <CompareRow
            label="Unique Genres"
            left={dataA?.unique_genres || 0}
            right={dataB?.unique_genres || 0}
          />
          <CompareRow
            label="Day Streak"
            left={dataA?.listening_streak_days || 0}
            right={dataB?.listening_streak_days || 0}
            unit="d"
          />
        </div>
      )}
    </div>
  );
}
