"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { TrackCard } from "@/components/music/track-card";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { ListSkeleton } from "@/components/ui/loading-skeleton";

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Reset to page 1 when date range changes
  useEffect(() => {
    setPage(1);
  }, [startDate, endDate]);

  const { data, isLoading } = useQuery({
    queryKey: ["history", page, startDate, endDate],
    queryFn: () => {
      let url = `/api/v1/history?page=${page}&limit=50`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      return api.get<any>(url);
    },
  });

  const items = data?.items || [];
  const totalPages = data?.pages || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-accent-amber" /> Listening History
          </h1>
          <p className="text-white/50 mt-1">{data?.total?.toLocaleString() || 0} total plays</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onClear={() => { setStartDate(""); setEndDate(""); }}
          />
          <button className="btn-primary flex items-center gap-2 text-sm">
            <Upload className="w-4 h-4" /> Import History
          </button>
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={10} />
      ) : (
        <>
          <div className="glass-card divide-y divide-white/5">
            {items.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between">
                <TrackCard
                  name={item.track?.name || "Unknown"}
                  artist={item.track?.artist_name || "Unknown"}
                  albumImageUrl={item.track?.album_image_url}
                  duration={item.track?.duration_ms ? `${Math.floor(item.track.duration_ms / 60000)}:${String(Math.floor((item.track.duration_ms % 60000) / 1000)).padStart(2, "0")}` : undefined}
                />
                <span className="text-xs text-white/30 pr-4 whitespace-nowrap">
                  {new Date(item.played_at).toLocaleDateString()} {new Date(item.played_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
            {items.length === 0 && (
              <p className="p-8 text-center text-white/40">No listening history yet.</p>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-4 py-2 text-sm glass-card hover:bg-white/5 disabled:opacity-30 transition-all">
                Previous
              </button>
              <span className="text-sm text-white/40">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-4 py-2 text-sm glass-card hover:bg-white/5 disabled:opacity-30 transition-all">
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
