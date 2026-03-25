"use client";

import { useQuery } from "@tanstack/react-query";
import { Disc3, Music } from "lucide-react";
import Image from "next/image";
import { ListSkeleton } from "@/components/ui/loading-skeleton";
import { api } from "@/lib/api";

export default function AlbumsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["top-tracks-for-albums", "all_time"],
    queryFn: () => api.get<any>("/api/v1/tracks/top?period=all_time&limit=50"),
  });

  // Extract unique albums from top tracks
  const albums = (() => {
    if (!data?.items) return [];
    const seen = new Set<string>();
    const result: { name: string; artist: string; imageUrl: string; plays: number }[] = [];

    for (const track of data.items) {
      const [trackName, artistName] = (track.name || "").split(" — ");
      const albumKey = `${track.image_url}-${artistName}`;
      if (track.image_url && !seen.has(albumKey)) {
        seen.add(albumKey);
        result.push({
          name: trackName || "Unknown Album",
          artist: artistName || "Unknown Artist",
          imageUrl: track.image_url,
          plays: track.play_count || 0,
        });
      }
    }
    return result;
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center gap-2">
          <Disc3 className="w-6 h-6 text-accent-dynamic" /> Albums
        </h1>
        <p className="text-theme-secondary mt-1">{albums.length} albums from your top tracks</p>
      </div>

      {isLoading ? (
        <ListSkeleton rows={8} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {albums.map((album, i) => (
            <div key={i} className="glass-card-hover p-3 space-y-3 group">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-theme-surface-3">
                <Image
                  src={album.imageUrl}
                  alt={album.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="200px"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Music className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-theme truncate">{album.name}</p>
                <p className="text-xs text-theme-tertiary truncate">{album.artist}</p>
                <p className="text-xs text-accent-dynamic mt-0.5">{album.plays} plays</p>
              </div>
            </div>
          ))}
          {albums.length === 0 && (
            <p className="col-span-full p-8 text-center text-theme-tertiary">No album data yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
