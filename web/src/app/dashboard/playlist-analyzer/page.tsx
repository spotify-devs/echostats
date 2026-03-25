"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, Clock, ListMusic, Microscope, Music, Zap } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { PieChart } from "@/components/charts/pie-chart";
import { RadarChart } from "@/components/charts/radar-chart";
import { ListSkeleton } from "@/components/ui/loading-skeleton";
import { api } from "@/lib/api";

export default function PlaylistAnalyzerPage() {
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);

  const { data: playlists, isLoading: loadingPlaylists } = useQuery({
    queryKey: ["playlists-for-analyzer"],
    queryFn: () => api.get<any>("/api/v1/playlists"),
    retry: false,
  });

  const { data: analytics } = useQuery({
    queryKey: ["analytics-overview", "all_time"],
    queryFn: () => api.get<any>("/api/v1/analytics/overview?period=all_time"),
    retry: false,
  });

  const items = playlists?.items || [];
  const selected = items.find((p: any) => p.spotify_id === selectedPlaylist);
  const af = analytics?.avg_audio_features;

  const radarData = af
    ? [
        { feature: "Dance", value: af.danceability },
        { feature: "Energy", value: af.energy },
        { feature: "Happy", value: af.valence },
        { feature: "Acoustic", value: af.acousticness },
        { feature: "Live", value: af.liveness },
        { feature: "Speech", value: af.speechiness },
      ]
    : [];

  // Simulated playlist mood distribution
  const moodData = [
    { name: "Upbeat", value: 35 },
    { name: "Chill", value: 25 },
    { name: "Energetic", value: 20 },
    { name: "Mellow", value: 15 },
    { name: "Intense", value: 5 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
          <Microscope className="w-6 h-6 text-accent-dynamic" /> Playlist Analyzer
        </h1>
        <p className="text-theme-secondary mt-1">
          Deep-dive into any playlist&apos;s audio profile
        </p>
      </div>

      {/* Playlist Selector */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-theme mb-4">Select a Playlist</h2>
        {loadingPlaylists ? (
          <ListSkeleton rows={3} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((pl: any) => (
              <button
                key={pl.spotify_id}
                onClick={() => setSelectedPlaylist(pl.spotify_id)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  selectedPlaylist === pl.spotify_id
                    ? "border-accent-dynamic/50 bg-accent-dynamic/10"
                    : "border-white/5 hover:border-white/15 hover:bg-white/[0.03]"
                }`}
              >
                {pl.images?.[0]?.url ? (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-theme-surface-3 flex-shrink-0">
                    <Image
                      src={pl.images[0].url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-theme-surface-3 flex items-center justify-center flex-shrink-0">
                    <ListMusic className="w-5 h-5 text-theme-tertiary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-theme truncate">{pl.name}</p>
                  <p className="text-xs text-theme-tertiary">{pl.total_tracks} tracks</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {selected && (
        <>
          {/* Playlist Header */}
          <div className="glass-card p-6 flex flex-col sm:flex-row items-center gap-6 bg-gradient-to-br from-accent-dynamic/5 to-transparent">
            {selected.images?.[0]?.url && (
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden bg-theme-surface-3 flex-shrink-0 shadow-lg">
                <Image
                  src={selected.images[0].url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              </div>
            )}
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold text-theme">{selected.name}</h2>
              {selected.description && (
                <p className="text-sm text-theme-secondary mt-1">{selected.description}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-3 justify-center sm:justify-start text-sm text-theme-tertiary">
                <span className="flex items-center gap-1">
                  <Music className="w-4 h-4" /> {selected.total_tracks} tracks
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> ~{Math.round(selected.total_tracks * 3.5)}min
                </span>
              </div>
            </div>
          </div>

          {/* Audio Profile + Mood */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-theme mb-4">Audio Profile</h2>
              {radarData.length > 0 ? (
                <RadarChart data={radarData} height={280} />
              ) : (
                <p className="text-theme-tertiary text-center py-12">No audio data</p>
              )}
            </div>
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-theme mb-4">Mood Distribution</h2>
              <PieChart data={moodData} height={280} />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {af &&
              [
                {
                  label: "Avg Energy",
                  value: `${Math.round(af.energy * 100)}%`,
                  icon: Zap,
                  color: "text-accent-amber",
                },
                {
                  label: "Avg Dance",
                  value: `${Math.round(af.danceability * 100)}%`,
                  icon: Music,
                  color: "text-accent-purple",
                },
                {
                  label: "Avg Happy",
                  value: `${Math.round(af.valence * 100)}%`,
                  icon: BarChart3,
                  color: "text-spotify-green",
                },
                {
                  label: "Avg BPM",
                  value: `${Math.round(af.tempo)}`,
                  icon: Clock,
                  color: "text-accent-cyan",
                },
              ].map((stat) => (
                <div key={stat.label} className="glass-card p-4 text-center">
                  <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
                  <p className="text-xl font-bold text-theme">{stat.value}</p>
                  <p className="text-[10px] text-theme-tertiary">{stat.label}</p>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
