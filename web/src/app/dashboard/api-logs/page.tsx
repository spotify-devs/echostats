"use client";

import { Terminal } from "lucide-react";

export default function ApiLogsPage() {
  const sampleLogs = [
    { time: "00:15:32", method: "GET", endpoint: "/me/player/recently-played", status: 200, latency: 142 },
    { time: "00:15:33", method: "GET", endpoint: "/me/top/artists?time_range=short_term", status: 200, latency: 198 },
    { time: "00:15:34", method: "GET", endpoint: "/me/top/tracks?time_range=short_term", status: 200, latency: 167 },
    { time: "00:15:35", method: "GET", endpoint: "/audio-features?ids=...", status: 200, latency: 234 },
    { time: "00:30:01", method: "GET", endpoint: "/me/player/recently-played", status: 200, latency: 128 },
    { time: "00:30:02", method: "GET", endpoint: "/me/player/recently-played", status: 429, latency: 45 },
    { time: "00:30:07", method: "GET", endpoint: "/me/player/recently-played", status: 200, latency: 156 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
            <Terminal className="w-6 h-6 text-accent-dynamic" /> API Logs
          </h1>
          <p className="text-theme-secondary mt-1">Spotify API interaction logs</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-left text-xs text-theme-tertiary uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs text-theme-tertiary uppercase">Method</th>
                <th className="px-4 py-3 text-left text-xs text-theme-tertiary uppercase">Endpoint</th>
                <th className="px-4 py-3 text-left text-xs text-theme-tertiary uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs text-theme-tertiary uppercase">Latency</th>
              </tr>
            </thead>
            <tbody>
              {sampleLogs.map((log, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 font-mono text-xs text-theme-tertiary">{log.time}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-accent-dynamic/15 text-accent-dynamic">
                      {log.method}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-theme-secondary truncate max-w-xs">{log.endpoint}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-medium ${log.status < 300 ? "text-emerald-400" : log.status < 500 ? "text-amber-400" : "text-red-400"}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-theme-tertiary tabular-nums">{log.latency}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-theme-tertiary text-center">
        Live API logs will populate once connected to a real Spotify account
      </p>
    </div>
  );
}
