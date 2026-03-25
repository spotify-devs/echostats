"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Target, Clock, Users, Disc3, Plus, Trophy } from "lucide-react";
import { api } from "@/lib/api";

interface Goal {
  id: string;
  title: string;
  icon: any;
  target: number;
  current: number;
  unit: string;
  color: string;
}

export default function GoalsPage() {
  const { data } = useQuery({
    queryKey: ["analytics-overview", "month"],
    queryFn: () => api.get<any>("/api/v1/analytics/overview?period=month"),
  });

  const goals: Goal[] = [
    {
      id: "hours",
      title: "Monthly Listening",
      icon: Clock,
      target: 50,
      current: data?.total_hours || 0,
      unit: "hours",
      color: "#a855f7",
    },
    {
      id: "artists",
      title: "New Artists",
      icon: Users,
      target: 10,
      current: data?.unique_artists || 0,
      unit: "artists",
      color: "#10b981",
    },
    {
      id: "genres",
      title: "Genre Exploration",
      icon: Disc3,
      target: 8,
      current: data?.unique_genres || 0,
      unit: "genres",
      color: "#06b6d4",
    },
    {
      id: "tracks",
      title: "Tracks Discovered",
      icon: Trophy,
      target: 100,
      current: data?.unique_tracks || 0,
      unit: "tracks",
      color: "#f59e0b",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
            <Target className="w-6 h-6 text-accent-dynamic" /> Listening Goals
          </h1>
          <p className="text-theme-secondary mt-1">Set targets and track your progress this month</p>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {goals.map((goal) => {
          const progress = Math.min((goal.current / goal.target) * 100, 100);
          const isComplete = goal.current >= goal.target;
          const Icon = goal.icon;
          const circumference = 2 * Math.PI * 44;

          return (
            <div key={goal.id} className={`glass-card p-6 ${isComplete ? "ring-1 ring-emerald-400/20" : ""}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl" style={{ backgroundColor: `${goal.color}20` }}>
                    <Icon className="w-5 h-5" style={{ color: goal.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-theme">{goal.title}</h3>
                    <p className="text-xs text-theme-tertiary">
                      {goal.current.toLocaleString()} / {goal.target.toLocaleString()} {goal.unit}
                    </p>
                  </div>
                </div>
                {isComplete && <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">✓ Done</span>}
              </div>

              {/* Circular Progress */}
              <div className="flex items-center gap-6">
                <div className="relative flex-shrink-0">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="44" fill="none" stroke="rgb(var(--surface-3))" strokeWidth="6" />
                    <circle
                      cx="48" cy="48" r="44" fill="none"
                      stroke={isComplete ? "#10b981" : goal.color}
                      strokeWidth="6"
                      strokeDasharray={`${(progress / 100) * circumference} ${circumference}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-theme">{Math.round(progress)}%</span>
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="w-full h-2 rounded-full bg-theme-surface-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${progress}%`, backgroundColor: isComplete ? "#10b981" : goal.color }}
                    />
                  </div>
                  <p className="text-xs text-theme-tertiary">
                    {isComplete
                      ? `🎉 Goal reached! You exceeded by ${(goal.current - goal.target).toLocaleString()} ${goal.unit}`
                      : `${(goal.target - goal.current).toLocaleString()} ${goal.unit} to go`}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tips */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-theme mb-3">💡 Tips to reach your goals</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-theme-surface-2 text-sm text-theme-secondary">
            🎧 Try the <span className="text-accent-dynamic font-medium">Discover</span> page to find new artists
          </div>
          <div className="p-3 rounded-xl bg-theme-surface-2 text-sm text-theme-secondary">
            🎵 Use the <span className="text-accent-dynamic font-medium">Playlist Generator</span> to explore new genres
          </div>
          <div className="p-3 rounded-xl bg-theme-surface-2 text-sm text-theme-secondary">
            📊 Check <span className="text-accent-dynamic font-medium">Music DNA</span> to see your genre diversity
          </div>
          <div className="p-3 rounded-xl bg-theme-surface-2 text-sm text-theme-secondary">
            🔄 Import your <span className="text-accent-dynamic font-medium">Spotify history</span> for complete data
          </div>
        </div>
      </div>
    </div>
  );
}
