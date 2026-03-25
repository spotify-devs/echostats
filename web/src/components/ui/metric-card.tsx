import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  color: string;
  trend?: { value: number; label: string };
}

export function MetricCard({ icon: Icon, label, value, subtitle, color, trend }: MetricCardProps) {
  return (
    <div className="metric-card animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm text-white/50">{label}</span>
        </div>
        {trend && (
          <span className={`text-xs font-medium ${trend.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-xs text-white/40">{subtitle}</p>}
    </div>
  );
}
