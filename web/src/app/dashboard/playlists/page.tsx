"use client";

import { useQuery } from "@tanstack/react-query";
import { ListMusic } from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";
import { ListSkeleton } from "@/components/ui/loading-skeleton";

export default function PlaylistsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["playlists"],
    queryFn: () => api.get<any>("/api/v1/playlists/"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ListMusic className="w-6 h-6 text-spotify-green" /> Playlists
        </h1>
        <p className="text-white/50 mt-1">{data?.total || 0} playlists</p>
      </div>

      {isLoading ? (
        <ListSkeleton rows={8} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(data?.items || []).map((playlist: any) => (
            <div key={playlist.spotify_id} className="glass-card-hover p-4 space-y-3">
              <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-surface-3">
                {playlist.images?.[0]?.url ? (
                  <Image src={playlist.images[0].url} alt={playlist.name} fill className="object-cover" sizes="300px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ListMusic className="w-12 h-12 text-white/10" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-white truncate">{playlist.name}</p>
                <p className="text-xs text-white/40">{playlist.total_tracks} tracks</p>
              </div>
            </div>
          ))}
          {(!data?.items || data.items.length === 0) && (
            <p className="col-span-full p-8 text-center text-white/40">No playlists found.</p>
          )}
        </div>
      )}
    </div>
  );
}
