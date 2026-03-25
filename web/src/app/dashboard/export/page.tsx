"use client";

import { CheckCircle, Download, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { exportToCSV } from "@/lib/export";

const EXPORT_TYPES = [
  {
    id: "history",
    label: "Listening History",
    desc: "All played tracks with timestamps",
    icon: "📜",
  },
  { id: "top-tracks", label: "Top Tracks", desc: "Your most played tracks ranked", icon: "🎵" },
  {
    id: "top-artists",
    label: "Top Artists",
    desc: "Your most listened artists ranked",
    icon: "🎤",
  },
  {
    id: "genres",
    label: "Genre Distribution",
    desc: "Genre breakdown with play counts",
    icon: "🎸",
  },
  { id: "analytics", label: "Analytics Summary", desc: "Full analytics snapshot", icon: "📊" },
];

export default function ExportPage() {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState<string[]>([]);

  const toggleType = (id: string) => {
    setSelectedTypes((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const downloadJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setExporting(true);
    setExported([]);

    for (const type of selectedTypes) {
      try {
        let data: any;
        switch (type) {
          case "history":
            data = await api.get<any>("/api/v1/history?page=1&limit=1000");
            if (format === "csv") {
              exportToCSV(
                (data.items || []).map((i: any) => ({
                  track: i.track?.name,
                  artist: i.track?.artist_name,
                  album: i.track?.album_name,
                  played_at: i.played_at,
                  duration_ms: i.track?.duration_ms,
                  source: i.source,
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
            } else {
              downloadJson(data.items, "echostats-history");
            }
            break;
          case "top-tracks":
            data = await api.get<any>("/api/v1/tracks/top?period=all_time&limit=50");
            if (format === "csv") {
              exportToCSV(
                (data.items || []).map((i: any) => ({
                  rank: i.rank,
                  name: i.name,
                  plays: i.play_count,
                  id: i.spotify_id,
                })),
                [
                  { key: "rank", header: "Rank" },
                  { key: "name", header: "Name" },
                  { key: "plays", header: "Plays" },
                  { key: "id", header: "Spotify ID" },
                ],
                "echostats-top-tracks",
              );
            } else {
              downloadJson(data.items, "echostats-top-tracks");
            }
            break;
          case "top-artists":
            data = await api.get<any>("/api/v1/artists/top?period=all_time&limit=50");
            if (format === "csv") {
              exportToCSV(
                (data.items || []).map((i: any) => ({
                  rank: i.rank,
                  name: i.name,
                  plays: i.play_count,
                  id: i.spotify_id,
                })),
                [
                  { key: "rank", header: "Rank" },
                  { key: "name", header: "Name" },
                  { key: "plays", header: "Plays" },
                  { key: "id", header: "Spotify ID" },
                ],
                "echostats-top-artists",
              );
            } else {
              downloadJson(data.items, "echostats-top-artists");
            }
            break;
          case "genres":
            data = await api.get<any>("/api/v1/genres/distribution?period=all_time");
            if (format === "csv") {
              exportToCSV(
                (data.genres || []).map((g: any) => ({ name: g.name, plays: g.play_count })),
                [
                  { key: "name", header: "Genre" },
                  { key: "plays", header: "Play Count" },
                ],
                "echostats-genres",
              );
            } else {
              downloadJson(data.genres, "echostats-genres");
            }
            break;
          case "analytics":
            data = await api.get<any>("/api/v1/analytics/overview?period=all_time");
            downloadJson(data, "echostats-analytics");
            break;
        }
        setExported((prev) => [...prev, type]);
      } catch (err) {
        console.error(`Export failed for ${type}:`, err);
      }
    }
    setExporting(false);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
          <Download className="w-6 h-6 text-accent-dynamic" /> Export Data
        </h1>
        <p className="text-theme-secondary mt-1">Download your EchoStats data</p>
      </div>

      {/* Format Selection */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-theme">Format</h2>
        <div className="flex gap-3">
          <button
            onClick={() => setFormat("csv")}
            className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
              format === "csv"
                ? "border-accent-dynamic/50 bg-accent-dynamic/10"
                : "border-white/10 hover:border-white/20"
            }`}
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span className="text-sm font-medium text-theme">CSV</span>
          </button>
          <button
            onClick={() => setFormat("json")}
            className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
              format === "json"
                ? "border-accent-dynamic/50 bg-accent-dynamic/10"
                : "border-white/10 hover:border-white/20"
            }`}
          >
            <FileJson className="w-5 h-5" />
            <span className="text-sm font-medium text-theme">JSON</span>
          </button>
        </div>
      </div>

      {/* Data Selection */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-theme">Select Data</h2>
        <div className="space-y-2">
          {EXPORT_TYPES.map((type) => {
            const isSelected = selectedTypes.includes(type.id);
            const isDone = exported.includes(type.id);
            return (
              <button
                key={type.id}
                onClick={() => toggleType(type.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-accent-dynamic/50 bg-accent-dynamic/10"
                    : "border-white/5 hover:border-white/15"
                }`}
              >
                <span className="text-2xl">{type.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-theme">{type.label}</p>
                  <p className="text-xs text-theme-tertiary">{type.desc}</p>
                </div>
                {isDone ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : isSelected ? (
                  <div className="w-5 h-5 rounded border-2 border-accent-dynamic bg-accent-dynamic/20 flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-accent-dynamic" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded border-2 border-white/20" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={selectedTypes.length === 0 || exporting}
        className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-3 disabled:opacity-50"
      >
        {exporting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> Exporting...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" /> Export {selectedTypes.length} dataset
            {selectedTypes.length !== 1 ? "s" : ""}
          </>
        )}
      </button>
    </div>
  );
}
