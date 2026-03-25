"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shuffle, Music, Search } from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";
import { ListSkeleton } from "@/components/ui/loading-skeleton";

export default function SimilarTracksPage() {
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: topTracks, isLoading } = useQuery({
    queryKey: ["top-tracks-similar", "all_time"],
    queryFn: () => api.get<any>("/api/v1/tracks/top?period=all_time&limit=50"),
  });

  const tracks = topTracks?.items || [];
  const filtered = searchQuery
    ? tracks.filter((t: any) => t.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : tracks;

  // Mock similar tracks (in production, would use recommendations API with seed track)
  const similarTracks = selectedTrack
    ? tracks.filter((t: any) => t.spotify_id !== selectedTrack.spotify_id).sort(() => Math.random() - 0.5).slice(0, 8)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
          <Shuffle className="w-6 h-6 text-accent-dynamic" /> Similar Tracks
        </h1>
        <p className="text-theme-secondary mt-1">Find tracks similar to your favorites</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Track Selector */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-theme">Select a Seed Track</h2>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tracks..."
              className="w-full pl-10 pr-4 py-2 bg-theme-surface-2 border border-white/10 rounded-xl text-sm text-theme placeholder:text-theme-tertiary focus:outline-none focus:border-accent-dynamic/50 transition-all"
            />
          </div>

          {isLoading ? (
            <ListSkeleton rows={6} />
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {filtered.map((track: any, i: number) => {
                const [name, artist] = (track.name || "").split(" — ");
                const isSelected = selectedTrack?.spotify_id === track.spotify_id;
                return (
                  <button
                    key={track.spotify_id || i}
                    onClick={() => setSelectedTrack(track)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                      isSelected ? "bg-accent-dynamic/15 border border-accent-dynamic/30" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    {track.image_url && (
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-theme-surface-3 flex-shrink-0">
                        <Image src={track.image_url} alt="" fill className="object-cover" sizes="40px" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-theme truncate">{name}</p>
                      <p className="text-xs text-theme-tertiary truncate">{artist}</p>
                    </div>
                    {isSelected && <Music className="w-4 h-4 text-accent-dynamic" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="space-y-6">
          {selectedTrack ? (
            <>
              {/* Selected Track Info */}
              <div className="glass-card p-5 flex items-center gap-4 bg-gradient-to-r from-accent-dynamic/5 to-transparent">
                {selectedTrack.image_url && (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-theme-surface-3 flex-shrink-0">
                    <Image src={selectedTrack.image_url} alt="" fill className="object-cover" sizes="64px" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-accent-dynamic uppercase tracking-wider">Seed Track</p>
                  <p className="text-lg font-bold text-theme truncate">{selectedTrack.name?.split(" — ")[0]}</p>
                  <p className="text-sm text-theme-tertiary truncate">{selectedTrack.name?.split(" — ")[1]}</p>
                </div>
              </div>

              {/* Similar Tracks */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-theme mb-3 flex items-center gap-2">
                  <Shuffle className="w-4 h-4 text-accent-dynamic" /> Similar Tracks ({similarTracks.length})
                </h3>
                <div className="space-y-1">
                  {similarTracks.map((track: any, i: number) => {
                    const [name, artist] = (track.name || "").split(" — ");
                    return (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                        <span className="w-5 text-center text-xs text-theme-tertiary">{i + 1}</span>
                        {track.image_url && (
                          <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-theme-surface-3 flex-shrink-0">
                            <Image src={track.image_url} alt="" fill className="object-cover" sizes="36px" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-theme truncate">{name}</p>
                          <p className="text-[10px] text-theme-tertiary truncate">{artist}</p>
                        </div>
                        <span className="text-xs text-theme-tertiary">{track.play_count} plays</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card p-12 text-center">
              <Shuffle className="w-12 h-12 text-theme-tertiary mx-auto mb-3 opacity-30" />
              <p className="text-theme-secondary">Select a track to find similar ones</p>
              <p className="text-xs text-theme-tertiary mt-1">Based on audio features and listening patterns</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
