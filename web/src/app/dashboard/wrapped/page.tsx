"use client";

import { useQuery } from "@tanstack/react-query";
import { Disc3, Download, Flame, Gift, Music, Share2, Users } from "lucide-react";
import Image from "next/image";
import { ArtistMonogram } from "@/components/music/artist-monogram";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";
import { api } from "@/lib/api";

export default function WrappedPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-overview", "all_time"],
    queryFn: () => api.get<any>("/api/v1/analytics/overview?period=all_time"),
  });

  const topArtist = data?.top_artists?.[0];
  const topTrack = data?.top_tracks?.[0];
  const topGenre = data?.top_genres?.[0];
  const hours = data?.total_hours || 0;

  if (isLoading)
    return (
      <div className="space-y-6 max-w-lg mx-auto">
        <ChartSkeleton height={600} />
      </div>
    );

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-12">
      <div className="text-center">
        <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center justify-center gap-2">
          <Gift className="w-6 h-6 text-accent-dynamic" /> Your Wrapped
        </h1>
        <p className="text-theme-secondary mt-1">Your EchoStats summary card</p>
      </div>

      {/* The Card */}
      <div
        id="wrapped-card"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface-1 via-surface to-surface-2 border border-white/10 shadow-2xl"
      >
        {/* Header */}
        <div className="p-5 sm:p-8 pb-4 text-center bg-gradient-to-b from-accent-dynamic/10 to-transparent">
          <div className="inline-flex p-3 rounded-2xl bg-accent-dynamic/15 mb-3">
            <Music className="w-8 h-8 text-accent-dynamic" />
          </div>
          <h2 className="text-2xl font-bold text-gradient">EchoStats</h2>
          <p className="text-xs text-theme-tertiary mt-1">Your Listening Summary</p>
        </div>

        {/* Big Number */}
        <div className="px-8 py-6 text-center">
          <p className="text-6xl font-bold text-gradient tabular-nums">{hours}</p>
          <p className="text-sm text-theme-secondary mt-1">hours of music</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 px-4 sm:px-8 pb-6">
          <div className="p-4 rounded-2xl bg-white/[0.03] text-center">
            <Music className="w-5 h-5 text-spotify-green mx-auto mb-1" />
            <p className="text-xl font-bold text-theme">
              {(data?.total_tracks_played || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-theme-tertiary">Tracks</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] text-center">
            <Users className="w-5 h-5 text-accent-cyan mx-auto mb-1" />
            <p className="text-xl font-bold text-theme">{data?.unique_artists || 0}</p>
            <p className="text-[10px] text-theme-tertiary">Artists</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] text-center">
            <Disc3 className="w-5 h-5 text-accent-pink mx-auto mb-1" />
            <p className="text-xl font-bold text-theme">{data?.unique_genres || 0}</p>
            <p className="text-[10px] text-theme-tertiary">Genres</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] text-center">
            <Flame className="w-5 h-5 text-accent-amber mx-auto mb-1" />
            <p className="text-xl font-bold text-theme">{data?.listening_streak_days || 0}</p>
            <p className="text-[10px] text-theme-tertiary">Day Streak</p>
          </div>
        </div>

        {/* Top Items */}
        <div className="px-4 sm:px-8 pb-8 space-y-3">
          {topArtist && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-theme-surface-3 flex-shrink-0">
                {topArtist.image_url ? (
                  <Image
                    src={topArtist.image_url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <ArtistMonogram name={topArtist.name} textSize="text-sm" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-accent-dynamic uppercase tracking-wider">
                  #1 Artist
                </p>
                <p className="text-sm font-bold text-theme truncate">{topArtist.name}</p>
              </div>
              <span className="text-xs text-theme-tertiary">{topArtist.play_count} plays</span>
            </div>
          )}
          {topTrack && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
              {topTrack.image_url && (
                <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                  <Image
                    src={topTrack.image_url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-accent-dynamic uppercase tracking-wider">#1 Track</p>
                <p className="text-sm font-bold text-theme truncate">
                  {topTrack.name?.split(" — ")[0]}
                </p>
              </div>
              <span className="text-xs text-theme-tertiary">{topTrack.play_count} plays</span>
            </div>
          )}
          {topGenre && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
              <div className="w-12 h-12 rounded-xl bg-accent-dynamic/15 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🎵</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-accent-dynamic uppercase tracking-wider">#1 Genre</p>
                <p className="text-sm font-bold text-theme truncate capitalize">{topGenre.name}</p>
              </div>
              <span className="text-xs text-theme-tertiary">{topGenre.play_count} plays</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-8 pb-6 text-center">
          <p className="text-[10px] text-theme-tertiary">
            Generated by EchoStats · echostats.local
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <button className="btn-primary text-sm flex items-center gap-2">
          <Share2 className="w-4 h-4" /> Share
        </button>
        <button className="px-4 py-2 text-sm text-theme-secondary border border-white/10 rounded-xl hover:bg-white/5 transition-all flex items-center gap-2">
          <Download className="w-4 h-4" /> Save Image
        </button>
      </div>
    </div>
  );
}
