"use client";

import { RadarChart } from "@/components/charts/radar-chart";

interface AudioProfileProps {
  features: {
    danceability: number;
    energy: number;
    valence: number;
    acousticness: number;
    instrumentalness: number;
    liveness: number;
    speechiness: number;
    tempo: number;
  } | null;
}

const MOODS: { range: [number, number]; emoji: string; label: string }[] = [
  { range: [0, 0.2], emoji: "😢", label: "Melancholic" },
  { range: [0.2, 0.4], emoji: "😌", label: "Reflective" },
  { range: [0.4, 0.6], emoji: "😊", label: "Neutral" },
  { range: [0.6, 0.8], emoji: "😄", label: "Upbeat" },
  { range: [0.8, 1.0], emoji: "🎉", label: "Euphoric" },
];

function getMood(valence: number) {
  return MOODS.find((m) => valence >= m.range[0] && valence < m.range[1]) || MOODS[2];
}

export function AudioProfile({ features }: AudioProfileProps) {
  if (!features) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-theme-tertiary">Audio profile not available yet</p>
      </div>
    );
  }

  const radarData = [
    { feature: "Dance", value: features.danceability },
    { feature: "Energy", value: features.energy },
    { feature: "Happy", value: features.valence },
    { feature: "Acoustic", value: features.acousticness },
    { feature: "Live", value: features.liveness },
    { feature: "Speech", value: features.speechiness },
  ];

  const mood = getMood(features.valence);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-theme">Your Sound DNA</h2>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent-dynamic/15">
          <span className="text-lg">{mood.emoji}</span>
          <span className="text-xs font-medium text-accent-dynamic">{mood.label}</span>
        </div>
      </div>

      <RadarChart data={radarData} height={220} color="rgb(var(--accent))" />

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4">
        {[
          { label: "Danceability", value: features.danceability },
          { label: "Energy", value: features.energy },
          { label: "Happiness", value: features.valence },
          { label: "Acousticness", value: features.acousticness },
        ].map((f) => (
          <div key={f.label} className="flex items-center gap-2">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-theme-tertiary">{f.label}</span>
                <span className="text-theme-secondary">{Math.round(f.value * 100)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-theme-surface-3">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${f.value * 100}%`, backgroundColor: "rgb(var(--accent))" }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-theme-tertiary text-center mt-4">
        Average BPM: {Math.round(features.tempo)}
      </p>
    </div>
  );
}
