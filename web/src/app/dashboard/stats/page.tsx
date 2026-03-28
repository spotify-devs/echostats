"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Calendar,
  Clock,
  Disc3,
  Headphones,
  Music,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import { BarChart } from "@/components/charts/bar-chart";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { CardSkeleton, ChartSkeleton } from "@/components/ui/loading-skeleton";
import { TimeRangeSelector } from "@/components/ui/time-range-selector";
import { api } from "@/lib/api";

function StatRow({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-current/[0.08] last:border-0">
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-lg ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm text-theme-secondary">{label}</span>
      </div>
      <span className="text-sm font-semibold text-theme tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
    </div>
  );
}

export default function DeepStatsPage() {
  const [period, setPeriod] = useState("week");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-overview", period, startDate, endDate],
    queryFn: () => {
      let url = `/api/v1/analytics/overview?period=${period}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      return api.get<any>(url);
    },
  });

  const hours = data?.total_hours || 0;
  const avgPerDay =
    hours > 0
      ? (
          hours / (period === "week" ? 7 : period === "month" ? 30 : period === "year" ? 365 : 90)
        ).toFixed(1)
      : "0";
  const avgTrackLen = data?.total_tracks_played
    ? Math.round(data.total_ms_played / data.total_tracks_played / 1000)
    : 0;
  const avgTrackMin = Math.floor(avgTrackLen / 60);
  const avgTrackSec = avgTrackLen % 60;
  const tracksPerDay = data?.total_tracks_played
    ? (
        data.total_tracks_played /
        (period === "week" ? 7 : period === "month" ? 30 : period === "year" ? 365 : 90)
      ).toFixed(0)
    : "0";

  const dailyData = (data?.daily_distribution || []).map((d: any) => ({
    day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d.day] || `Day ${d.day}`,
    hours: Math.round((d.total_ms / 3600000) * 10) / 10,
    plays: d.count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center gap-2">
            <Activity className="w-6 h-6 text-accent-dynamic" /> Deep Stats
          </h1>
          <p className="text-theme-secondary mt-1">Detailed breakdown of your listening</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <TimeRangeSelector value={period} onChange={setPeriod} />
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onClear={() => {
              setStartDate("");
              setEndDate("");
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <ChartSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <>
          <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Listening Summary */}
            <StaggerItem>
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-theme mb-4">Listening Summary</h2>
                <StatRow
                  icon={Clock}
                  label="Total Listening Time"
                  value={`${hours} hours`}
                  color="bg-accent-purple/20"
                />
                <StatRow
                  icon={Headphones}
                  label="Average Per Day"
                  value={`${avgPerDay} hours`}
                  color="bg-accent-cyan/20"
                />
                <StatRow
                  icon={Music}
                  label="Total Tracks Played"
                  value={data?.total_tracks_played || 0}
                  color="bg-spotify-green/20"
                />
                <StatRow
                  icon={TrendingUp}
                  label="Tracks Per Day"
                  value={tracksPerDay}
                  color="bg-accent-amber/20"
                />
                <StatRow
                  icon={Clock}
                  label="Avg Track Length"
                  value={`${avgTrackMin}:${avgTrackSec.toString().padStart(2, "0")}`}
                  color="bg-accent-pink/20"
                />
              </div>
            </StaggerItem>

            {/* Diversity Stats */}
            <StaggerItem>
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-theme mb-4">Diversity</h2>
                <StatRow
                  icon={Music}
                  label="Unique Tracks"
                  value={data?.unique_tracks || 0}
                  color="bg-accent-purple/20"
                />
                <StatRow
                  icon={Users}
                  label="Unique Artists"
                  value={data?.unique_artists || 0}
                  color="bg-spotify-green/20"
                />
                <StatRow
                  icon={Disc3}
                  label="Unique Albums"
                  value={data?.unique_albums || 0}
                  color="bg-accent-cyan/20"
                />
                <StatRow
                  icon={Disc3}
                  label="Unique Genres"
                  value={data?.unique_genres || 0}
                  color="bg-accent-pink/20"
                />
                <StatRow
                  icon={Calendar}
                  label="Listening Streak"
                  value={`${data?.listening_streak_days || 0} days`}
                  color="bg-accent-amber/20"
                />
              </div>
            </StaggerItem>
          </StaggerContainer>

          {/* Weekly breakdown */}
          <FadeIn delay={0.2}>
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-theme mb-4">Listening by Day of Week</h2>
              {dailyData.length > 0 ? (
                <BarChart
                  data={dailyData}
                  xKey="day"
                  bars={[{ key: "hours", color: "rgb(var(--accent))", name: "Hours" }]}
                  height={250}
                />
              ) : (
                <p className="text-theme-tertiary text-center py-12">No data available</p>
              )}
            </div>
          </FadeIn>

          {/* Fun Facts */}
          <FadeIn delay={0.35}>
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-theme mb-4">🎉 Fun Facts</h2>
              <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StaggerItem>
                  <div className="p-4 rounded-xl bg-theme-surface-2 text-center">
                    <p className="text-3xl mb-1">🎧</p>
                    <p className="text-sm text-theme-secondary">You've listened to</p>
                    <p className="text-xl font-bold text-theme">
                      {Math.round(hours * 60).toLocaleString()} minutes
                    </p>
                    <p className="text-xs text-theme-tertiary">of music</p>
                  </div>
                </StaggerItem>
                <StaggerItem>
                  <div className="p-4 rounded-xl bg-theme-surface-2 text-center">
                    <p className="text-3xl mb-1">🌍</p>
                    <p className="text-sm text-theme-secondary">That's equivalent to</p>
                    <p className="text-xl font-bold text-theme">{(hours / 24).toFixed(1)}</p>
                    <p className="text-xs text-theme-tertiary">full days non-stop</p>
                  </div>
                </StaggerItem>
                <StaggerItem>
                  <div className="p-4 rounded-xl bg-theme-surface-2 text-center">
                    <p className="text-3xl mb-1">🔄</p>
                    <p className="text-sm text-theme-secondary">Repeat ratio</p>
                    <p className="text-xl font-bold text-theme">
                      {data?.total_tracks_played && data?.unique_tracks
                        ? (data.total_tracks_played / data.unique_tracks).toFixed(1)
                        : "0"}
                      x
                    </p>
                    <p className="text-xs text-theme-tertiary">plays per unique track</p>
                  </div>
                </StaggerItem>
              </StaggerContainer>
            </div>
          </FadeIn>
        </>
      )}
    </div>
  );
}
