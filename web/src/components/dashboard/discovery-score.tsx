"use client";

import { Compass } from "lucide-react";

interface DiscoveryScoreProps {
  uniqueTracks: number;
  totalPlays: number;
  uniqueArtists: number;
  uniqueGenres: number;
}

export function DiscoveryScore({
  uniqueTracks,
  totalPlays,
  uniqueArtists,
  uniqueGenres,
}: DiscoveryScoreProps) {
  // Calculate discovery score: ratio of unique content to total plays
  // Higher ratio = more adventurous listener
  const trackRatio = totalPlays > 0 ? uniqueTracks / totalPlays : 0;
  const score = Math.min(
    100,
    Math.round(
      (trackRatio * 40 + // 40% from track diversity
        Math.min(uniqueArtists / 20, 1) * 30 + // 30% from artist diversity (cap at 20)
        Math.min(uniqueGenres / 15, 1) * 30) *
        100, // 30% from genre diversity (cap at 15)
    ),
  );

  const getLabel = (s: number) => {
    if (s >= 80) return { label: "Explorer", emoji: "🗺️", desc: "You love discovering new music!" };
    if (s >= 60)
      return {
        label: "Adventurer",
        emoji: "🧭",
        desc: "A nice mix of old favorites and new finds",
      };
    if (s >= 40) return { label: "Curator", emoji: "🎯", desc: "You know what you like" };
    if (s >= 20) return { label: "Loyalist", emoji: "💎", desc: "Faithful to your favorites" };
    return { label: "Devotee", emoji: "🏠", desc: "Deep love for select artists" };
  };

  const info = getLabel(score);

  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-semibold text-theme flex items-center gap-2 mb-4">
        <Compass className="w-5 h-5 text-accent-dynamic" /> Discovery Score
      </h2>

      <div className="flex items-center gap-6">
        {/* Score ring */}
        <div className="relative flex-shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="rgb(var(--surface-3))"
              strokeWidth="8"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="rgb(var(--accent))"
              strokeWidth="8"
              strokeDasharray={`${(score / 100) * 251} 251`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-theme">{score}</span>
            <span className="text-[8px] text-theme-tertiary uppercase">/ 100</span>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{info.emoji}</span>
            <span className="text-lg font-semibold text-theme">{info.label}</span>
          </div>
          <p className="text-sm text-theme-secondary">{info.desc}</p>

          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="text-center">
              <p className="text-sm font-bold text-theme">{uniqueTracks}</p>
              <p className="text-[10px] text-theme-tertiary">Unique Tracks</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-theme">{uniqueArtists}</p>
              <p className="text-[10px] text-theme-tertiary">Artists</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-theme">{uniqueGenres}</p>
              <p className="text-[10px] text-theme-tertiary">Genres</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
