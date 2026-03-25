"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, Disc3, ExternalLink, Music } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { use } from "react";
import { RadarChart } from "@/components/charts/radar-chart";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";
import { api } from "@/lib/api";

function formatMs(ms: number): string {
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function TrackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: track, isLoading } = useQuery({
    queryKey: ["track", id],
    queryFn: () => api.get<any>(`/api/v1/tracks/${id}`),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <ChartSkeleton />
      </div>
    );
  }

  if (!track) {
    return (
      <div className="text-center py-20">
        <p className="text-theme-secondary">Track not found</p>
        <Link href="/dashboard/tracks" className="text-accent-dynamic text-sm mt-2 inline-block">
          ← Back to Tracks
        </Link>
      </div>
    );
  }

  const af = track.audio_features;
  const radarData = af
    ? [
        { feature: "Danceability", value: af.danceability },
        { feature: "Energy", value: af.energy },
        { feature: "Valence", value: af.valence },
        { feature: "Acousticness", value: af.acousticness },
        { feature: "Liveness", value: af.liveness },
        { feature: "Speechiness", value: af.speechiness },
      ]
    : [];

  const featureDetails = af
    ? [
        { label: "Danceability", value: af.danceability, desc: "How suitable for dancing" },
        { label: "Energy", value: af.energy, desc: "Intensity and activity" },
        { label: "Valence", value: af.valence, desc: "Musical positiveness" },
        { label: "Acousticness", value: af.acousticness, desc: "Acoustic confidence" },
        { label: "Instrumentalness", value: af.instrumentalness, desc: "No vocals predicted" },
        { label: "Liveness", value: af.liveness, desc: "Audience presence" },
        { label: "Speechiness", value: af.speechiness, desc: "Spoken words" },
        {
          label: "Tempo",
          value: null,
          raw: `${Math.round(af.tempo)} BPM`,
          desc: "Beats per minute",
        },
        {
          label: "Key",
          value: null,
          raw: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][af.key] || "?",
          desc: "Musical key",
        },
        {
          label: "Loudness",
          value: null,
          raw: `${af.loudness.toFixed(1)} dB`,
          desc: "Overall loudness",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/tracks"
        className="inline-flex items-center gap-2 text-sm text-theme-secondary hover:text-theme transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Tracks
      </Link>

      {/* Track Header */}
      <div className="glass-card p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-40 h-40 rounded-2xl overflow-hidden bg-theme-surface-3 flex-shrink-0 shadow-lg">
          {track.album?.image_url ? (
            <Image
              src={track.album.image_url}
              alt={track.name}
              fill
              className="object-cover"
              sizes="160px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-12 h-12 text-theme-tertiary" />
            </div>
          )}
        </div>
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-3xl font-bold text-theme">{track.name}</h1>
          <p className="text-lg text-theme-secondary mt-1">
            {track.artists?.map((a: any) => a.name).join(", ")}
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-3 justify-center sm:justify-start text-sm text-theme-tertiary">
            {track.album && (
              <span className="flex items-center gap-1">
                <Disc3 className="w-4 h-4" /> {track.album.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" /> {formatMs(track.duration_ms)}
            </span>
            {track.explicit && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-theme-surface-3 rounded uppercase">
                E
              </span>
            )}
          </div>
          {track.external_url && (
            <a
              href={track.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-sm text-spotify-green hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open in Spotify
            </a>
          )}
        </div>
      </div>

      {/* Audio Features */}
      {af && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-theme mb-4">Audio Profile</h2>
            <RadarChart data={radarData} height={300} color="rgb(var(--accent))" />
          </div>

          {/* Feature bars */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-theme mb-4">Audio Features</h2>
            <div className="space-y-3">
              {featureDetails.map((f) => (
                <div key={f.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-theme-secondary">{f.label}</span>
                    <span className="text-theme font-medium">
                      {f.value !== null && f.value !== undefined
                        ? `${Math.round(f.value * 100)}%`
                        : f.raw}
                    </span>
                  </div>
                  {f.value !== null && f.value !== undefined && (
                    <div className="w-full h-2 rounded-full bg-theme-surface-3 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${f.value * 100}%`,
                          backgroundColor: "rgb(var(--accent))",
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
