"use client";

import { useQuery } from "@tanstack/react-query";
import { Repeat, Music, Users, TrendingUp, Flame } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";
import { BarChart } from "@/components/charts/bar-chart";
import { ListSkeleton, ChartSkeleton } from "@/components/ui/loading-skeleton";

export default function ReplayPage() {
  const { data: tracksData, isLoading: loadingTracks } = useQuery({
    queryKey: ["top-tracks-replay", "all_time"],
    queryFn: () => api.get<any>("/api/v1/tracks/top?period=all_time&limit=20"),
  });

  const { data: artistsData } = useQuery({
    queryKey: ["top-artists-replay", "all_time"],
    queryFn: () => api.get<any>("/api/v1/artists/top?period=all_time&limit=10"),
  });

  const tracks = tracksData?.items || [];
  const artists = artistsData?.items || [];

  // Most replayed = highest play count relative to average
  const avgPlays = tracks.length > 0 ? tracks.reduce((sum: number, t: any) => sum + (t.play_count || 0), 0) / tracks.length : 0;
  const replayFactor = (count: number) => avgPlays > 0 ? (count / avgPlays).toFixed(1) : "0";

  const barData = tracks.slice(0, 10).map((t: any) => ({
    name: (t.name || "").split(" — ")[0]?.slice(0, 15) || "",
    plays: t.play_count || 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
          <Repeat className="w-6 h-6 text-accent-dynamic" /> On Repeat
        </h1>
        <p className="text-theme-secondary mt-1">Tracks and artists you can&apos;t stop replaying</p>
      </div>

      {loadingTracks ? (
        <div className="space-y-6"><ChartSkeleton /><ListSkeleton rows={5} /></div>
      ) : (
        <>
          {/* Replay chart */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-theme mb-4">Most Replayed Tracks</h2>
            {barData.length > 0 ? (
              <BarChart data={barData} xKey="name" bars={[{ key: "plays", color: "rgb(var(--accent))", name: "Plays" }]} height={280} layout="vertical" />
            ) : (
              <p className="text-theme-tertiary text-center py-12">No data</p>
            )}
          </div>

          {/* Top replayed tracks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-theme mb-4 flex items-center gap-2">
                <Flame className="w-5 h-5 text-accent-amber" /> Hottest Tracks
              </h2>
              <div className="space-y-3">
                {tracks.slice(0, 8).map((track: any, i: number) => {
                  const [name, artist] = (track.name || "").split(" — ");
                  return (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                      <span className="w-6 text-center text-sm font-bold text-accent-dynamic">{i + 1}</span>
                      {track.image_url && (
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-theme-surface-3 flex-shrink-0">
                          <Image src={track.image_url} alt="" fill className="object-cover" sizes="40px" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-theme truncate">{name}</p>
                        <p className="text-xs text-theme-tertiary truncate">{artist}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-accent-dynamic">{track.play_count}×</p>
                        <p className="text-[10px] text-theme-tertiary">{replayFactor(track.play_count)}x avg</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-theme mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-spotify-green" /> Favorite Artists
              </h2>
              <div className="space-y-3">
                {artists.map((artist: any, i: number) => (
                  <Link
                    key={i}
                    href={artist.spotify_id ? `/dashboard/artists/${artist.spotify_id}` : "#"}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.03] transition-colors"
                  >
                    <span className="w-6 text-center text-sm font-bold text-spotify-green">{i + 1}</span>
                    {artist.image_url && (
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-theme-surface-3 flex-shrink-0">
                        <Image src={artist.image_url} alt="" fill className="object-cover" sizes="40px" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-theme truncate">{artist.name}</p>
                    </div>
                    <span className="text-sm font-semibold text-theme-secondary">{artist.play_count} plays</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
