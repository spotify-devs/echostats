"use client";

import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { useState } from "react";
import { ArtistCard } from "@/components/music/artist-card";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { ListSkeleton } from "@/components/ui/loading-skeleton";
import { TimeRangeSelector } from "@/components/ui/time-range-selector";
import { api } from "@/lib/api";

export default function TopArtistsPage() {
  const [period, setPeriod] = useState("all_time");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["top-artists", period, startDate, endDate],
    queryFn: () => {
      let url = `/api/v1/artists/top?period=${period}&limit=50`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      return api.get<any>(url);
    },
  });

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
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={10} />
      ) : (
        <div className="glass-card divide-y divide-current/[0.08]">
          {(data?.items || []).map((item: any, idx: number) => (
            <ArtistCard
              key={item.spotify_id || idx}
              rank={item.rank || idx + 1}
              name={item.name}
              imageUrl={item.image_url}
              playCount={item.play_count}
            />
          ))}
          {(!data?.items || data.items.length === 0) && (
            <p className="p-8 text-center text-theme-tertiary">No artist data yet. Start listening!</p>
          )}
        </div>
      )}
    </div>
  );
}
