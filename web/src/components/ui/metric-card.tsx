"use client";

import type { LucideIcon } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  color: string;
  trend?: { value: number; label: string };
  animate?: boolean;
}

export function MetricCard({ icon: Icon, label, value, subtitle, color, trend, animate = true }: MetricCardProps) {
  const numericValue = typeof value === "number" ? value : 0;
  const animatedValue = useCountUp(animate ? numericValue : 0, 1200);
  const displayValue = typeof value === "number" && animate ? animatedValue.toLocaleString() : value;

  return (
    <div className="metric-card animate-slide-up group hover:shadow-accent-glow/5 transition-shadow duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`p-1.5 sm:p-2 rounded-lg ${color} transition-transform group-hover:scale-110 duration-300`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <span className="text-xs sm:text-sm text-theme-secondary">{label}</span>
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-medium ${trend.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {trend.value >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.value >= 0 ? "+" : ""}{trend.value}%
          </span>
        )}
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-theme tabular-nums">{displayValue}</p>
      {subtitle && <p className="text-[10px] sm:text-xs text-theme-tertiary">{subtitle}</p>}
    </div>
  );
}
