"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Clock, Disc3, Flame, Music, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { BarChart } from "@/components/charts/bar-chart";
import { PieChart } from "@/components/charts/pie-chart";
import { StreakCalendar } from "@/components/charts/streak-calendar";
import { AudioProfile } from "@/components/dashboard/audio-profile";
import { DiscoveryScore } from "@/components/dashboard/discovery-score";
import { RecentFeed } from "@/components/dashboard/recent-feed";
import { ArtistCard } from "@/components/music/artist-card";
import { TrackCard } from "@/components/music/track-card";
import { AnimatedCard, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { CardSkeleton, ChartSkeleton } from "@/components/ui/loading-skeleton";
import { MetricCard } from "@/components/ui/metric-card";
import { DEFAULT_PERIOD, TimeRangeSelector } from "@/components/ui/time-range-selector";
import { useIsMobile } from "@/hooks/useIsMobile";
import { api } from "@/lib/api";
import type {
  AnalyticsOverview,
  ArtistPlay,
  GenrePlay,
  HourlyDistribution,
  TrackPlay,
} from "@/lib/types";

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  if (hours >= 24) return `${Math.round(hours / 24)}d ${hours % 24}h`;
  return `${hours}h ${Math.round((ms % 3600000) / 60000)}m`;
}

export default function DashboardPage() {
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const isMobile = useIsMobile();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["analytics-overview", period, startDate, endDate],
    queryFn: () => {
      let url = `/api/v1/analytics/overview?period=${period}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      return api.get<AnalyticsOverview>(url);
    },
  });

  const genrePieData = (data?.top_genres || []).slice(0, 8).map((g: GenrePlay) => ({
    name: g.name,
    value: g.play_count ?? g.count,
  }));

  const hourlyData = (data?.hourly_distribution || []).map((h: HourlyDistribution) => ({
    hour: `${h.hour.toString().padStart(2, "0")}:00`,
    plays: h.count,
  }));

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Failed to load dashboard</h2>
        <p className="text-white/50 mb-4">Something went wrong fetching your data.</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
          type="button"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <FadeIn direction="none" duration={0.3}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-theme">Dashboard</h1>
            <p className="text-theme-secondary mt-1">Your music at a glance</p>
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
      </FadeIn>

      {/* Metric Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StaggerItem>
            <MetricCard
              icon={Clock}
              label="Listening Time"
              value={formatDuration(data?.total_ms_played || 0)}
              subtitle={`${data?.total_hours || 0} hours total`}
              color="bg-accent-purple/20"
            />
          </StaggerItem>
          <StaggerItem>
            <MetricCard
              icon={Music}
              label="Tracks Played"
              value={(data?.total_tracks_played || 0).toLocaleString()}
              subtitle={`${data?.unique_tracks || 0} unique`}
              color="bg-spotify-green/20"
            />
          </StaggerItem>
          <StaggerItem>
            <MetricCard
              icon={Users}
              label="Artists"
              value={(data?.unique_artists || 0).toLocaleString()}
              subtitle={`${data?.unique_genres || 0} genres`}
              color="bg-accent-cyan/20"
            />
          </StaggerItem>
          <StaggerItem>
            <MetricCard
              icon={Flame}
              label="Day Streak"
              value={data?.listening_streak_days || 0}
              subtitle="consecutive days"
              color="bg-accent-amber/20"
            />
          </StaggerItem>
        </StaggerContainer>
      )}

      {/* Charts Row */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StaggerItem>
            <AnimatedCard className="p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-theme mb-3 sm:mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent-purple" /> Hourly Activity
              </h2>
              {hourlyData.length > 0 ? (
                <BarChart
                  data={hourlyData}
                  xKey="hour"
                  bars={[{ key: "plays", color: "#a855f7" }]}
                  height={isMobile ? 200 : 250}
                />
              ) : (
                <p className="text-theme-tertiary text-center py-12">No data yet</p>
              )}
            </AnimatedCard>
          </StaggerItem>
          <StaggerItem>
            <AnimatedCard className="p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-theme mb-3 sm:mb-4 flex items-center gap-2">
                <Disc3 className="w-5 h-5 text-accent-cyan" /> Top Genres
              </h2>
              {genrePieData.length > 0 ? (
                <PieChart
                  data={genrePieData}
                  height={isMobile ? 280 : 250}
                  innerRadius={isMobile ? 45 : 60}
                />
              ) : (
                <p className="text-theme-tertiary text-center py-12">No data yet</p>
              )}
            </AnimatedCard>
          </StaggerItem>
        </StaggerContainer>
      )}

      {/* Audio Profile + Streak + Discovery */}
      {!isLoading && (
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <StaggerItem>
            <AudioProfile features={data?.avg_audio_features || null} />
          </StaggerItem>
          <StaggerItem>
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-theme mb-4">Listening Activity</h2>
              <StreakCalendar data={{}} weeks={16} />
              <p className="text-xs text-theme-tertiary text-center mt-3">
                Streak data populates as you listen
              </p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <DiscoveryScore
              uniqueTracks={data?.unique_tracks || 0}
              totalPlays={data?.total_tracks_played || 0}
              uniqueArtists={data?.unique_artists || 0}
              uniqueGenres={data?.unique_genres || 0}
            />
          </StaggerItem>
        </StaggerContainer>
      )}

      {/* Top Lists */}
      {!isLoading && (
        <StaggerContainer className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <StaggerItem>
            <AnimatedCard>
              <div className="p-4 border-b border-current/[0.08]">
                <h2 className="text-lg font-semibold text-theme">Top Tracks</h2>
              </div>
              <div className="divide-y divide-current/[0.08]">
                {(data?.top_tracks || []).slice(0, 5).map((track: TrackPlay, i: number) => (
                  <TrackCard
                    key={i}
                    rank={track.rank}
                    name={track.name?.split(" — ")[0]}
                    artist={track.name?.split(" — ")[1] || ""}
                    albumImageUrl={track.image_url}
                    playCount={track.play_count}
                  />
                ))}
                {(!data?.top_tracks || data.top_tracks.length === 0) && (
                  <p className="p-6 text-center text-theme-tertiary">No tracks yet</p>
                )}
              </div>
            </AnimatedCard>
          </StaggerItem>
          <StaggerItem>
            <AnimatedCard>
              <div className="p-4 border-b border-current/[0.08]">
                <h2 className="text-lg font-semibold text-theme">Top Artists</h2>
              </div>
              <div className="divide-y divide-current/[0.08]">
                {(data?.top_artists || []).slice(0, 5).map((artist: ArtistPlay, i: number) => (
                  <ArtistCard
                    key={i}
                    rank={artist.rank}
                    name={artist.name}
                    imageUrl={artist.image_url}
                    playCount={artist.play_count}
                  />
                ))}
                {(!data?.top_artists || data.top_artists.length === 0) && (
                  <p className="p-6 text-center text-theme-tertiary">No artists yet</p>
                )}
              </div>
            </AnimatedCard>
          </StaggerItem>
          <StaggerItem>
            <RecentFeed />
          </StaggerItem>
        </StaggerContainer>
      )}
    </div>
  );
}
