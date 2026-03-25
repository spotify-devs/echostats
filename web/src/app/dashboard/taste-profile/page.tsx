"use client";

import { useQuery } from "@tanstack/react-query";
import { Fingerprint, Gauge, Heart, Zap } from "lucide-react";
import { RadarChart } from "@/components/charts/radar-chart";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";
import { api } from "@/lib/api";

const TASTE_LABELS: Record<string, { high: string; low: string; emoji: string }> = {
  danceability: { high: "Groovy Dancer", low: "Chill Listener", emoji: "💃" },
  energy: { high: "Adrenaline Junkie", low: "Zen Master", emoji: "⚡" },
  valence: { high: "Sunshine Soul", low: "Moody Artist", emoji: "☀️" },
  acousticness: { high: "Unplugged Fan", low: "Electronic Explorer", emoji: "🎸" },
  instrumentalness: { high: "Instrumental Purist", low: "Lyric Lover", emoji: "🎻" },
  speechiness: { high: "Podcast Listener", low: "Pure Music Fan", emoji: "🎙️" },
};

export default function TasteProfilePage() {
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
        { feature: "Live", value: af.liveness },
        { feature: "Speech", value: af.speechiness },
      ]
    : [];

  const getTasteLabel = (key: string, value: number) => {
    const labels = TASTE_LABELS[key];
    if (!labels) return "";
    return value >= 0.5 ? labels.high : labels.low;
  };

  const getPersonality = () => {
    if (!af) return { title: "Unknown", emoji: "❓", desc: "" };
    if (af.energy > 0.7 && af.danceability > 0.7)
      return {
        title: "Party Animal",
        emoji: "🎉",
        desc: "You love high-energy, danceable music that gets everyone moving",
      };
    if (af.valence > 0.7 && af.energy > 0.5)
      return {
        title: "Sunshine Vibes",
        emoji: "🌞",
        desc: "Your music is upbeat, positive, and full of good energy",
      };
    if (af.acousticness > 0.5 && af.energy < 0.5)
      return {
        title: "Indie Soul",
        emoji: "🍂",
        desc: "You appreciate acoustic, organic sounds and intimate performances",
      };
    if (af.valence < 0.4 && af.energy > 0.6)
      return {
        title: "Dark Horse",
        emoji: "🖤",
        desc: "You gravitate towards intense, emotionally charged music",
      };
    if (af.danceability > 0.6 && af.valence > 0.5)
      return {
        title: "Feel-Good Curator",
        emoji: "✨",
        desc: "Your taste is well-balanced with a lean towards feel-good tracks",
      };
    return {
      title: "Eclectic Explorer",
      emoji: "🌍",
      desc: "Your taste spans multiple moods and styles — truly diverse",
    };
  };

  const personality = getPersonality();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center gap-2">
          <Fingerprint className="w-6 h-6 text-accent-dynamic" /> Taste Profile
        </h1>
        <p className="text-theme-secondary mt-1">Your unique musical fingerprint</p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : af ? (
        <>
          {/* Personality Card */}
          <div className="glass-card p-5 sm:p-8 text-center bg-gradient-to-br from-accent-dynamic/5 to-transparent">
            <span className="text-6xl mb-4 block">{personality.emoji}</span>
            <h2 className="text-xl sm:text-3xl font-bold text-gradient mb-2">
              {personality.title}
            </h2>
            <p className="text-theme-secondary max-w-md mx-auto">{personality.desc}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-theme mb-4">Audio Fingerprint</h2>
              <RadarChart data={radarData} height={300} />
            </div>

            {/* Feature breakdown */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-theme mb-4">What This Means</h2>
              <div className="space-y-4">
                {Object.entries(TASTE_LABELS).map(([key, labels]) => {
                  const value = af[key] || 0;
                  const label = getTasteLabel(key, value);
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{labels.emoji}</span>
                          <span className="text-sm text-theme capitalize">{key}</span>
                        </div>
                        <span className="text-xs text-accent-dynamic font-medium">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-theme-tertiary w-16 text-right">
                          {labels.low}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-theme-surface-3 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${value * 100}%`,
                              backgroundColor: "rgb(var(--accent))",
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-theme-tertiary w-16">{labels.high}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="glass-card p-4 text-center">
              <Gauge className="w-6 h-6 text-accent-dynamic mx-auto mb-2" />
              <p className="text-2xl font-bold text-theme">{Math.round(af.tempo)}</p>
              <p className="text-xs text-theme-tertiary">Avg BPM</p>
            </div>
            <div className="glass-card p-4 text-center">
              <Heart className="w-6 h-6 text-accent-pink mx-auto mb-2" />
              <p className="text-2xl font-bold text-theme">{Math.round(af.valence * 100)}%</p>
              <p className="text-xs text-theme-tertiary">Happiness</p>
            </div>
            <div className="glass-card p-4 text-center">
              <Zap className="w-6 h-6 text-accent-amber mx-auto mb-2" />
              <p className="text-2xl font-bold text-theme">{Math.round(af.energy * 100)}%</p>
              <p className="text-xs text-theme-tertiary">Energy</p>
            </div>
          </div>
        </>
      ) : (
        <div className="glass-card p-12 text-center text-theme-tertiary">
          Not enough data to build your taste profile yet
        </div>
      )}
    </div>
  );
}
