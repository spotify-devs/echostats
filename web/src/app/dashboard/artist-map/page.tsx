"use client";

import { useQuery } from "@tanstack/react-query";
import { Network } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PieChart } from "@/components/charts/pie-chart";
import { ArtistMonogram } from "@/components/music/artist-monogram";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { ChartSkeleton, ListSkeleton } from "@/components/ui/loading-skeleton";
import { api } from "@/lib/api";

export default function ArtistMapPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["top-artists-map", "all_time"],
    queryFn: () => api.get<any>("/api/v1/artists/top?period=all_time&limit=50"),
  });

  const { data: genreData } = useQuery({
    queryKey: ["genre-distribution-map", "all_time"],
    queryFn: () => api.get<any>("/api/v1/genres/distribution?period=all_time"),
  });

  const artists = data?.items || [];
  const totalPlays = artists.reduce((sum: number, a: any) => sum + (a.play_count || 0), 0);

  const artistPie = artists.slice(0, 8).map((a: any) => ({
    name: a.name,
    value: a.play_count || 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center gap-2">
          <Network className="w-6 h-6 text-accent-dynamic" /> Artist Map
        </h1>
        <p className="text-theme-secondary mt-1">
          Explore connections between your favorite artists
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <ChartSkeleton />
          <ListSkeleton rows={8} />
        </div>
      ) : (
        <>
          {/* Artist distribution */}
          <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StaggerItem>
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-theme mb-4">Listening Share</h2>
                {artistPie.length > 0 ? (
                  <PieChart data={artistPie} height={300} />
                ) : (
                  <p className="text-theme-tertiary text-center py-12">No data</p>
                )}
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-theme mb-4">Artist Stats</h2>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-theme-surface-2 text-center">
                    <p className="text-3xl font-bold text-theme">{artists.length}</p>
                    <p className="text-xs text-theme-tertiary">Total Artists</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-theme-surface-2 text-center">
                      <p className="text-xl font-bold text-theme">{totalPlays.toLocaleString()}</p>
                      <p className="text-[10px] text-theme-tertiary">Total Artist Plays</p>
                    </div>
                    <div className="p-4 rounded-xl bg-theme-surface-2 text-center">
                      <p className="text-xl font-bold text-theme">
                        {artists.length > 0 ? Math.round(totalPlays / artists.length) : 0}
                      </p>
                      <p className="text-[10px] text-theme-tertiary">Avg Plays / Artist</p>
                    </div>
                  </div>
                </div>
              </div>
            </StaggerItem>
          </StaggerContainer>

          {/* Artist Grid */}
          <FadeIn delay={0.2}>
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-theme mb-4">
                All Artists ({artists.length})
              </h2>
              <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {artists.map((artist: any, i: number) => {
                  const sharePercent =
                    totalPlays > 0 ? Math.round((artist.play_count / totalPlays) * 100) : 0;
                  return (
                    <StaggerItem key={artist.spotify_id || i}>
                      <Link
                        href={artist.spotify_id ? `/dashboard/artists/${artist.spotify_id}` : "#"}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                      >
                        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-theme-surface-3 ring-2 ring-transparent group-hover:ring-accent-dynamic/30 transition-all">
                          {artist.image_url ? (
                            <Image
                              src={artist.image_url}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <ArtistMonogram name={artist.name} textSize="text-base" />
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium text-theme truncate max-w-[100px]">
                            {artist.name}
                          </p>
                          <p className="text-[10px] text-accent-dynamic">
                            {artist.play_count} plays · {sharePercent}%
                          </p>
                        </div>
                      </Link>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            </div>
          </FadeIn>
        </>
      )}
    </div>
  );
}
