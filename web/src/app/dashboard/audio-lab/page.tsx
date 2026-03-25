"use client";

import { useQuery } from "@tanstack/react-query";
import { Gauge, Heart, Mic2, Music2, Volume2, Zap } from "lucide-react";
import { BarChart } from "@/components/charts/bar-chart";
import { RadarChart } from "@/components/charts/radar-chart";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";
import { api } from "@/lib/api";

const FEATURE_INFO: Record<string, { icon: any; color: string; desc: string }> = {
  danceability: {
    icon: Music2,
    color: "#a855f7",
    desc: "How suitable for dancing based on tempo, rhythm stability, beat strength",
  },
  energy: {
    icon: Zap,
    color: "#ef4444",
    desc: "Intensity and activity — fast, loud, noisy tracks score high",
  },
  valence: {
    icon: Heart,
    color: "#f59e0b",
    desc: "Musical positiveness — happy, cheerful tracks score high",
  },
  acousticness: {
    icon: Mic2,
    color: "#10b981",
    desc: "Confidence that the track is acoustic (no electronic sounds)",
  },
  instrumentalness: {
    icon: Volume2,
    color: "#06b6d4",
    desc: "Predicts whether a track has no vocals",
  },
  speechiness: {
    icon: Gauge,
    color: "#ec4899",
    desc: "Presence of spoken words — podcasts/audiobooks score highest",
  },
};

export default function AudioLabPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-overview", "all_time"],
    queryFn: () => api.get<any>("/api/v1/analytics/overview?period=all_time"),
  });

  const af = data?.avg_audio_features;
  const radarData = af
    ? [
        { feature: "Dance", value: af.danceability },
        { feature: "Energy", value: af.energy },
        { feature: "Happy", value: af.valence },
        { feature: "Acoustic", value: af.acousticness },
        { feature: "Instrumental", value: af.instrumentalness },
        { feature: "Live", value: af.liveness },
        { feature: "Speech", value: af.speechiness },
      ]
    : [];

  const barData = af
    ? Object.entries(FEATURE_INFO).map(([key, _info]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: Math.round((af[key] || 0) * 100),
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center gap-2">
          <Mic2 className="w-6 h-6 text-accent-dynamic" /> Audio Lab
        </h1>
        <p className="text-theme-secondary mt-1">
          Deep dive into the audio characteristics of your music
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : af ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-theme mb-4">Your Audio Fingerprint</h2>
              <RadarChart data={radarData} height={320} />
            </div>

            {/* Bar chart */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-theme mb-4">Feature Breakdown</h2>
              <BarChart
                data={barData}
                xKey="name"
                bars={[{ key: "value", color: "rgb(var(--accent))" }]}
                height={320}
              />
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(FEATURE_INFO).map(([key, info]) => {
              const value = af[key] || 0;
              const Icon = info.icon;
              return (
                <div key={key} className="glass-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="p-1.5 rounded-lg"
                        style={{ backgroundColor: `${info.color}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: info.color }} />
                      </div>
                      <span className="text-sm font-semibold text-theme capitalize">{key}</span>
                    </div>
                    <span className="text-lg font-bold text-theme">{Math.round(value * 100)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-theme-surface-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${value * 100}%`, backgroundColor: info.color }}
                    />
                  </div>
                  <p className="text-xs text-theme-tertiary">{info.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Tempo */}
          <div className="glass-card p-6 text-center">
            <h2 className="text-lg font-semibold text-theme mb-2">Average Tempo</h2>
            <p className="text-5xl font-bold text-gradient tabular-nums">{Math.round(af.tempo)}</p>
            <p className="text-theme-tertiary mt-1">BPM (beats per minute)</p>
          </div>
        </>
      ) : (
        <div className="glass-card p-12 text-center text-theme-tertiary">
          No audio feature data available yet
        </div>
      )}
    </div>
  );
}
