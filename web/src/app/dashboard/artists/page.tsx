"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, Grid3x3, LayoutGrid, List, Users } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { ArtistCard } from "@/components/music/artist-card";
import { ArtistMonogram } from "@/components/music/artist-monogram";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { ListSkeleton } from "@/components/ui/loading-skeleton";
import { DEFAULT_PERIOD, TimeRangeSelector } from "@/components/ui/time-range-selector";
import { api } from "@/lib/api";
import type { TopItem } from "@/lib/types";
import { exportTopItems } from "@/lib/export";

type ViewMode = "list" | "grid" | "compact";

export default function TopArtistsPage() {
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [view, setView] = useState<ViewMode>("list");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["top-artists", period, startDate, endDate],
    queryFn: () => {
      let url = `/api/v1/artists/top?period=${period}&limit=50`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      return api.get<{ items: TopItem[] }>(url);
    },
  });

  const items = data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center gap-2">
            <Users className="w-6 h-6 text-spotify-green" /> Top Artists
          </h1>
          <p className="text-theme-secondary mt-1">Artists you listen to the most</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <TimeRangeSelector value={period} onChange={setPeriod} />
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onClear={() => {
              setStartDate("");
              setEndDate("");
            }}
          />
          <button
            onClick={() => items.length && exportTopItems(items, "artists")}
            disabled={!items.length}
            className="flex items-center gap-2 px-3 py-2 text-sm text-theme-secondary bg-theme-surface-2 rounded-xl border border-current/[0.1] hover:border-current/[0.2] transition-all disabled:opacity-30"
          >
            <Download className="w-4 h-4" />
          </button>
          <div className="flex gap-1 p-1 bg-surface-2 rounded-lg border border-current/[0.08]">
            {[
              { mode: "list" as const, icon: List, label: "List" },
              { mode: "grid" as const, icon: LayoutGrid, label: "Grid" },
              { mode: "compact" as const, icon: Grid3x3, label: "Compact" },
            ].map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                title={label}
                className={`p-1.5 rounded-md ${view === mode ? "bg-accent-dynamic/20 text-accent-dynamic" : "text-theme-tertiary hover:text-theme-secondary"}`}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={10} />
      ) : items.length === 0 ? (
        <div className="glass-card p-8 text-center text-theme-tertiary">
          No artist data yet. Start listening!
        </div>
      ) : view === "list" ? (
        <div className="glass-card divide-y divide-current/[0.08]">
          {items.map((item: TopItem, idx: number) => (
            <ArtistCard
              key={item.spotify_id || idx}
              rank={item.rank || idx + 1}
              name={item.name}
              imageUrl={item.image_url}
              playCount={item.play_count}
            />
          ))}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((item: TopItem, idx: number) => (
            <div
              key={item.spotify_id || idx}
              className="glass-card-hover p-4 flex flex-col items-center gap-3 group"
            >
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-surface-3 ring-2 ring-current/[0.08] group-hover:ring-accent-dynamic/30 transition-all">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                ) : (
                  <ArtistMonogram name={item.name} textSize="text-xl" />
                )}
              </div>
              <div className="text-center w-full">
                <span className="text-xs text-theme-tertiary font-mono">
                  #{item.rank || idx + 1}
                </span>
                <p className="text-sm font-semibold text-theme truncate mt-0.5">{item.name}</p>
                <p className="text-xs text-accent-dynamic mt-1">
                  {item.play_count?.toLocaleString()} plays
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-current/[0.08] text-theme-tertiary text-xs uppercase tracking-wider">
                <th className="p-3 text-left w-12">#</th>
                <th className="p-3 text-left">Artist</th>
                <th className="p-3 text-right">Plays</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-current/[0.06]">
              {items.map((item: TopItem, idx: number) => (
                <tr
                  key={item.spotify_id || idx}
                  className="hover:bg-current/[0.03] transition-colors"
                >
                  <td className="p-3 text-theme-tertiary font-mono">{item.rank || idx + 1}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden bg-surface-3 flex-shrink-0">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        ) : (
                          <ArtistMonogram name={item.name} textSize="text-[10px]" />
                        )}
                      </div>
                      <span className="font-medium text-theme truncate">{item.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right text-theme-tertiary tabular-nums">
                    {item.play_count?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
