"use client";

import { useQuery } from "@tanstack/react-query";
import { Disc3, Music } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { ListSkeleton } from "@/components/ui/loading-skeleton";
import { DEFAULT_PERIOD, TimeRangeSelector } from "@/components/ui/time-range-selector";
import { api } from "@/lib/api";

export default function AlbumsPage() {
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["top-albums", period, startDate, endDate],
    queryFn: () => {
      let url = `/api/v1/albums/top?period=${period}&limit=50`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      return api.get<any>(url);
    },
  });

  const albums = (data?.items || []).map((item: any) => {
    const parts = (item.name || "").split(" — ");
    return {
      name: parts[0] || "Unknown Album",
      artist: parts[1] || "",
      imageUrl: item.image_url || "",
      plays: item.play_count || 0,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center gap-2">
            <Disc3 className="w-6 h-6 text-accent-dynamic" /> Albums
          </h1>
          <p className="text-theme-secondary mt-1">
            {data?.total || albums.length} albums from your listening history
          </p>
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
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={8} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {albums.map((album: any, i: number) => (
            <div key={i} className="glass-card-hover p-3 space-y-3 group">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-theme-surface-3">
                {album.imageUrl ? (
                  <Image
                    src={album.imageUrl}
                    alt={album.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="200px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Disc3 className="w-12 h-12 text-theme-tertiary" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Music className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-theme truncate">{album.name}</p>
                {album.artist && (
                  <p className="text-xs text-theme-tertiary truncate">{album.artist}</p>
                )}
                <p className="text-xs text-accent-dynamic mt-0.5">{album.plays} plays</p>
              </div>
            </div>
          ))}
          {albums.length === 0 && (
            <p className="col-span-full p-8 text-center text-theme-tertiary">
              No album data yet. Albums will appear after your listening history is synced.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
