import Image from "next/image";
import Link from "next/link";
import { Users } from "lucide-react";

interface ArtistCardProps {
  rank?: number;
  name: string;
  imageUrl?: string;
  playCount?: number;
  genres?: string[];
  spotifyId?: string;
}

export function ArtistCard({ rank, name, imageUrl, playCount, genres, spotifyId }: ArtistCardProps) {
  const content = (
    <div className="flex items-center gap-3 sm:gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-all group min-h-[44px]">
      {rank !== undefined && (
        <span className="w-6 text-center text-sm text-white/30 font-mono">{rank}</span>
      )}
      <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-surface-3 flex-shrink-0">
        {imageUrl ? (
          <Image src={imageUrl} alt={name} fill className="object-cover" sizes="48px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Users className="w-5 h-5 text-white/20" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{name}</p>
        {genres && genres.length > 0 && (
          <p className="text-xs text-white/40 truncate">{genres.slice(0, 3).join(", ")}</p>
        )}
      </div>
      {playCount !== undefined && (
        <span className="text-xs text-white/40 tabular-nums">{playCount.toLocaleString()} plays</span>
      )}
    </div>
  );

  if (spotifyId) {
    return <Link href={`/dashboard/artists/${spotifyId}`}>{content}</Link>;
  }

  return content;
}
