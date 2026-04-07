"use client";

import { useQuery } from "@tanstack/react-query";
import { Music } from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";
import type { NowPlayingResponse } from "@/lib/types";

export function NowPlaying() {
  // Poll every 30 seconds (this would work with real Spotify auth)
  const { data } = useQuery({
    queryKey: ["now-playing"],
    queryFn: async () => {
      try {
        return await api.get<NowPlayingResponse>("/api/v1/player/current");
      } catch {
        return null;
      }
    },
    refetchInterval: 30000,
    retry: false,
  });

  // If no current playback data, show nothing
  if (!data?.is_playing) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-spotify-green/10 border border-spotify-green/20">
      <div className="relative w-8 h-8 rounded-md overflow-hidden bg-theme-surface-3 flex-shrink-0">
        {data.album_image ? (
          <Image src={data.album_image} alt="" fill className="object-cover" sizes="32px" />
        ) : (
          <Music className="w-4 h-4 text-theme-tertiary m-auto" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-theme truncate">{data.track_name}</p>
        <p className="text-[10px] text-theme-tertiary truncate">{data.artist_name}</p>
      </div>
      <div className="flex items-center gap-1">
        <span className="flex gap-[2px]">
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              className="w-[3px] bg-spotify-green rounded-full animate-pulse"
              style={{
                height: `${8 + Math.random() * 8}px`,
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
