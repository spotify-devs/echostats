"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RecentFeed() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["recent-feed"],
    queryFn: () => api.get<any>("/api/v1/history?page=1&limit=10"),
    refetchInterval: 60000, // Auto-refresh every minute
  });

  const items = data?.items || [];

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between p-4 border-b border-current/[0.08]">
        <h2 className="text-lg font-semibold text-theme flex items-center gap-2">
          <Clock className="w-5 h-5 text-accent-dynamic" /> Recently Played
        </h2>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-1.5 rounded-lg hover:bg-current/[0.05] text-theme-tertiary hover:text-theme transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="divide-y divide-current/[0.08]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className="skeleton w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3.5 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-current/[0.08] max-h-[400px] overflow-y-auto">
          {items.map((item: any, i: number) => (
            <Link
              key={i}
              href={item.track?.spotify_id ? `/dashboard/tracks/${item.track.spotify_id}` : "#"}
              className="flex items-center gap-3 px-4 py-3 hover:bg-current/[0.03] transition-colors group"
            >
              <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-theme-surface-3 flex-shrink-0">
                {item.track?.album_image_url ? (
                  <Image
                    src={item.track.album_image_url}
                    alt=""
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    sizes="40px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-theme-tertiary">
                    <Clock className="w-4 h-4" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-theme truncate">
                  {item.track?.name || "Unknown"}
                </p>
                <p className="text-xs text-theme-tertiary truncate">
                  {item.track?.artist_name || "Unknown"}
                </p>
              </div>
              <span className="text-[10px] text-theme-tertiary whitespace-nowrap">
                {timeAgo(item.played_at)}
              </span>
            </Link>
          ))}
          {items.length === 0 && (
            <p className="p-6 text-center text-theme-tertiary text-sm">No listening history yet</p>
          )}
        </div>
      )}
    </div>
  );
}
