"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { api } from "@/lib/api";
import { ArtistCard } from "@/components/music/artist-card";
import { TimeRangeSelector } from "@/components/ui/time-range-selector";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { ListSkeleton } from "@/components/ui/loading-skeleton";

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-spotify-green" /> Top Artists
          </h1>
          <p className="text-white/50 mt-1">Artists you listen to the most</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <TimeRangeSelector value={period} onChange={setPeriod} />
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onClear={() => { setStartDate(""); setEndDate(""); }}
          />
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={10} />
      ) : (
        <div className="glass-card divide-y divide-white/5">
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
            <p className="p-8 text-center text-white/40">No artist data yet. Start listening!</p>
          )}
        </div>
      )}
    </div>
  );
}
