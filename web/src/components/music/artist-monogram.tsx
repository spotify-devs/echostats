"use client";

/**
 * Generates initials from an artist name (up to 2 characters).
 * E.g. "A.R. Rahman" → "AR", "Diljit Dosanjh" → "DD", "NIJJAR" → "NI"
 */
function getInitials(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z\s]/g, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Deterministic color from name string */
function getColor(name: string): string {
  const colors = [
    "from-rose-500 to-pink-600",
    "from-violet-500 to-purple-600",
    "from-blue-500 to-indigo-600",
    "from-cyan-500 to-teal-600",
    "from-emerald-500 to-green-600",
    "from-amber-500 to-orange-600",
    "from-fuchsia-500 to-pink-600",
    "from-sky-500 to-blue-600",
    "from-lime-500 to-emerald-600",
    "from-red-500 to-rose-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

interface ArtistMonogramProps {
  name: string;
  /** Tailwind text size class, e.g. "text-xs", "text-sm", "text-lg" */
  textSize?: string;
}

export function ArtistMonogram({ name, textSize = "text-sm" }: ArtistMonogramProps) {
  return (
    <div
      className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getColor(name)}`}
    >
      <span className={`${textSize} font-bold text-white drop-shadow-sm`}>{getInitials(name)}</span>
    </div>
  );
}
