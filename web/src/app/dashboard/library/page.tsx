"use client";

import { useQuery } from "@tanstack/react-query";
import { Disc3, Library, Users } from "lucide-react";
import Image from "next/image";
import { ArtistMonogram } from "@/components/music/artist-monogram";
import { ListSkeleton } from "@/components/ui/loading-skeleton";
import { api } from "@/lib/api";

export default function LibraryPage() {
  const { data: followedArtists, isLoading: loadingArtists } = useQuery({
    queryKey: ["library-followed-artists"],
    queryFn: () => api.get<any>("/api/v1/library/followed-artists?limit=50"),
    retry: false,
  });

  const { data: savedAlbums, isLoading: loadingAlbums } = useQuery({
    queryKey: ["library-saved-albums"],
    queryFn: () => api.get<any>("/api/v1/library/saved-albums?limit=50"),
    retry: false,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
          <Library className="w-6 h-6 text-accent-dynamic" /> Library
        </h1>
        <p className="text-theme-secondary mt-1">Your saved content on Spotify</p>
      </div>

      {/* Followed Artists */}
      <section>
        <h2 className="text-lg font-semibold text-theme mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-spotify-green" /> Followed Artists
          {followedArtists?.total !== undefined && (
            <span className="text-sm font-normal text-theme-tertiary">
              ({followedArtists.total})
            </span>
          )}
        </h2>
        {loadingArtists ? (
          <ListSkeleton rows={5} />
        ) : (followedArtists?.items || []).length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {followedArtists.items.map((artist: any) => (
              <div key={artist.id} className="glass-card-hover p-4 text-center space-y-3 group">
                <div className="relative w-20 h-20 rounded-full overflow-hidden bg-theme-surface-3 mx-auto">
                  {artist.image ? (
                    <Image
                      src={artist.image}
                      alt={artist.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="80px"
                    />
                  ) : (
                    <ArtistMonogram name={artist.name} textSize="text-xl" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-theme truncate">{artist.name}</p>
                  <p className="text-xs text-theme-tertiary">
                    {artist.followers?.toLocaleString()} followers
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 text-center text-theme-tertiary">
            <p>Connect Spotify to see your followed artists</p>
          </div>
        )}
      </section>

      {/* Saved Albums */}
      <section>
        <h2 className="text-lg font-semibold text-theme mb-4 flex items-center gap-2">
          <Disc3 className="w-5 h-5 text-accent-dynamic" /> Saved Albums
          {savedAlbums?.total !== undefined && (
            <span className="text-sm font-normal text-theme-tertiary">({savedAlbums.total})</span>
          )}
        </h2>
        {loadingAlbums ? (
          <ListSkeleton rows={5} />
        ) : (savedAlbums?.items || []).length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {savedAlbums.items.map((album: any) => (
              <div key={album.id} className="glass-card-hover p-3 space-y-2 group">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-theme-surface-3">
                  {album.image ? (
                    <Image
                      src={album.image}
                      alt={album.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="200px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Disc3 className="w-8 h-8 text-theme-tertiary" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-theme truncate">{album.name}</p>
                  <p className="text-xs text-theme-tertiary truncate">{album.artists}</p>
                  <p className="text-[10px] text-theme-tertiary">{album.total_tracks} tracks</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 text-center text-theme-tertiary">
            <p>Connect Spotify to see your saved albums</p>
          </div>
        )}
      </section>
    </div>
  );
}
