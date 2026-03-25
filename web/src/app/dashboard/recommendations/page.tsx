"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles, Disc3, ListMusic, Music } from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";
import { ListSkeleton } from "@/components/ui/loading-skeleton";

export default function BrowsePage() {
  const { data: newReleases, isLoading: loadingReleases } = useQuery({
    queryKey: ["browse-new-releases"],
    queryFn: () => api.get<any>("/api/v1/browse/new-releases?limit=12"),
    retry: false,
  });

  const { data: featured, isLoading: loadingFeatured } = useQuery({
    queryKey: ["browse-featured"],
    queryFn: () => api.get<any>("/api/v1/browse/featured-playlists?limit=8"),
    retry: false,
  });

  const { data: cats, isLoading: loadingCats } = useQuery({
    queryKey: ["browse-categories"],
    queryFn: () => api.get<any>("/api/v1/browse/categories?limit=20"),
    retry: false,
  });

  const hasError = !newReleases?.items && !featured?.items && !cats?.items;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-accent-amber" /> Discover
        </h1>
        <p className="text-theme-secondary mt-1">Explore new music, playlists, and categories</p>
      </div>

      {hasError && !loadingReleases && !loadingFeatured && (
        <div className="glass-card p-12 text-center space-y-4">
          <Sparkles className="w-12 h-12 text-accent-amber/30 mx-auto" />
          <p className="text-theme-secondary">Connect your Spotify account to explore new music</p>
          <p className="text-sm text-theme-tertiary">Browse features require a live Spotify connection</p>
        </div>
      )}

      {/* New Releases */}
      <section>
        <h2 className="text-lg font-semibold text-theme mb-4 flex items-center gap-2">
          <Disc3 className="w-5 h-5 text-accent-dynamic" /> New Releases
        </h2>
        {loadingReleases ? (
          <ListSkeleton rows={4} />
        ) : (newReleases?.items || []).length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {newReleases.items.map((album: any) => (
              <div key={album.id} className="glass-card-hover p-3 space-y-2 group">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-theme-surface-3">
                  {album.image ? (
                    <Image src={album.image} alt={album.name} fill className="object-cover group-hover:scale-105 transition-transform" sizes="200px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Disc3 className="w-8 h-8 text-theme-tertiary" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-theme truncate">{album.name}</p>
                  <p className="text-xs text-theme-tertiary truncate">{album.artists}</p>
                  <p className="text-[10px] text-theme-tertiary mt-0.5">{album.release_date} · {album.total_tracks} tracks</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Featured Playlists */}
      <section>
        <h2 className="text-lg font-semibold text-theme mb-4 flex items-center gap-2">
          <ListMusic className="w-5 h-5 text-spotify-green" /> Featured Playlists
          {featured?.message && <span className="text-sm font-normal text-theme-tertiary">— {featured.message}</span>}
        </h2>
        {loadingFeatured ? (
          <ListSkeleton rows={4} />
        ) : (featured?.items || []).length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured.items.map((pl: any) => (
              <div key={pl.id} className="glass-card-hover p-4 space-y-3 group">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-theme-surface-3">
                  {pl.image ? (
                    <Image src={pl.image} alt={pl.name} fill className="object-cover group-hover:scale-105 transition-transform" sizes="200px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ListMusic className="w-8 h-8 text-theme-tertiary" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-theme truncate">{pl.name}</p>
                  <p className="text-xs text-theme-tertiary truncate">{pl.description}</p>
                  <p className="text-[10px] text-theme-tertiary mt-0.5">{pl.tracks_total} tracks · by {pl.owner}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Categories */}
      <section>
        <h2 className="text-lg font-semibold text-theme mb-4 flex items-center gap-2">
          <Music className="w-5 h-5 text-accent-pink" /> Browse Categories
        </h2>
        {loadingCats ? (
          <ListSkeleton rows={4} />
        ) : (cats?.items || []).length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {cats.items.map((cat: any) => (
              <div key={cat.id} className="glass-card-hover p-3 flex items-center gap-3 group">
                {cat.image && (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-theme-surface-3 flex-shrink-0">
                    <Image src={cat.image} alt="" fill className="object-cover" sizes="48px" />
                  </div>
                )}
                <p className="text-sm font-medium text-theme truncate">{cat.name}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
