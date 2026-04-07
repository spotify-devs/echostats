"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bell, CheckCircle, Info, Trophy, X } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import type { AnalyticsOverview, LucideIcon } from "@/lib/types";

interface Notification {
  id: string;
  type: "success" | "warning" | "info" | "achievement";
  title: string;
  message: string;
  time: string;
  read: boolean;
  icon?: LucideIcon;
}

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
  achievement: Trophy,
};

const COLORS = {
  success: { bg: "bg-emerald-400/10", border: "border-emerald-400/20", text: "text-emerald-400" },
  warning: { bg: "bg-amber-400/10", border: "border-amber-400/20", text: "text-amber-400" },
  info: {
    bg: "bg-accent-dynamic/10",
    border: "border-accent-dynamic/20",
    text: "text-accent-dynamic",
  },
  achievement: { bg: "bg-amber-400/10", border: "border-amber-400/20", text: "text-amber-400" },
};

export default function NotificationsPage() {
  const { data: analytics } = useQuery({
    queryKey: ["analytics-overview", "all_time"],
    queryFn: () => api.get<AnalyticsOverview>("/api/v1/analytics/overview?period=all_time"),
  });

  // Generate notifications from analytics data
  const generateNotifications = (): Notification[] => {
    const notifs: Notification[] = [];
    const now = new Date();

    notifs.push({
      id: "sync-ok",
      type: "success",
      title: "Data sync successful",
      message: "Your listening history was synced with Spotify",
      time: new Date(now.getTime() - 15 * 60000).toISOString(),
      read: false,
    });

    if ((analytics?.total_tracks_played ?? 0) >= 1000) {
      notifs.push({
        id: "milestone-1k",
        type: "achievement",
        title: "🏆 Milestone: 1,000 plays!",
        message: `You've reached ${analytics!.total_tracks_played.toLocaleString()} total plays. Keep it up!`,
        time: new Date(now.getTime() - 2 * 3600000).toISOString(),
        read: false,
      });
    }

    if ((analytics?.listening_streak_days ?? 0) >= 7) {
      notifs.push({
        id: "streak-7",
        type: "achievement",
        title: "🔥 7-Day Streak!",
        message: `You've listened to music for ${analytics!.listening_streak_days} consecutive days`,
        time: new Date(now.getTime() - 5 * 3600000).toISOString(),
        read: true,
      });
    }

    notifs.push({
      id: "weekly-report",
      type: "info",
      title: "Weekly report ready",
      message: "Your weekly listening report is available. Check the Monthly Report page.",
      time: new Date(now.getTime() - 24 * 3600000).toISOString(),
      read: true,
    });

    notifs.push({
      id: "new-features",
      type: "info",
      title: "New features available",
      message: "Playlist Generator, Audio Lab, and Taste Profile are now live!",
      time: new Date(now.getTime() - 48 * 3600000).toISOString(),
      read: true,
    });

    if ((analytics?.unique_genres ?? 0) >= 10) {
      notifs.push({
        id: "genre-explorer",
        type: "achievement",
        title: "🌍 Genre Explorer",
        message: `You've listened to ${analytics!.unique_genres} different genres!`,
        time: new Date(now.getTime() - 72 * 3600000).toISOString(),
        read: true,
      });
    }

    return notifs;
  };

  const [notifications, setNotifications] = useState<Notification[]>(() => generateNotifications());
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const displayed = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  function timeAgo(isoStr: string): string {
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center gap-2">
            <Bell className="w-6 h-6 text-accent-dynamic" /> Notifications
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-accent-dynamic/20 text-accent-dynamic rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-theme-secondary mt-1">Sync updates, milestones & achievements</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 p-1 bg-theme-surface-2 rounded-xl border border-current/[0.08]">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 text-xs rounded-lg ${filter === "all" ? "bg-accent-dynamic/20 text-accent-dynamic" : "text-theme-tertiary"}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1 text-xs rounded-lg ${filter === "unread" ? "bg-accent-dynamic/20 text-accent-dynamic" : "text-theme-tertiary"}`}
            >
              Unread
            </button>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-accent-dynamic hover:underline">
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {displayed.length > 0 ? (
          displayed.map((notif) => {
            const Icon = ICONS[notif.type];
            const colors = COLORS[notif.type];
            return (
              <div
                key={notif.id}
                className={`glass-card p-4 flex items-start gap-4 transition-all ${!notif.read ? "border-l-2 border-l-accent-dynamic" : "opacity-70"}`}
                onClick={() => markRead(notif.id)}
              >
                <div className={`p-2 rounded-xl ${colors.bg} flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-medium ${notif.read ? "text-theme-secondary" : "text-theme"}`}
                    >
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-accent-dynamic flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-theme-tertiary mt-0.5">{notif.message}</p>
                  <p className="text-[10px] text-theme-tertiary mt-1">{timeAgo(notif.time)}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismiss(notif.id);
                  }}
                  className="p-1 rounded hover:bg-current/[0.05] text-theme-tertiary hover:text-theme flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })
        ) : (
          <div className="glass-card p-12 text-center">
            <Bell className="w-12 h-12 text-theme-tertiary mx-auto mb-3 opacity-30" />
            <p className="text-theme-secondary">
              No {filter === "unread" ? "unread " : ""}notifications
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
