"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { RechartsTooltipProps } from "@/lib/types";

const COLORS = [
  "#a855f7",
  "#ec4899",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#6366f1",
  "#f43f5e",
  "#14b8a6",
  "#8b5cf6",
  "#22c55e",
  "#3b82f6",
  "#ef4444",
  "#eab308",
  "#0ea5e9",
  "#d946ef",
];

interface PieChartProps {
  data: { name: string; value: number }[];
  height?: number;
  innerRadius?: number;
  showLegend?: boolean;
}

const CustomTooltip = ({ active, payload }: RechartsTooltipProps) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="glass-card p-3 text-sm">
      <p className="text-theme font-medium">{entry.name}</p>
      <p className="text-theme-secondary">{entry.value.toLocaleString()} plays</p>
    </div>
  );
};

export function PieChart({
  data,
  height = 300,
  innerRadius = 60,
  showLegend = true,
}: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={innerRadius}
          outerRadius={innerRadius + 40}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        {showLegend && (
          <Legend
            wrapperStyle={{ fontSize: "11px", lineHeight: "20px", paddingTop: "8px" }}
            formatter={(value: string) => (
              <span className="text-theme-secondary text-[10px] sm:text-xs">{value}</span>
            )}
          />
        )}
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
