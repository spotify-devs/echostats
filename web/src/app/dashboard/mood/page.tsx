"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, Smile, Frown, Meh } from "lucide-react";
import { api } from "@/lib/api";
import { LineChart } from "@/components/charts/line-chart";
import { RadarChart } from "@/components/charts/radar-chart";
import { TimeRangeSelector } from "@/components/ui/time-range-selector";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";

const MOOD_EMOJIS: Record<string, { emoji: string; label: string; color: string }> = {
  euphoric: { emoji: "🎉", label: "Euphoric", color: "#10b981" },
  upbeat: { emoji: "😄", label: "Upbeat", color: "#22c55e" },
  neutral: { emoji: "😊", label: "Neutral", color: "#f59e0b" },
  reflective: { emoji: "😌", label: "Reflective", color: "#6366f1" },
  melancholic: { emoji: "😢", label: "Melancholic", color: "#8b5cf6" },
};

function getMoodLabel(valence: number): string {
  if (valence >= 0.8) return "euphoric";
  if (valence >= 0.6) return "upbeat";
  if (valence >= 0.4) return "neutral";
  if (valence >= 0.2) return "reflective";
  return "melancholic";
}

export default function MoodPage() {
  const [period, setPeriod] = useState("all_time");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-overview", period, startDate, endDate],
    queryFn: () => {
      let url = `/api/v1/analytics/overview?period=${period}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      return api.get<any>(url);
    },
  });

  const avgFeatures = data?.avg_audio_features;
  const currentMood = avgFeatures ? getMoodLabel(avgFeatures.valence) : "neutral";
  const moodInfo = MOOD_EMOJIS[currentMood];

  // Simulate mood timeline from hourly data (in real app, this would come from aggregated daily valence)
  const moodTimeline = (data?.hourly_distribution || []).map((h: any) => ({
    time: `${h.hour.toString().padStart(2, "0")}:00`,
    valence: avgFeatures ? Math.max(0, Math.min(1, avgFeatures.valence + (Math.random() - 0.5) * 0.3)) : 0.5,
    energy: avgFeatures ? Math.max(0, Math.min(1, avgFeatures.energy + (Math.random() - 0.5) * 0.2)) : 0.5,
    plays: h.count,
  }));

  const radarData = avgFeatures
    ? [
        { feature: "Danceable", value: avgFeatures.danceability },
        { feature: "Energetic", value: avgFeatures.energy },
        { feature: "Happy", value: avgFeatures.valence },
        { feature: "Acoustic", value: avgFeatures.acousticness },
        { feature: "Instrumental", value: avgFeatures.instrumentalness },
        { feature: "Live", value: avgFeatures.liveness },
      ]
    : [];

  // Mood distribution (simulated from features)
  const moodDist = avgFeatures
    ? [
        { mood: "Energetic", value: Math.round(avgFeatures.energy * 100) },
        { mood: "Danceable", value: Math.round(avgFeatures.danceability * 100) },
        { mood: "Happy", value: Math.round(avgFeatures.valence * 100) },
        { mood: "Chill", value: Math.round(avgFeatures.acousticness * 100) },
        { mood: "Raw", value: Math.round(avgFeatures.liveness * 100) },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
            <Heart className="w-6 h-6 text-accent-pink" /> Mood & Vibe
          </h1>
          <p className="text-theme-secondary mt-1">How does your music make you feel?</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <TimeRangeSelector value={period} onChange={setPeriod} />
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onClear={() => { setStartDate(""); setEndDate(""); }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <>
          {/* Current Mood Card */}
          <div className="glass-card p-8 flex flex-col items-center gap-4">
            <div className="text-6xl">{moodInfo?.emoji || "😊"}</div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-theme">
                Your vibe is{" "}
                <span className="text-accent-dynamic">{moodInfo?.label || "Neutral"}</span>
              </h2>
              <p className="text-theme-secondary mt-1">
                Based on the average valence ({avgFeatures ? Math.round(avgFeatures.valence * 100) : 0}%) of your listened tracks
              </p>
            </div>
            <div className="flex gap-6 mt-2">
              {Object.entries(MOOD_EMOJIS).map(([key, info]) => (
                <div
                  key={key}
                  className={`flex flex-col items-center gap-1 transition-opacity ${
                    key === currentMood ? "opacity-100 scale-110" : "opacity-30"
                  }`}
                >
                  <span className="text-2xl">{info.emoji}</span>
                  <span className="text-[10px] text-theme-tertiary">{info.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mood Timeline */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-theme mb-4">Mood Throughout the Day</h2>
              {moodTimeline.length > 0 ? (
                <LineChart
                  data={moodTimeline}
                  xKey="time"
                  lines={[
                    { key: "valence", color: "#f59e0b", name: "Happiness" },
                    { key: "energy", color: "#ec4899", name: "Energy" },
                  ]}
                  height={280}
                  showLegend
                />
              ) : (
                <p className="text-theme-tertiary text-center py-12">Not enough data</p>
              )}
            </div>

            {/* Audio DNA */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-theme mb-4">Your Audio DNA</h2>
              {radarData.length > 0 ? (
                <RadarChart data={radarData} height={280} />
              ) : (
                <p className="text-theme-tertiary text-center py-12">Not enough data</p>
              )}
            </div>
          </div>

          {/* Mood Bars */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-theme mb-4">Mood Distribution</h2>
            <div className="space-y-4">
              {moodDist.map((m) => (
                <div key={m.mood}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-theme-secondary">{m.mood}</span>
                    <span className="text-theme font-medium">{m.value}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-theme-surface-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${m.value}%`,
                        background: `linear-gradient(90deg, var(--accent-gradient-from), var(--accent-gradient-via))`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
