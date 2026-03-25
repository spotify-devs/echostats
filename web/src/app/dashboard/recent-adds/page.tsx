"use client";

import { useQuery } from "@tanstack/react-query";
import { Music, Zap } from "lucide-react";
import Image from "next/image";
import { ListSkeleton } from "@/components/ui/loading-skeleton";
import { api } from "@/lib/api";

export default function RecentlyAddedPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["library-saved-albums"],
    queryFn: () => api.get<any>("/api/v1/library/saved-albums?limit=50"),
    retry: false,
  });

  const { data: tracksData } = useQuery({
    queryKey: ["top-tracks-recent", "month"],
    queryFn: () => api.get<any>("/api/v1/tracks/top?period=month&limit=20"),
    retry: false,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center gap-2">
          <Zap className="w-6 h-6 text-accent-amber" /> Recently Added
        </h1>
        <p className="text-theme-secondary mt-1">Latest additions to your library</p>
      </div>

      {/* Recently discovered tracks */}
      <section>
        <h2 className="text-lg font-semibold text-theme mb-4">New Tracks This Month</h2>
        {!tracksData?.items?.length ? (
          <div className="glass-card p-8 text-center text-theme-tertiary">
            <p>Connect Spotify to see recently added tracks</p>
          </div>
        ) : (
          <div className="glass-card divide-y divide-current/[0.08]">
            {tracksData.items.map((track: any, i: number) => (
              <div
                key={i}
                className="flex items-center gap-4 px-4 py-3 hover:bg-current/[0.03] transition-colors"
              >
                <span className="w-6 text-center text-sm text-theme-tertiary font-mono">
                  {i + 1}
                </span>
                {track.image_url && (
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-theme-surface-3">
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
                  <p className="text-sm font-medium text-theme truncate">
                    {track.name?.split(" — ")[0]}
                  </p>
                  <p className="text-xs text-theme-tertiary truncate">
                    {track.name?.split(" — ")[1]}
                  </p>
                </div>
                <span className="text-xs text-accent-dynamic">{track.play_count} plays</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Saved Albums */}
      <section>
        <h2 className="text-lg font-semibold text-theme mb-4">Saved Albums</h2>
        {isLoading ? (
          <ListSkeleton rows={5} />
        ) : (data?.items || []).length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {data.items.map((album: any) => (
              <div key={album.id} className="glass-card-hover p-3 space-y-2 group">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-theme-surface-3">
                  {album.image ? (
                    <Image
                      src={album.image}
                      alt=""
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="200px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-8 h-8 text-theme-tertiary" />
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-theme truncate">{album.name}</p>
                <p className="text-xs text-theme-tertiary truncate">{album.artists}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 text-center text-theme-tertiary">
            Connect Spotify to see saved albums
          </div>
        )}
      </section>
    </div>
  );
}
