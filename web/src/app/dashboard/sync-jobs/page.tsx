"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  Loader2,
  Play,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import { api } from "@/lib/api";

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  completed: {
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
    label: "Completed",
  },
  failed: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-400/10 border-red-400/20",
    label: "Failed",
  },
  running: {
    icon: Loader2,
    color: "text-accent-dynamic",
    bg: "bg-accent-dynamic/10 border-accent-dynamic/20",
    label: "Running",
  },
  pending: {
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/20",
    label: "Pending",
  },
};

const TYPE_LABELS: Record<string, string> = {
  initial: "Initial Sync",
  periodic: "Periodic Sync",
  import: "File Import",
  enrichment: "Audio Enrichment",
};

const STEP_LABELS: Record<string, string> = {
  get_token: "Authenticate",
  sync_recently_played: "Recently Played",
  sync_top_items: "Top Artists & Tracks",
  sync_saved_tracks: "Saved Tracks",
  sync_playlists: "Playlists",
  enrich_audio_features: "Audio Features",
  refresh_analytics: "Refresh Analytics",
};

function timeAgo(dateStr: string, now: number): string {
  const diff = now - new Date(dateStr).getTime();
  if (diff < 0) return "just now";
  const totalSecs = Math.floor(diff / 1000);
  if (totalSecs < 60) return `${totalSecs}s ago`;
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  if (mins < 60) return `${mins}m ${secs}s ago`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs < 24) return `${hrs}h ${remMins}m ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ${hrs % 24}h ago`;
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatTimestamp(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
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
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const queryClient = useQueryClient();

  // Tick every second for live timers
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

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

  // Compute next scheduled sync (worker runs at :00, :15, :30, :45)
  function getNextSyncTime(): Date {
    const d = new Date(now);
    const mins = d.getMinutes();
    const nextSlot = Math.ceil((mins + 1) / 15) * 15;
    const next = new Date(d);
    if (nextSlot >= 60) {
      next.setHours(next.getHours() + 1);
      next.setMinutes(nextSlot - 60);
    } else {
      next.setMinutes(nextSlot);
    }
    next.setSeconds(0, 0);
    return next;
  }

  function formatCountdown(target: Date): string {
    const diffMs = target.getTime() - now;
    if (diffMs <= 0) return "any moment";
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }

  const nextSync = getNextSyncTime();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center gap-2">
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
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : stats ? (
        <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StaggerItem>
            <div className="glass-card p-4">
              <Activity className="w-5 h-5 text-accent-dynamic mb-2" />
              <p className="text-2xl font-bold text-theme tabular-nums">{stats.total_jobs}</p>
              <p className="text-xs text-theme-tertiary">Total Jobs</p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="glass-card p-4">
              <CheckCircle className="w-5 h-5 text-emerald-400 mb-2" />
              <p className="text-2xl font-bold text-emerald-400 tabular-nums">{stats.completed}</p>
              <p className="text-xs text-theme-tertiary">Completed</p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="glass-card p-4">
              <XCircle className="w-5 h-5 text-red-400 mb-2" />
              <p className="text-2xl font-bold text-red-400 tabular-nums">{stats.failed}</p>
              <p className="text-xs text-theme-tertiary">Failed</p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="glass-card p-4">
              <Database className="w-5 h-5 text-accent-cyan mb-2" />
              <p className="text-2xl font-bold text-theme tabular-nums">
                {(stats.total_items_synced || 0).toLocaleString()}
              </p>
              <p className="text-xs text-theme-tertiary">Items Synced</p>
            </div>
          </StaggerItem>
        </StaggerContainer>
      ) : null}

      {/* Sync Schedule Info */}
      {stats && (
        <div className="glass-card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-theme flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent-dynamic" /> Sync Schedule
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Last Sync */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-current/[0.03] border border-current/[0.08]">
              <CheckCircle
                className={`w-5 h-5 flex-shrink-0 ${stats.last_sync_at ? "text-emerald-400" : "text-theme-tertiary"}`}
              />
              <div className="min-w-0">
                <p className="text-[10px] text-theme-tertiary uppercase tracking-wider">
                  Last Sync
                </p>
                <p className="text-sm font-medium text-theme truncate">
                  {stats.last_sync_at ? timeAgo(stats.last_sync_at, now) : "Never"}
                </p>
                {stats.last_sync_at && (
                  <p className="text-[10px] text-theme-tertiary">
                    {new Date(stats.last_sync_at).toLocaleString([], {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>
            </div>
            {/* Next Sync */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-current/[0.03] border border-current/[0.08]">
              <RefreshCw
                className={`w-5 h-5 flex-shrink-0 ${isRunning ? "text-accent-dynamic animate-spin" : "text-accent-dynamic"}`}
              />
              <div className="min-w-0">
                <p className="text-[10px] text-theme-tertiary uppercase tracking-wider">
                  Next Sync
                </p>
                <p className="text-sm font-medium text-theme">
                  {isRunning ? "In progress…" : `in ~${formatCountdown(nextSync)}`}
                </p>
                <p className="text-[10px] text-theme-tertiary">
                  {nextSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
            {/* Frequency */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-current/[0.03] border border-current/[0.08]">
              <Activity className="w-5 h-5 flex-shrink-0 text-accent-cyan" />
              <div className="min-w-0">
                <p className="text-[10px] text-theme-tertiary uppercase tracking-wider">
                  Frequency
                </p>
                <p className="text-sm font-medium text-theme">Every 15 minutes</p>
                <p className="text-[10px] text-theme-tertiary">at :00, :15, :30, :45</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-theme-tertiary">Filter:</span>
        <div className="flex gap-1 p-1 bg-theme-surface-2 rounded-xl border border-current/[0.08]">
          {["all", "running", "completed", "failed"].map((f) => (
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
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs List */}
      {loadingJobs ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : items.length > 0 ? (
        <StaggerContainer className="space-y-3">
          {items.map((job: any) => {
            const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;
            return (
              <StaggerItem key={job.id}>
                <div
                  className="glass-card p-4 cursor-pointer hover:bg-current/[0.03] transition-colors"
                  onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl border ${cfg.bg} flex-shrink-0`}>
                      <StatusIcon
                        className={`w-4 h-4 ${cfg.color} ${job.status === "running" ? "animate-spin" : ""}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-theme">
                          {TYPE_LABELS[job.job_type] || job.job_type}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${cfg.bg} ${cfg.color}`}
                          >
                            {cfg.label}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-theme-tertiary transition-transform ${expandedJob === job.id ? "rotate-180" : ""}`}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-theme-tertiary">
                        <span
                          className="flex items-center gap-1"
                          title={formatTimestamp(job.created_at)}
                        >
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(job.started_at)}
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
                            style={{
                              width: `${Math.min((job.items_processed / job.items_total) * 100, 100)}%`,
                            }}
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

                      {/* Expanded: Step details */}
                      {expandedJob === job.id && (
                        <div className="mt-3 pt-3 border-t border-current/[0.08] space-y-2">
                          {job.steps && job.steps.length > 0 ? (
                            job.steps.map((step: any, idx: number) => {
                              const stepOk = step.status === "completed";
                              return (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2 text-xs p-2 rounded-lg bg-current/[0.03]"
                                >
                                  {stepOk ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium text-theme">
                                      {STEP_LABELS[step.action] || step.action}
                                    </span>
                                    <p className="text-theme-tertiary mt-0.5">{step.detail}</p>
                                    {step.items > 0 && (
                                      <span className="text-accent-dynamic">
                                        {step.items} item{step.items !== 1 ? "s" : ""}
                                      </span>
                                    )}
                                    {step.error && (
                                      <p className="text-red-400 mt-0.5">{step.error}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-theme-tertiary italic">
                              No step details available (older sync job)
                            </p>
                          )}

                          {/* Timestamps */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-theme-tertiary pt-1">
                            <span>Started: {formatTimestamp(job.started_at)}</span>
                            {job.completed_at && (
                              <span>Completed: {formatTimestamp(job.completed_at)}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
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
              className="p-1.5 rounded-lg hover:bg-current/[0.05] text-theme-tertiary disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg hover:bg-current/[0.05] text-theme-tertiary disabled:opacity-30 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
