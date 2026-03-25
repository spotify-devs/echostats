"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Headphones,
  ListMusic,
  Monitor,
  Music,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Smartphone,
  Speaker,
  Volume2,
} from "lucide-react";
import Image from "next/image";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";
import { api } from "@/lib/api";

const DEVICE_ICONS: Record<string, any> = {
  Computer: Monitor,
  Smartphone: Smartphone,
  Speaker: Speaker,
  default: Headphones,
};

export default function PlayerPage() {
  const queryClient = useQueryClient();

  const {
    data: playback,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["player-current"],
    queryFn: () => api.get<any>("/api/v1/player/current"),
    refetchInterval: 10000,
    retry: false,
  });

  const { data: devices } = useQuery({
    queryKey: ["player-devices"],
    queryFn: () => api.get<any>("/api/v1/player/devices"),
    refetchInterval: 30000,
    retry: false,
  });

  const { data: queue } = useQuery({
    queryKey: ["player-queue"],
    queryFn: () => api.get<any>("/api/v1/player/queue"),
    refetchInterval: 10000,
    retry: false,
  });

  const playMutation = useMutation({
    mutationFn: () => api.post("/api/v1/player/play"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["player-current"] }),
  });

  const pauseMutation = useMutation({
    mutationFn: () => api.post("/api/v1/player/pause"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["player-current"] }),
  });

  const nextMutation = useMutation({
    mutationFn: () => api.post("/api/v1/player/next"),
    onSuccess: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["player-current"] }), 500);
    },
  });

  const prevMutation = useMutation({
    mutationFn: () => api.post("/api/v1/player/previous"),
    onSuccess: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["player-current"] }), 500);
    },
  });

  const isPlaying = playback?.is_playing;
  const progress = playback?.duration_ms ? (playback.progress_ms / playback.duration_ms) * 100 : 0;

  function formatMs(ms: number) {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }

  if (isLoading && !isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-theme">Player</h1>
        <ChartSkeleton height={300} />
      </div>
    );
  }

  const noPlayback = isError || !playback || (!playback.is_playing && !playback.track_name);

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center gap-2">
        <Music className="w-6 h-6 text-spotify-green" /> Player
      </h1>

      {/* Now Playing Card */}
      <div className="glass-card p-6 sm:p-8 overflow-hidden">
        {!noPlayback ? (
          <div className="flex flex-col lg:flex-row items-center gap-8 min-w-0">
            {/* Album Art */}
            <div className="relative w-48 h-48 lg:w-64 lg:h-64 rounded-2xl overflow-hidden bg-theme-surface-3 shadow-2xl flex-shrink-0">
              {playback.album_image ? (
                <Image
                  src={playback.album_image}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="256px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-16 h-16 text-theme-tertiary" />
                </div>
              )}
            </div>

            <div className="flex-1 text-center lg:text-left space-y-4 min-w-0 w-full overflow-hidden">
              {/* Track Info */}
              <div className="min-w-0">
                <h2 className="text-2xl lg:text-3xl font-bold text-theme truncate">
                  {playback.track_name}
                </h2>
                <p className="text-base lg:text-lg text-theme-secondary truncate mt-1">
                  {playback.artist_name}
                </p>
                <p className="text-sm text-theme-tertiary truncate">{playback.album_name}</p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full h-1.5 rounded-full bg-theme-surface-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${progress}%`, backgroundColor: "rgb(var(--accent))" }}
                  />
                </div>
                <div className="flex justify-between text-xs text-theme-tertiary tabular-nums">
                  <span>{formatMs(playback.progress_ms || 0)}</span>
                  <span>{formatMs(playback.duration_ms || 0)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center lg:justify-start gap-4">
                <button
                  onClick={() => {}}
                  className={`p-2 rounded-full text-theme-tertiary hover:text-theme transition-colors ${playback.shuffle ? "text-accent-dynamic" : ""}`}
                >
                  <Shuffle className="w-5 h-5" />
                </button>
                <button
                  onClick={() => prevMutation.mutate()}
                  className="p-2 rounded-full text-theme-secondary hover:text-theme transition-colors"
                >
                  <SkipBack className="w-6 h-6" />
                </button>
                <button
                  onClick={() => (isPlaying ? pauseMutation.mutate() : playMutation.mutate())}
                  className="p-4 rounded-full bg-accent-dynamic text-white hover:scale-105 active:scale-95 transition-transform shadow-accent-glow"
                >
                  {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
                </button>
                <button
                  onClick={() => nextMutation.mutate()}
                  className="p-2 rounded-full text-theme-secondary hover:text-theme transition-colors"
                >
                  <SkipForward className="w-6 h-6" />
                </button>
                <button
                  onClick={() => {}}
                  className={`p-2 rounded-full text-theme-tertiary hover:text-theme transition-colors ${playback.repeat !== "off" ? "text-accent-dynamic" : ""}`}
                >
                  <Repeat className="w-5 h-5" />
                </button>
              </div>

              {/* Device */}
              {playback.device && (
                <p className="text-xs text-theme-tertiary flex items-center gap-1 justify-center lg:justify-start">
                  <Volume2 className="w-3.5 h-3.5" /> Playing on {playback.device}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 space-y-4">
            <div className="w-20 h-20 rounded-full bg-accent-dynamic/10 flex items-center justify-center mx-auto">
              <Music className="w-10 h-10 text-accent-dynamic" />
            </div>
            <p className="text-theme text-lg font-semibold">Nothing playing right now</p>
            <p className="text-sm text-theme-secondary max-w-sm mx-auto">
              Start playing something on Spotify and it will appear here with full playback
              controls.
            </p>
            {isError && (
              <p className="text-xs text-theme-tertiary">
                💡 Connect a real Spotify account to enable player controls
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Devices */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-theme mb-4 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-accent-dynamic" /> Devices
          </h2>
          {(devices?.devices || []).length > 0 ? (
            <div className="space-y-2">
              {devices.devices.map((device: any) => {
                const DevIcon = DEVICE_ICONS[device.type] || DEVICE_ICONS.default;
                return (
                  <div
                    key={device.id}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${device.is_active ? "bg-accent-dynamic/10 border border-accent-dynamic/20" : "hover:bg-current/[0.05]"}`}
                  >
                    <DevIcon
                      className={`w-5 h-5 ${device.is_active ? "text-accent-dynamic" : "text-theme-tertiary"}`}
                    />
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${device.is_active ? "text-accent-dynamic" : "text-theme"}`}
                      >
                        {device.name}
                      </p>
                      <p className="text-xs text-theme-tertiary">{device.type}</p>
                    </div>
                    {device.is_active && (
                      <span className="text-[10px] text-accent-dynamic bg-accent-dynamic/15 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-theme-tertiary text-center py-6">No devices found</p>
          )}
        </div>

        {/* Queue */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-theme mb-4 flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-accent-dynamic" /> Queue
          </h2>
          {(queue?.queue || []).length > 0 ? (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {queue.queue.map((track: any, i: number) => (
                <div
                  key={`${track.id}-${i}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-current/[0.04]"
                >
                  <span className="w-5 text-center text-xs text-theme-tertiary">{i + 1}</span>
                  <div className="relative w-8 h-8 rounded overflow-hidden bg-theme-surface-3 flex-shrink-0">
                    {track.image ? (
                      <Image src={track.image} alt="" fill className="object-cover" sizes="32px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-theme-tertiary">
                        <Music className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-theme truncate">{track.name}</p>
                    <p className="text-[10px] text-theme-tertiary truncate">{track.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-theme-tertiary text-center py-6">Queue is empty</p>
          )}
        </div>
      </div>
    </div>
  );
}
