"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Music, Clock, ExternalLink, RefreshCw } from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";
import { ListSkeleton } from "@/components/ui/loading-skeleton";

type SeedType = "mixed" | "artists" | "tracks" | "genres";

function formatDuration(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RecommendationsPage() {
  const [seedType, setSeedType] = useState<SeedType>("mixed");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["recommendations", seedType],
    queryFn: () => api.get<any>(`/api/v1/recommendations?limit=20&seed_type=${seedType}`),
    retry: false,
  });

  const items = data?.items || [];
  const seedInfo = data?.seed_info || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-accent-dynamic" /> Recommendations
          </h1>
          <p className="text-theme-secondary mt-1">
            Personalized tracks based on your listening
            {seedInfo.top_artist && <span> · seeded from <strong>{seedInfo.top_artist}</strong></span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Seed selector */}
          <div className="flex rounded-xl overflow-hidden border border-white/10">
            {(["mixed", "artists", "tracks", "genres"] as SeedType[]).map((t) => (
              <button
                key={t}
                onClick={() => setSeedType(t)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  seedType === t
                    ? "bg-accent-dynamic/20 text-accent-dynamic"
                    : "text-theme-tertiary hover:text-theme-secondary hover:bg-white/5"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl border border-white/10 text-theme-secondary hover:text-theme hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Empty state */}
      {!isLoading && items.length === 0 && (
        <div className="glass-card p-12 text-center space-y-4">
          <Sparkles className="w-12 h-12 text-accent-dynamic/30 mx-auto" />
          <p className="text-theme-secondary">No recommendations yet</p>
          <p className="text-sm text-theme-tertiary">Listen to more music so we can learn your taste</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && <ListSkeleton rows={8} />}

      {/* Track list */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((track: any, idx: number) => (
            <div
              key={track.id}
              className="glass-card-hover p-3 flex items-center gap-4 group"
            >
              {/* Index */}
              <span className="w-6 text-right text-xs text-theme-tertiary font-mono">
                {idx + 1}
              </span>

              {/* Album art */}
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-theme-surface-3 flex-shrink-0">
                {track.album_image ? (
                  <Image
                    src={track.album_image}
                    alt={track.album}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-5 h-5 text-theme-tertiary" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-theme truncate">{track.name}</p>
                <p className="text-xs text-theme-tertiary truncate">
                  {track.artist} · {track.album}
                </p>
              </div>

              {/* Audio features pills */}
              {track.audio_features && (
                <div className="hidden md:flex items-center gap-1.5">
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-500/15 text-blue-400">
                    ⚡ {Math.round(track.audio_features.energy * 100)}%
                  </span>
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-pink-500/15 text-pink-400">
                    💃 {Math.round(track.audio_features.danceability * 100)}%
                  </span>
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500/15 text-amber-400">
                    😊 {Math.round(track.audio_features.valence * 100)}%
                  </span>
                </div>
              )}

              {/* Duration */}
              <span className="text-xs text-theme-tertiary flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(track.duration_ms)}
              </span>

              {/* Spotify link */}
              {track.external_url && (
                <a
                  href={track.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-white/10"
                >
                  <ExternalLink className="w-4 h-4 text-theme-tertiary" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {data?.total > 0 && (
        <p className="text-center text-xs text-theme-tertiary">
          {data.total} recommendations
          {seedInfo.top_genre && <span> · top genre: {seedInfo.top_genre}</span>}
        </p>
      )}
    </div>
  );
}
