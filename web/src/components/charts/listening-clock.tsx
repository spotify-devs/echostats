"use client";

interface ListeningClockProps {
  hourlyData: { hour: number; count: number; total_ms: number }[];
  size?: number;
}

export function ListeningClock({ hourlyData, size = 280 }: ListeningClockProps) {
  const center = size / 2;
  const outerR = size / 2 - 20;
  const innerR = outerR * 0.45;
  const maxCount = Math.max(...hourlyData.map((h) => h.count), 1);

  const segments = Array.from({ length: 24 }, (_, hour) => {
    const data = hourlyData.find((h) => h.hour === hour);
    const count = data?.count || 0;
    const ratio = count / maxCount;

    // Angles: 0h = top (270°), clockwise
    const startAngle = ((hour * 15 - 90) * Math.PI) / 180;
    const endAngle = (((hour + 1) * 15 - 90) * Math.PI) / 180;
    const barR = innerR + (outerR - innerR) * ratio;

    const x1Inner = center + innerR * Math.cos(startAngle);
    const y1Inner = center + innerR * Math.sin(startAngle);
    const x2Inner = center + innerR * Math.cos(endAngle);
    const y2Inner = center + innerR * Math.sin(endAngle);
    const x1Outer = center + barR * Math.cos(startAngle);
    const y1Outer = center + barR * Math.sin(startAngle);
    const x2Outer = center + barR * Math.cos(endAngle);
    const y2Outer = center + barR * Math.sin(endAngle);

    const path = [
      `M ${x1Inner} ${y1Inner}`,
      `L ${x1Outer} ${y1Outer}`,
      `A ${barR} ${barR} 0 0 1 ${x2Outer} ${y2Outer}`,
      `L ${x2Inner} ${y2Inner}`,
      `A ${innerR} ${innerR} 0 0 0 ${x1Inner} ${y1Inner}`,
    ].join(" ");

    return { hour, count, ratio, path };
  });

  // Hour labels at 0, 3, 6, 9, 12, 15, 18, 21
  const labels = [0, 3, 6, 9, 12, 15, 18, 21].map((hour) => {
    const angle = ((hour * 15 - 90) * Math.PI) / 180;
    const labelR = outerR + 14;
    return {
      hour,
      x: center + labelR * Math.cos(angle),
      y: center + labelR * Math.sin(angle),
    };
  });

  // Total plays
  const totalPlays = hourlyData.reduce((sum, h) => sum + h.count, 0);
  const peakHour = hourlyData.reduce((peak, h) => (h.count > peak.count ? h : peak), { hour: 0, count: 0, total_ms: 0 });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="drop-shadow-lg">
        {/* Background circle */}
        <circle cx={center} cy={center} r={outerR} fill="none" stroke="rgb(var(--surface-3))" strokeWidth="1" opacity="0.3" />
        <circle cx={center} cy={center} r={innerR} fill="rgb(var(--surface-1))" stroke="rgb(var(--surface-3))" strokeWidth="1" opacity="0.5" />

        {/* Segments */}
        {segments.map((seg) => (
          <path
            key={seg.hour}
            d={seg.path}
            fill={seg.count > 0 ? `rgb(var(--accent) / ${0.2 + seg.ratio * 0.8})` : "rgb(var(--surface-3) / 0.3)"}
            stroke="rgb(var(--surface) / 0.5)"
            strokeWidth="0.5"
            className="transition-colors hover:brightness-125 cursor-pointer"
          >
            <title>{`${seg.hour}:00 — ${seg.count} plays`}</title>
          </path>
        ))}

        {/* Hour labels */}
        {labels.map((l) => (
          <text
            key={l.hour}
            x={l.x}
            y={l.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[10px] fill-current text-theme-tertiary"
            style={{ fill: "rgb(var(--text-tertiary) / 0.5)" }}
          >
            {l.hour}
          </text>
        ))}

        {/* Center text */}
        <text x={center} y={center - 8} textAnchor="middle" className="text-lg font-bold" style={{ fill: "rgb(var(--text))" }}>
          {totalPlays.toLocaleString()}
        </text>
        <text x={center} y={center + 10} textAnchor="middle" className="text-[10px]" style={{ fill: "rgb(var(--text-secondary) / 0.5)" }}>
          plays
        </text>
      </svg>

      <div className="text-center mt-2">
        <p className="text-xs text-theme-tertiary">
          Peak: <span className="text-accent-dynamic font-medium">{peakHour.hour}:00</span> ({peakHour.count} plays)
        </p>
      </div>
    </div>
  );
}
