"use client";

import { useQuery } from "@tanstack/react-query";
import { Disc3, Flame, Music, Star, Trophy, Users } from "lucide-react";
import Image from "next/image";
import { BarChart } from "@/components/charts/bar-chart";
import { PieChart } from "@/components/charts/pie-chart";
import { ArtistMonogram } from "@/components/music/artist-monogram";
import { CardSkeleton, ChartSkeleton } from "@/components/ui/loading-skeleton";
import { api } from "@/lib/api";

export default function YearInReviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-overview", "year"],
    queryFn: () => api.get<any>("/api/v1/analytics/overview?period=year"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <CardSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  const hours = data?.total_hours || 0;
  const topArtist = data?.top_artists?.[0];
  const topTrack = data?.top_tracks?.[0];
  const topGenre = data?.top_genres?.[0];
  const streak = data?.listening_streak_days || 0;

  const genrePie = (data?.top_genres || []).slice(0, 6).map((g: any) => ({
    name: g.name,
    value: g.play_count,
  }));

  const topArtists5 = (data?.top_artists || []).slice(0, 5).map((a: any) => ({
    name: a.name,
    plays: a.play_count,
  }));

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="text-center space-y-4 pt-8">
        <div className="inline-flex p-4 rounded-3xl bg-accent-dynamic/15 shadow-accent-glow">
          <Star className="w-10 h-10 text-accent-dynamic" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold text-theme">Your Year in Music</h1>
        <p className="text-theme-secondary">A look back at your listening journey</p>
      </div>

      {/* Hero Stats */}
      <div className="glass-card p-5 sm:p-8 text-center space-y-2 bg-gradient-to-br from-accent-dynamic/5 to-transparent">
        <p className="text-6xl font-bold text-gradient tabular-nums">{hours.toLocaleString()}</p>
        <p className="text-xl text-theme-secondary">hours of music</p>
        <p className="text-sm text-theme-tertiary">
          That&apos;s {Math.round(hours / 24)} full days of non-stop listening
        </p>
      </div>

      {/* Big 3 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* #1 Artist */}
        <div className="glass-card p-6 text-center space-y-3">
          <Trophy className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-xs text-theme-tertiary uppercase tracking-wider">#1 Artist</p>
          <div className="relative w-20 h-20 rounded-full overflow-hidden mx-auto ring-2 ring-amber-400/30 bg-theme-surface-3">
            {topArtist?.image_url ? (
              <Image src={topArtist.image_url} alt="" fill className="object-cover" sizes="80px" />
            ) : topArtist?.name ? (
              <ArtistMonogram name={topArtist.name} textSize="text-xl" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-theme-tertiary">
                <Trophy className="w-8 h-8" />
              </div>
            )}
          </div>
          <p className="text-lg font-bold text-theme">{topArtist?.name || "—"}</p>
          <p className="text-sm text-accent-dynamic">{topArtist?.play_count || 0} plays</p>
        </div>

        {/* #1 Track */}
        <div className="glass-card p-6 text-center space-y-3">
          <Music className="w-8 h-8 text-accent-dynamic mx-auto" />
          <p className="text-xs text-theme-tertiary uppercase tracking-wider">#1 Track</p>
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden mx-auto ring-2 ring-accent-dynamic/30 bg-theme-surface-3">
            {topTrack?.image_url ? (
              <Image src={topTrack.image_url} alt="" fill className="object-cover" sizes="80px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-theme-tertiary">
                <Music className="w-8 h-8" />
              </div>
            )}
          </div>
          <p className="text-lg font-bold text-theme">{topTrack?.name?.split(" — ")[0] || "—"}</p>
          <p className="text-sm text-theme-secondary">{topTrack?.name?.split(" — ")[1] || ""}</p>
          <p className="text-sm text-accent-dynamic">{topTrack?.play_count || 0} plays</p>
        </div>

        {/* #1 Genre */}
        <div className="glass-card p-6 text-center space-y-3">
          <Disc3 className="w-8 h-8 text-accent-cyan mx-auto" />
          <p className="text-xs text-theme-tertiary uppercase tracking-wider">#1 Genre</p>
          <div className="w-20 h-20 rounded-full bg-accent-dynamic/15 flex items-center justify-center mx-auto">
            <span className="text-2xl">🎵</span>
          </div>
          <p className="text-lg font-bold text-theme capitalize">{topGenre?.name || "—"}</p>
          <p className="text-sm text-accent-dynamic">{topGenre?.play_count || 0} plays</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            icon: Music,
            label: "Tracks Played",
            value: (data?.total_tracks_played || 0).toLocaleString(),
            color: "text-spotify-green",
          },
          {
            icon: Users,
            label: "Artists",
            value: (data?.unique_artists || 0).toLocaleString(),
            color: "text-accent-cyan",
          },
          {
            icon: Disc3,
            label: "Genres",
            value: (data?.unique_genres || 0).toLocaleString(),
            color: "text-accent-pink",
          },
          {
            icon: Flame,
            label: "Day Streak",
            value: streak.toLocaleString(),
            color: "text-accent-amber",
          },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4 text-center">
            <stat.icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
            <p className="text-2xl font-bold text-theme">{stat.value}</p>
            <p className="text-xs text-theme-tertiary">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-theme mb-4">Top Artists</h2>
          {topArtists5.length > 0 ? (
            <BarChart
              data={topArtists5}
              xKey="name"
              bars={[{ key: "plays", color: "rgb(var(--accent))" }]}
              height={250}
              layout="vertical"
            />
          ) : (
            <p className="text-theme-tertiary text-center py-12">No data</p>
          )}
        </div>
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-theme mb-4">Genre Mix</h2>
          {genrePie.length > 0 ? (
            <PieChart data={genrePie} height={250} />
          ) : (
            <p className="text-theme-tertiary text-center py-12">No data</p>
          )}
        </div>
      </div>

      {/* Top 5 Tracks List */}
      <div className="glass-card">
        <div className="p-4 border-b border-current/[0.08]">
          <h2 className="text-lg font-semibold text-theme">Your Top 5 Tracks</h2>
        </div>
        <div className="divide-y divide-current/[0.08]">
          {(data?.top_tracks || []).slice(0, 5).map((track: any, i: number) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <span className="w-8 text-center text-2xl font-bold text-accent-dynamic/40">
                {i + 1}
              </span>
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-theme-surface-3">
                {track.image_url ? (
                  <Image src={track.image_url} alt="" fill className="object-cover" sizes="48px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-theme-tertiary">
                    <Music className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-theme truncate">
                  {track.name?.split(" — ")[0]}
                </p>
                <p className="text-xs text-theme-tertiary truncate">
                  {track.name?.split(" — ")[1]}
                </p>
              </div>
              <span className="text-sm font-medium text-accent-dynamic">
                {track.play_count} plays
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
