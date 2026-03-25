"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Music, Users, Flame, Disc3, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { MetricCard } from "@/components/ui/metric-card";
import { TimeRangeSelector } from "@/components/ui/time-range-selector";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { TrackCard } from "@/components/music/track-card";
import { ArtistCard } from "@/components/music/artist-card";
import { BarChart } from "@/components/charts/bar-chart";
import { PieChart } from "@/components/charts/pie-chart";
import { CardSkeleton, ChartSkeleton, ListSkeleton } from "@/components/ui/loading-skeleton";

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  if (hours >= 24) return `${Math.round(hours / 24)}d ${hours % 24}h`;
  return `${hours}h ${Math.round((ms % 3600000) / 60000)}m`;
}

export default function DashboardPage() {
  const [period, setPeriod] = useState("all_time");
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

  const genrePieData = (data?.top_genres || []).slice(0, 8).map((g: any) => ({
    name: g.name,
    value: g.play_count,
  }));

  const hourlyData = (data?.hourly_distribution || []).map((h: any) => ({
    hour: `${h.hour.toString().padStart(2, "0")}:00`,
    plays: h.count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-white/50 mt-1">Your music at a glance</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <TimeRangeSelector value={period} onChange={setPeriod} />
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onClear={() => { setStartDate(""); setEndDate(""); }}
          />
        </div>
      </div>

      {/* Metric Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={Clock} label="Listening Time" value={formatDuration(data?.total_ms_played || 0)} subtitle={`${data?.total_hours || 0} hours total`} color="bg-accent-purple/20" />
          <MetricCard icon={Music} label="Tracks Played" value={(data?.total_tracks_played || 0).toLocaleString()} subtitle={`${data?.unique_tracks || 0} unique`} color="bg-spotify-green/20" />
          <MetricCard icon={Users} label="Artists" value={(data?.unique_artists || 0).toLocaleString()} subtitle={`${data?.unique_genres || 0} genres`} color="bg-accent-cyan/20" />
          <MetricCard icon={Flame} label="Day Streak" value={data?.listening_streak_days || 0} subtitle="consecutive days" color="bg-accent-amber/20" />
        </div>
      )}

      {/* Charts Row */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent-purple" /> Hourly Activity
            </h2>
            {hourlyData.length > 0 ? (
              <BarChart data={hourlyData} xKey="hour" bars={[{ key: "plays", color: "#a855f7" }]} height={250} />
            ) : (
              <p className="text-white/40 text-center py-12">No data yet</p>
            )}
          </div>
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Disc3 className="w-5 h-5 text-accent-cyan" /> Top Genres
            </h2>
            {genrePieData.length > 0 ? (
              <PieChart data={genrePieData} height={250} />
            ) : (
              <p className="text-white/40 text-center py-12">No data yet</p>
            )}
          </div>
        </div>
      )}

      {/* Top Lists */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card">
            <div className="p-4 border-b border-white/5">
              <h2 className="text-lg font-semibold text-white">Top Tracks</h2>
            </div>
            <div className="divide-y divide-white/5">
              {(data?.top_tracks || []).slice(0, 5).map((track: any, i: number) => (
                <TrackCard key={i} rank={track.rank} name={track.name?.split(" — ")[0]} artist={track.name?.split(" — ")[1] || ""} albumImageUrl={track.image_url} playCount={track.play_count} />
              ))}
              {(!data?.top_tracks || data.top_tracks.length === 0) && (
                <p className="p-6 text-center text-white/40">No tracks yet</p>
              )}
            </div>
          </div>
          <div className="glass-card">
            <div className="p-4 border-b border-white/5">
              <h2 className="text-lg font-semibold text-white">Top Artists</h2>
            </div>
            <div className="divide-y divide-white/5">
              {(data?.top_artists || []).slice(0, 5).map((artist: any, i: number) => (
                <ArtistCard key={i} rank={artist.rank} name={artist.name} imageUrl={artist.image_url} playCount={artist.play_count} />
              ))}
              {(!data?.top_artists || data.top_artists.length === 0) && (
                <p className="p-6 text-center text-white/40">No artists yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
