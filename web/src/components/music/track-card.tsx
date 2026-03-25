import { Clock, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface TrackCardProps {
  rank?: number;
  name: string;
  artist: string;
  albumImageUrl?: string;
  playCount?: number;
  duration?: string;
  spotifyUrl?: string;
  spotifyId?: string;
}

export function TrackCard({
  rank,
  name,
  artist,
  albumImageUrl,
  playCount,
  duration,
  spotifyUrl,
  spotifyId,
}: TrackCardProps) {
  const content = (
    <div className="flex items-center gap-3 sm:gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-all group min-h-[44px]">
      {rank !== undefined && (
        <span className="w-6 text-center text-sm text-white/30 font-mono">{rank}</span>
      )}
      <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-surface-3 flex-shrink-0">
        {albumImageUrl ? (
          <Image src={albumImageUrl} alt={name} fill className="object-cover" sizes="48px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-5 h-5 text-white/20" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{name}</p>
        <p className="text-xs text-white/40 truncate">{artist}</p>
      </div>
      {playCount !== undefined && (
        <span className="text-xs text-white/40 tabular-nums">
          {playCount.toLocaleString()} plays
        </span>
      )}
      {duration && (
        <span className="text-xs text-white/30 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {duration}
        </span>
      )}
    </div>
  );

  if (spotifyId) {
    return <Link href={`/dashboard/tracks/${spotifyId}`}>{content}</Link>;
  }

  return content;
}
