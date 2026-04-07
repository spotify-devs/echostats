"use client";

import { useMutation } from "@tanstack/react-query";
import { Check, Loader2, Plus, Sparkles, Wand2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { api } from "@/lib/api";
import type { TopItem } from "@/lib/types";

const MOODS = [
  { id: "happy", emoji: "😊", label: "Happy", params: { min_valence: 0.7, min_energy: 0.5 } },
  { id: "chill", emoji: "😌", label: "Chill", params: { max_energy: 0.4, min_acousticness: 0.3 } },
  {
    id: "energetic",
    emoji: "⚡",
    label: "Energetic",
    params: { min_energy: 0.8, min_danceability: 0.6 },
  },
  { id: "sad", emoji: "😢", label: "Melancholy", params: { max_valence: 0.3, max_energy: 0.5 } },
  {
    id: "focus",
    emoji: "🎯",
    label: "Focus",
    params: { min_instrumentalness: 0.3, max_speechiness: 0.1 },
  },
  { id: "party", emoji: "🎉", label: "Party", params: { min_danceability: 0.8, min_energy: 0.7 } },
  {
    id: "romantic",
    emoji: "💕",
    label: "Romantic",
    params: { min_valence: 0.5, max_energy: 0.6, min_acousticness: 0.2 },
  },
  { id: "workout", emoji: "💪", label: "Workout", params: { min_energy: 0.8, min_tempo: 120 } },
];

const GENRES = [
  "pop",
  "rock",
  "hip-hop",
  "r-n-b",
  "electronic",
  "indie",
  "jazz",
  "classical",
  "country",
  "latin",
  "metal",
  "folk",
  "reggae",
  "blues",
  "soul",
  "punk",
  "k-pop",
];

export default function PlaylistGeneratorPage() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [trackCount, setTrackCount] = useState(20);
  const [playlistName, setPlaylistName] = useState("");
  const [generatedTracks, setGeneratedTracks] = useState<TopItem[]>([]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      // In production, this would call the recommendations API
      // For now, use top tracks as seed data
      const data = await api.get<{ items: TopItem[] }>(
        "/api/v1/tracks/top?period=all_time&limit=50",
      );
      const tracks = data?.items || [];
      // Shuffle and take requested count
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, Math.min(trackCount, shuffled.length));
    },
    onSuccess: (tracks) => {
      setGeneratedTracks(tracks);
      if (!playlistName) {
        const mood = MOODS.find((m) => m.id === selectedMood);
        setPlaylistName(
          `${mood?.label || "My"} Mix — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        );
      }
    },
  });

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : prev.length < 5
          ? [...prev, genre]
          : prev,
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center gap-2">
          <Wand2 className="w-6 h-6 text-accent-dynamic" /> Playlist Generator
        </h1>
        <p className="text-theme-secondary mt-1">Create the perfect playlist based on your taste</p>
      </div>

      {generatedTracks.length === 0 ? (
        <>
          {/* Mood Selection */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-theme">1. Pick a Mood</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {MOODS.map((mood) => (
                <button
                  key={mood.id}
                  onClick={() => setSelectedMood(mood.id)}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    selectedMood === mood.id
                      ? "border-accent-dynamic/50 bg-accent-dynamic/15 scale-105"
                      : "border-current/[0.1] hover:border-current/[0.2] hover:bg-current/[0.05]"
                  }`}
                >
                  <span className="text-3xl block mb-2">{mood.emoji}</span>
                  <span className="text-sm font-medium text-theme">{mood.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Genre Selection */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-theme">
              2. Select Genres{" "}
              <span className="text-xs text-theme-tertiary font-normal">(up to 5)</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => {
                const isSelected = selectedGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-all capitalize ${
                      isSelected
                        ? "border-accent-dynamic/50 bg-accent-dynamic/15 text-accent-dynamic"
                        : "border-current/[0.1] text-theme-secondary hover:border-current/[0.2]"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Settings */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-theme">3. Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-theme-tertiary uppercase tracking-wider mb-2 block">
                  Playlist Name
                </label>
                <input
                  type="text"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  placeholder="Auto-generated if empty"
                  className="w-full px-4 py-2.5 bg-theme-surface-2 border border-current/[0.1] rounded-xl text-sm text-theme placeholder:text-theme-tertiary focus:outline-none focus:border-accent-dynamic/50 transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-theme-tertiary uppercase tracking-wider mb-2 block">
                  Number of Tracks: {trackCount}
                </label>
                <input
                  type="range"
                  min={5}
                  max={50}
                  value={trackCount}
                  onChange={(e) => setTrackCount(Number(e.target.value))}
                  className="w-full accent-[rgb(var(--accent))]"
                />
                <div className="flex justify-between text-[10px] text-theme-tertiary">
                  <span>5</span>
                  <span>50</span>
                </div>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={() => generateMutation.mutate()}
            disabled={!selectedMood || generateMutation.isPending}
            className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" /> Generate Playlist
              </>
            )}
          </button>
        </>
      ) : (
        <>
          {/* Generated Playlist */}
          <div className="glass-card p-6 bg-gradient-to-br from-accent-dynamic/5 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-theme">{playlistName}</h2>
                <p className="text-sm text-theme-secondary">
                  {generatedTracks.length} tracks · Generated just now
                </p>
              </div>
              <button
                onClick={() => {
                  setGeneratedTracks([]);
                  setPlaylistName("");
                }}
                className="text-sm text-theme-tertiary hover:text-theme transition-colors"
              >
                Start Over
              </button>
            </div>

            <div className="divide-y divide-current/[0.08]">
              {generatedTracks.map((track: TopItem, i: number) => {
                const [name, artist] = (track.name || "").split(" — ");
                return (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <span className="w-6 text-center text-sm text-theme-tertiary font-mono">
                      {i + 1}
                    </span>
                    {track.image_url && (
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-theme-surface-3 flex-shrink-0">
                        <Image
                          src={track.image_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-theme truncate">{name}</p>
                      <p className="text-xs text-theme-tertiary truncate">{artist}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button className="flex-1 btn-spotify py-3 flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> Save to Spotify
            </button>
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="px-6 py-3 glass-card hover:bg-current/[0.05] transition-all flex items-center gap-2 text-sm text-theme-secondary"
            >
              <Wand2 className="w-4 h-4" /> Regenerate
            </button>
          </div>
        </>
      )}
    </div>
  );
}
