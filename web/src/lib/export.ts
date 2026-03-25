/**
 * CSV export utility for data tables.
 */

type Row = Record<string, unknown>;

function escapeCSV(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV(
  data: Row[],
  columns: { key: string; header: string }[],
  filename: string = "export",
) {
  if (data.length === 0) return;

  const header = columns.map((c) => escapeCSV(c.header)).join(",");
  const rows = data.map((row) => columns.map((c) => escapeCSV(row[c.key])).join(","));
  const csv = [header, ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportListeningHistory(items: any[]) {
  exportToCSV(
    items.map((item: any) => ({
      track: item.track?.name || "",
      artist: item.track?.artist_name || "",
      album: item.track?.album_name || "",
      played_at: item.played_at || "",
      duration_ms: item.track?.duration_ms || 0,
      source: item.source || "",
    })),
    [
      { key: "track", header: "Track" },
      { key: "artist", header: "Artist" },
      { key: "album", header: "Album" },
      { key: "played_at", header: "Played At" },
      { key: "duration_ms", header: "Duration (ms)" },
      { key: "source", header: "Source" },
    ],
    "echostats-history",
  );
}

export function exportTopItems(items: any[], type: "tracks" | "artists" | "genres") {
  exportToCSV(
    items.map((item: any) => ({
      rank: item.rank || 0,
      name: item.name || "",
      play_count: item.play_count || 0,
      spotify_id: item.spotify_id || "",
    })),
    [
      { key: "rank", header: "Rank" },
      { key: "name", header: "Name" },
      { key: "play_count", header: "Play Count" },
      { key: "spotify_id", header: "Spotify ID" },
    ],
    `echostats-top-${type}`,
  );
}
