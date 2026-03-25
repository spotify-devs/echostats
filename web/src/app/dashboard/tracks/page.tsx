"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, LayoutGrid, Music, Table2 } from "lucide-react";
import { useState } from "react";
import { TrackCard } from "@/components/music/track-card";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { ListSkeleton } from "@/components/ui/loading-skeleton";
import { TimeRangeSelector } from "@/components/ui/time-range-selector";
import { api } from "@/lib/api";
import { exportTopItems } from "@/lib/export";

export default function TopTracksPage() {
  const [period, setPeriod] = useState("all_time");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["top-tracks", period, startDate, endDate],
    queryFn: () => {
      let url = `/api/v1/tracks/top?period=${period}&limit=50`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      return api.get<any>(url);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Music className="w-6 h-6 text-accent-purple" /> Top Tracks
          </h1>
          <p className="text-white/50 mt-1">Your most played tracks</p>
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
            onClick={() => data?.items && exportTopItems(data.items, "tracks")}
            disabled={!data?.items?.length}
            className="flex items-center gap-2 px-3 py-2 text-sm text-theme-secondary bg-theme-surface-2 rounded-xl border border-white/10 hover:border-white/20 transition-all disabled:opacity-30"
          >
            <Download className="w-4 h-4" />
          </button>
          <div className="flex gap-1 p-1 bg-surface-2 rounded-lg border border-white/5">
            <button
              onClick={() => setView("cards")}
              className={`p-1.5 rounded-md ${view === "cards" ? "bg-accent-dynamic/20 text-accent-dynamic" : "text-white/40"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("table")}
              className={`p-1.5 rounded-md ${view === "table" ? "bg-accent-dynamic/20 text-accent-dynamic" : "text-white/40"}`}
            >
              <Table2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={10} />
      ) : (
        <div className="glass-card divide-y divide-white/5">
          {(data?.items || []).map((item: any, idx: number) => (
            <TrackCard
              key={item.spotify_id || idx}
              rank={item.rank || idx + 1}
              name={item.name?.split(" — ")[0] || item.name}
              artist={item.name?.split(" — ")[1] || ""}
              albumImageUrl={item.image_url}
              playCount={item.play_count}
            />
          ))}
          {(!data?.items || data.items.length === 0) && (
            <p className="p-8 text-center text-white/40">No track data yet. Start listening!</p>
          )}
        </div>
      )}
    </div>
  );
}
