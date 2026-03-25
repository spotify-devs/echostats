"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw, CheckCircle, XCircle, Clock, Loader2,
  Play, Activity, Database, AlertTriangle,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { CardSkeleton } from "@/components/ui/loading-skeleton";

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  completed: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", label: "Completed" },
  failed: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10 border-red-400/20", label: "Failed" },
  running: { icon: Loader2, color: "text-accent-dynamic", bg: "bg-accent-dynamic/10 border-accent-dynamic/20", label: "Running" },
  pending: { icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20", label: "Pending" },
};

const TYPE_LABELS: Record<string, string> = {
  initial: "Initial Sync",
  periodic: "Periodic Sync",
  import: "File Import",
  enrichment: "Audio Enrichment",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDuration(startStr: string | null, endStr: string | null): string {
  if (!startStr) return "—";
  const start = new Date(startStr).getTime();
  const end = endStr ? new Date(endStr).getTime() : Date.now();
  const secs = Math.round((end - start) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return `${mins}m ${remainSecs}s`;
}

export default function SyncJobsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["sync-stats"],
    queryFn: () => api.get<any>("/api/v1/sync-jobs/stats"),
    refetchInterval: 10000,
  });

  const { data: jobs, isLoading: loadingJobs } = useQuery({
    queryKey: ["sync-jobs", page, statusFilter],
    queryFn: () => {
      let url = `/api/v1/sync-jobs?page=${page}&limit=20`;
      if (statusFilter !== "all") url += `&status=${statusFilter}`;
      return api.get<any>(url);
    },
    refetchInterval: 5000,
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post<any>("/api/v1/sync-jobs/trigger"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["sync-stats"] });
    },
  });

  const items = jobs?.items || [];
  const totalPages = jobs?.pages || 1;
  const isRunning = (stats?.running || 0) > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-accent-dynamic" /> Sync Jobs
          </h1>
          <p className="text-theme-secondary mt-1">Track Spotify data sync status</p>
        </div>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending || isRunning}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-accent-dynamic/20 text-accent-dynamic hover:bg-accent-dynamic/30 disabled:opacity-50 transition-all"
        >
          {syncMutation.isPending || isRunning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {isRunning ? "Syncing…" : "Sync Now"}
        </button>
      </div>

      {/* Stats Cards */}
      {loadingStats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <Activity className="w-5 h-5 text-accent-dynamic mb-2" />
            <p className="text-2xl font-bold text-theme tabular-nums">{stats.total_jobs}</p>
            <p className="text-xs text-theme-tertiary">Total Jobs</p>
          </div>
          <div className="glass-card p-4">
            <CheckCircle className="w-5 h-5 text-emerald-400 mb-2" />
            <p className="text-2xl font-bold text-emerald-400 tabular-nums">{stats.completed}</p>
            <p className="text-xs text-theme-tertiary">Completed</p>
          </div>
          <div className="glass-card p-4">
            <XCircle className="w-5 h-5 text-red-400 mb-2" />
            <p className="text-2xl font-bold text-red-400 tabular-nums">{stats.failed}</p>
            <p className="text-xs text-theme-tertiary">Failed</p>
          </div>
          <div className="glass-card p-4">
            <Database className="w-5 h-5 text-accent-cyan mb-2" />
            <p className="text-2xl font-bold text-theme tabular-nums">{(stats.total_items_synced || 0).toLocaleString()}</p>
            <p className="text-xs text-theme-tertiary">Items Synced</p>
          </div>
        </div>
      ) : null}

      {/* Last Sync Banner */}
      {stats?.last_sync_at && (
        <div className="glass-card p-3 flex items-center gap-2 text-sm">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-theme-secondary">
            Last successful sync: <span className="text-theme font-medium">{timeAgo(stats.last_sync_at)}</span>
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-theme-tertiary">Filter:</span>
        <div className="flex gap-1 p-1 bg-theme-surface-2 rounded-xl border border-white/5">
          {["all", "running", "completed", "failed"].map((f) => (
            <button
              key={f}
              onClick={() => { setStatusFilter(f); setPage(1); }}
              className={`px-3 py-1 text-xs rounded-lg transition-all capitalize ${
                statusFilter === f ? "bg-accent-dynamic/20 text-accent-dynamic" : "text-theme-tertiary hover:text-theme"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs List */}
      {loadingJobs ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-3">
          {items.map((job: any) => {
            const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;
            return (
              <div key={job.id} className="glass-card p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl border ${cfg.bg} flex-shrink-0`}>
                    <StatusIcon className={`w-4 h-4 ${cfg.color} ${job.status === "running" ? "animate-spin" : ""}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-theme">
                        {TYPE_LABELS[job.job_type] || job.job_type}
                      </h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-theme-tertiary">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(job.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {formatDuration(job.started_at, job.completed_at)}
                      </span>
                      {job.items_processed > 0 && (
                        <span className="flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          {job.items_processed.toLocaleString()} items
                        </span>
                      )}
                    </div>
                    {/* Progress bar for running jobs */}
                    {job.status === "running" && job.items_total > 0 && (
                      <div className="mt-2 w-full h-1.5 rounded-full bg-theme-surface-3 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent-dynamic transition-all"
                          style={{ width: `${Math.min((job.items_processed / job.items_total) * 100, 100)}%` }}
                        />
                      </div>
                    )}
                    {/* Error message */}
                    {job.error_message && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-red-400 bg-red-400/5 rounded-lg p-2">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span className="break-all">{job.error_message}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <RefreshCw className="w-10 h-10 text-theme-tertiary mx-auto mb-3" />
          <p className="text-theme-secondary">No sync jobs yet</p>
          <p className="text-xs text-theme-tertiary mt-1">
            Click &quot;Sync Now&quot; to start syncing your Spotify data
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-theme-tertiary">
            Page {page} of {totalPages} ({jobs?.total || 0} jobs)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg hover:bg-white/5 text-theme-tertiary disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg hover:bg-white/5 text-theme-tertiary disabled:opacity-30 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
