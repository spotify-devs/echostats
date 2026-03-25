"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  RefreshCw,
  Terminal,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { BarChart } from "@/components/charts/bar-chart";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import { api } from "@/lib/api";

export default function ApiLogsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["api-log-stats"],
    queryFn: () => api.get<any>("/api/v1/api-logs/stats"),
    refetchInterval: 30000,
  });

  const {
    data: logs,
    isLoading: loadingLogs,
    refetch,
    isFetching,
    isError: logsError,
  } = useQuery({
    queryKey: ["api-logs", page, statusFilter, methodFilter],
    queryFn: () => {
      let url = `/api/v1/api-logs?page=${page}&limit=50`;
      if (statusFilter === "errors") url += "&status_min=400";
      if (statusFilter === "success") url += "&status_max=299";
      if (statusFilter === "rate-limited") url += "&status_min=429&status_max=429";
      if (methodFilter !== "all") url += `&method=${methodFilter}`;
      return api.get<any>(url);
    },
    refetchInterval: 15000,
  });

  const items = logs?.items || [];
  const totalPages = logs?.pages || 1;

  const statusColor = (code: number) => {
    if (code >= 200 && code < 300) return "text-emerald-400";
    if (code === 429) return "text-amber-400";
    if (code >= 400 && code < 500) return "text-amber-400";
    if (code >= 500) return "text-red-400";
    return "text-theme-tertiary";
  };

  const statusBg = (code: number) => {
    if (code >= 200 && code < 300) return "bg-emerald-400/10 border-emerald-400/20";
    if (code === 429) return "bg-amber-400/10 border-amber-400/20";
    if (code >= 400) return "bg-red-400/10 border-red-400/20";
    return "bg-theme-surface-3";
  };

  const latencyColor = (ms: number) => {
    if (ms < 200) return "text-emerald-400";
    if (ms < 500) return "text-amber-400";
    return "text-red-400";
  };

  // Chart data for top endpoints
  const endpointBarData = (stats?.top_endpoints || []).slice(0, 8).map((ep: any) => ({
    name: ep.endpoint.replace("GET ", "").replace("POST ", "").slice(0, 25),
    calls: ep.count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center gap-2">
            <Terminal className="w-6 h-6 text-accent-dynamic" /> API Logs
          </h1>
          <p className="text-theme-secondary mt-1">Spotify API call monitoring & diagnostics</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 text-sm glass-card hover:bg-current/[0.05] transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {loadingStats ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="glass-card p-4">
            <Activity className="w-5 h-5 text-accent-dynamic mb-2" />
            <p className="text-2xl font-bold text-theme tabular-nums">
              {(stats.total_calls || 0).toLocaleString()}
            </p>
            <p className="text-xs text-theme-tertiary">Total Calls</p>
          </div>
          <div className="glass-card p-4">
            <CheckCircle className="w-5 h-5 text-emerald-400 mb-2" />
            <p className="text-2xl font-bold text-emerald-400 tabular-nums">
              {stats.success_rate || 0}%
            </p>
            <p className="text-xs text-theme-tertiary">Success Rate</p>
          </div>
          <div className="glass-card p-4">
            <AlertTriangle className="w-5 h-5 text-amber-400 mb-2" />
            <p className="text-2xl font-bold text-amber-400 tabular-nums">
              {stats.rate_limit_count || 0}
            </p>
            <p className="text-xs text-theme-tertiary">Rate Limits (429)</p>
          </div>
          <div className="glass-card p-4">
            <XCircle className="w-5 h-5 text-red-400 mb-2" />
            <p className="text-2xl font-bold text-red-400 tabular-nums">{stats.error_count || 0}</p>
            <p className="text-xs text-theme-tertiary">Errors</p>
          </div>
          <div className="glass-card p-4">
            <Clock className="w-5 h-5 text-accent-cyan mb-2" />
            <p className="text-2xl font-bold text-theme tabular-nums">
              {stats.avg_latency_ms || 0}ms
            </p>
            <p className="text-xs text-theme-tertiary">Avg Latency</p>
          </div>
        </div>
      ) : null}

      {/* Status Distribution + Top Endpoints */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-theme mb-4">Status Distribution</h2>
            <div className="space-y-3">
              {[
                {
                  label: "2xx Success",
                  count: stats.status_distribution?.["2xx"] || 0,
                  color: "#10b981",
                },
                {
                  label: "4xx Client Error",
                  count: stats.status_distribution?.["4xx"] || 0,
                  color: "#f59e0b",
                },
                {
                  label: "5xx Server Error",
                  count: stats.status_distribution?.["5xx"] || 0,
                  color: "#ef4444",
                },
              ].map((s) => {
                const total =
                  (stats.status_distribution?.["2xx"] || 0) +
                  (stats.status_distribution?.["4xx"] || 0) +
                  (stats.status_distribution?.["5xx"] || 0);
                const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                return (
                  <div key={s.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-theme-secondary">{s.label}</span>
                      <span style={{ color: s.color }} className="font-medium">
                        {s.count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-theme-surface-3 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: s.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Endpoints */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-theme mb-4">Most Called Endpoints</h2>
            {endpointBarData.length > 0 ? (
              <BarChart
                data={endpointBarData}
                xKey="name"
                bars={[{ key: "calls", color: "rgb(var(--accent))" }]}
                height={200}
                layout="vertical"
              />
            ) : (
              <p className="text-theme-tertiary text-center py-12">No data yet</p>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-theme-tertiary">
          <Filter className="w-4 h-4" /> Filter:
        </div>
        <div className="flex gap-1 p-1 bg-theme-surface-2 rounded-xl border border-current/[0.08]">
          {["all", "success", "errors", "rate-limited"].map((f) => (
            <button
              key={f}
              onClick={() => {
                setStatusFilter(f);
                setPage(1);
              }}
              className={`px-3 py-1 text-xs rounded-lg transition-all capitalize ${
                statusFilter === f
                  ? "bg-accent-dynamic/20 text-accent-dynamic"
                  : "text-theme-tertiary hover:text-theme"
              }`}
            >
              {f === "rate-limited" ? "429s" : f}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 bg-theme-surface-2 rounded-xl border border-current/[0.08]">
          {["all", "GET", "POST", "PUT", "DELETE"].map((m) => (
            <button
              key={m}
              onClick={() => {
                setMethodFilter(m);
                setPage(1);
              }}
              className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                methodFilter === m
                  ? "bg-accent-dynamic/20 text-accent-dynamic"
                  : "text-theme-tertiary hover:text-theme"
              }`}
            >
              {m === "all" ? "All" : m}
            </button>
          ))}
        </div>
      </div>

      {/* Log Table */}
      <div className="glass-card overflow-hidden">
        {loadingLogs ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 text-accent-dynamic animate-spin mx-auto" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-current/[0.08]">
                    <th className="px-4 py-3 text-left text-xs text-theme-tertiary uppercase">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs text-theme-tertiary uppercase">
                      Method
                    </th>
                    <th className="px-4 py-3 text-left text-xs text-theme-tertiary uppercase">
                      Endpoint
                    </th>
                    <th className="px-4 py-3 text-left text-xs text-theme-tertiary uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs text-theme-tertiary uppercase">
                      Latency
                    </th>
                    <th className="px-4 py-3 text-left text-xs text-theme-tertiary uppercase">
                      Error
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.length > 0 ? (
                    items.map((log: any, i: number) => (
                      <tr
                        key={log.id || i}
                        className="border-b border-current/[0.08] hover:bg-current/[0.03] transition-colors"
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-theme-tertiary whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-accent-dynamic/15 text-accent-dynamic">
                            {log.method}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-theme-secondary max-w-xs truncate">
                          {log.endpoint}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${statusBg(log.status_code)} ${statusColor(log.status_code)}`}
                          >
                            {log.status_code >= 200 && log.status_code < 300 && (
                              <CheckCircle className="w-3 h-3" />
                            )}
                            {log.status_code === 429 && <AlertTriangle className="w-3 h-3" />}
                            {log.status_code >= 400 && log.status_code !== 429 && (
                              <XCircle className="w-3 h-3" />
                            )}
                            {log.status_code}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-2.5 text-xs font-mono tabular-nums ${latencyColor(log.latency_ms)}`}
                        >
                          {log.latency_ms}ms
                        </td>
                        <td
                          className="px-4 py-2.5 text-xs text-red-400 max-w-[200px] truncate"
                          title={log.error || ""}
                        >
                          {log.error || "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-theme-tertiary">
                        {logsError
                          ? "Failed to load logs — check authentication"
                          : statusFilter !== "all" || methodFilter !== "all"
                            ? "No logs matching filters"
                            : "No API calls logged yet. Sync data to generate logs."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-current/[0.08]">
              <span className="text-xs text-theme-tertiary">
                Showing {items.length > 0 ? (page - 1) * 50 + 1 : 0}–
                {Math.min(page * 50, logs?.total || 0)} of {(logs?.total || 0).toLocaleString()} logs
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page <= 1}
                  className="px-2 py-1 text-xs rounded-lg hover:bg-current/[0.05] text-theme-tertiary disabled:opacity-30 transition-all"
                >
                  First
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg hover:bg-current/[0.05] text-theme-tertiary disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 text-xs rounded-lg transition-all ${
                        page === pageNum
                          ? "bg-accent-dynamic/20 text-accent-dynamic font-bold"
                          : "hover:bg-current/[0.05] text-theme-tertiary"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg hover:bg-current/[0.05] text-theme-tertiary disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                  className="px-2 py-1 text-xs rounded-lg hover:bg-current/[0.05] text-theme-tertiary disabled:opacity-30 transition-all"
                >
                  Last
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[10px] text-theme-tertiary">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400" /> 2xx Success
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400" /> 429 Rate Limited
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400" /> 4xx/5xx Error
        </span>
        <span>Auto-refreshes every 15s</span>
      </div>
    </div>
  );
}
