"use client";

import { useQuery } from "@tanstack/react-query";
import { Award, ChevronDown, ChevronUp, Crown, Medal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { ListSkeleton } from "@/components/ui/loading-skeleton";
import { TimeRangeSelector } from "@/components/ui/time-range-selector";
import { api } from "@/lib/api";

const RANK_COLORS: Record<number, string> = {
  1: "from-amber-500 to-yellow-400",
  2: "from-gray-300 to-gray-400",
  3: "from-amber-700 to-amber-600",
};

const RANK_ICONS: Record<number, any> = {
  1: Crown,
  2: Medal,
  3: Award,
};

export default function Top50Page() {
  const [period, setPeriod] = useState("all_time");
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["top-tracks-50", period],
    queryFn: () => api.get<any>(`/api/v1/tracks/top?period=${period}&limit=50`),
  });

  const items = data?.items || [];
  const maxPlays = items[0]?.play_count || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-400" /> Your Top 50
          </h1>
          <p className="text-theme-secondary mt-1">Your all-time most played tracks ranked</p>
        </div>
        <TimeRangeSelector value={period} onChange={setPeriod} />
      </div>

      {isLoading ? (
        <ListSkeleton rows={15} />
      ) : items.length > 0 ? (
        <StaggerContainer className="space-y-2">
          {items.map((track: any, i: number) => {
            const rank = track.rank || i + 1;
            const isTop3 = rank <= 3;
            const RankIcon = RANK_ICONS[rank];
            const barWidth = (track.play_count / maxPlays) * 100;
            const [trackName, artistName] = (track.name || "").split(" — ");
            const isExpanded = expanded === rank;

            return (
              <StaggerItem key={track.spotify_id || i}>
                <div
                  className={`glass-card overflow-hidden transition-all duration-300 ${isTop3 ? "ring-1 ring-accent-dynamic/20" : ""}`}
                >
                  <div
                    className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : rank)}
                  >
                    {/* Rank */}
                    <div
                      className={`w-8 sm:w-10 h-8 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isTop3
                          ? `bg-gradient-to-br ${RANK_COLORS[rank]} text-black font-bold`
                          : "bg-theme-surface-3 text-theme-tertiary"
                      }`}
                    >
                      {RankIcon ? (
                        <RankIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <span className="text-sm">{rank}</span>
                      )}
                    </div>

                    {/* Album art */}
                    {track.image_url && (
                      <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-theme-surface-3 flex-shrink-0">
                        <Image
                          src={track.image_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    )}

                    {/* Track info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-theme">{trackName}</p>
                      <p className="text-xs text-theme-tertiary truncate">{artistName}</p>
                    </div>

                    {/* Play count + bar */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="hidden sm:block w-24">
                        <div className="w-full h-1.5 rounded-full bg-theme-surface-3 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${barWidth}%`, backgroundColor: "rgb(var(--accent))" }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-accent-dynamic tabular-nums min-w-[50px] text-right">
                        {track.play_count}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-theme-tertiary" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-theme-tertiary" />
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-white/5 animate-fade-in">
                      <div className="flex flex-wrap gap-4 text-xs text-theme-tertiary">
                        <span>
                          Spotify ID:{" "}
                          <span className="font-mono text-theme-secondary">{track.spotify_id}</span>
                        </span>
                        <span>
                          Share of plays:{" "}
                          <span className="text-accent-dynamic">{Math.round(barWidth)}%</span> of
                          top track
                        </span>
                      </div>
                      {track.spotify_id && (
                        <Link
                          href={`/dashboard/tracks/${track.spotify_id}`}
                          className="inline-block mt-2 text-xs text-accent-dynamic hover:underline"
                        >
                          View track details →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      ) : (
        <div className="glass-card p-12 text-center text-theme-tertiary">No track data yet</div>
      )}
    </div>
  );
}
