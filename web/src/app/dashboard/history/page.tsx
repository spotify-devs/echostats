"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Download, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { TrackCard } from "@/components/music/track-card";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { ImportHistoryModal } from "@/components/ui/import-modal";
import { ListSkeleton } from "@/components/ui/loading-skeleton";
import { api } from "@/lib/api";
import type { ListeningHistoryItem, PaginatedResponse } from "@/lib/types";
import { exportListeningHistory } from "@/lib/export";

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const queryClient = useQueryClient();

  // Reset to page 1 when date range changes
  useEffect(() => {
    setPage(1);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["history", page, startDate, endDate],
    queryFn: () => {
      let url = `/api/v1/history?page=${page}&limit=50`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      return api.get<PaginatedResponse<ListeningHistoryItem>>(url);
    },
  });

  const items = data?.items || [];
  const totalPages = data?.pages || 1;

  return (
    <div className="space-y-6">
      <FadeIn direction="none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center gap-2">
              <Clock className="w-6 h-6 text-accent-amber" /> Listening History
            </h1>
            <p className="text-theme-secondary mt-1">
              {data?.total?.toLocaleString() || 0} total plays
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
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
              onClick={() => data?.items && exportListeningHistory(data.items)}
              disabled={!data?.items?.length}
              className="flex items-center gap-2 px-3 py-2 text-sm text-theme-secondary bg-theme-surface-2 rounded-xl border border-current/[0.1] hover:border-current/[0.2] transition-all disabled:opacity-30"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Upload className="w-4 h-4" /> Import History
            </button>
          </div>
        </div>
      </FadeIn>

      {/* Import Modal */}
      <ImportHistoryModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onComplete={() => queryClient.invalidateQueries({ queryKey: ["history"] })}
      />

      {isLoading ? (
        <ListSkeleton rows={10} />
      ) : (
        <>
          <StaggerContainer className="glass-card divide-y divide-current/[0.08]">
            {items.map((item: ListeningHistoryItem, idx: number) => (
              <StaggerItem key={idx}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <TrackCard
                      name={item.track?.name || "Unknown"}
                      artist={item.track?.artist_name || "Unknown"}
                      albumImageUrl={item.track?.album_image_url}
                      duration={
                        item.track?.duration_ms
                          ? `${Math.floor(item.track.duration_ms / 60000)}:${String(Math.floor((item.track.duration_ms % 60000) / 1000)).padStart(2, "0")}`
                          : undefined
                      }
                    />
                  </div>
                  <span className="text-xs text-theme-tertiary pr-4 whitespace-nowrap flex-shrink-0">
                    {new Date(item.played_at).toLocaleDateString()}{" "}
                    {new Date(item.played_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </StaggerItem>
            ))}
            {items.length === 0 && (
              <p className="p-8 text-center text-theme-tertiary">No listening history yet.</p>
            )}
          </StaggerContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 text-sm glass-card hover:bg-current/[0.05] disabled:opacity-30 transition-all"
              >
                Previous
              </button>
              <span className="text-sm text-theme-tertiary">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 text-sm glass-card hover:bg-current/[0.05] disabled:opacity-30 transition-all"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
