"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart as RechartsRadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface RadarChartProps {
  data: { feature: string; value: number }[];
  height?: number;
  color?: string;
}

export function RadarChart({ data, height = 300, color = "#a855f7" }: RadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsRadarChart data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.1)" />
        <PolarAngleAxis dataKey="feature" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} />
        <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.2} strokeWidth={2} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="glass-card p-2 text-sm">
                <p className="text-theme">
                  {payload[0].payload.feature}: {(payload[0].value as number).toFixed(2)}
                </p>
              </div>
            );
          }}
        />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}
