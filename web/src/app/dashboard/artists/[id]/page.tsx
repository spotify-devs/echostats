"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Music, Disc3, ExternalLink, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";
import { BarChart } from "@/components/charts/bar-chart";
import { ListSkeleton, ChartSkeleton } from "@/components/ui/loading-skeleton";

export default function ArtistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: artist, isLoading } = useQuery({
    queryKey: ["artist", id],
    queryFn: () => api.get<any>(`/api/v1/artists/${id}`),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <ChartSkeleton />
        <ListSkeleton rows={5} />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="text-center py-20">
        <p className="text-theme-secondary">Artist not found</p>
        <Link href="/dashboard/artists" className="text-accent-dynamic text-sm mt-2 inline-block">
          ← Back to Artists
        </Link>
      </div>
    );
  }

  const genreData = (artist.genres || []).map((g: string, i: number) => ({
    name: g,
    value: 1,
  }));

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/dashboard/artists" className="inline-flex items-center gap-2 text-sm text-theme-secondary hover:text-theme transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Artists
      </Link>

      {/* Header */}
      <div className="glass-card p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-32 h-32 rounded-full overflow-hidden bg-theme-surface-3 flex-shrink-0 ring-4 ring-accent-dynamic/20">
          {artist.images?.[0]?.url ? (
            <Image src={artist.images[0].url} alt={artist.name} fill className="object-cover" sizes="128px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Users className="w-12 h-12 text-theme-tertiary" />
            </div>
          )}
        </div>
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-3xl font-bold text-theme">{artist.name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 justify-center sm:justify-start">
            <span className="text-sm text-theme-secondary">
              <Users className="w-4 h-4 inline mr-1" />
              {(artist.followers || 0).toLocaleString()} followers
            </span>
            <span className="text-sm text-theme-secondary">
              Popularity: {artist.popularity}/100
            </span>
          </div>
          {artist.genres?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
              {artist.genres.map((g: string) => (
                <span key={g} className="px-2.5 py-1 text-xs rounded-full bg-accent-dynamic/15 text-accent-dynamic">
                  {g}
                </span>
              ))}
            </div>
          )}
          {artist.external_url && (
            <a
              href={artist.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-sm text-spotify-green hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open in Spotify
            </a>
          )}
        </div>

        {/* Popularity meter */}
        <div className="flex flex-col items-center gap-1">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="35" fill="none" stroke="rgb(var(--surface-3))" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="35" fill="none"
                stroke="rgb(var(--accent))"
                strokeWidth="6"
                strokeDasharray={`${(artist.popularity / 100) * 220} 220`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-theme">
              {artist.popularity}
            </span>
          </div>
          <span className="text-[10px] text-theme-tertiary uppercase tracking-wider">Popularity</span>
        </div>
      </div>
    </div>
  );
}
