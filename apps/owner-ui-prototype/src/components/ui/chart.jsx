import React, { useMemo } from "react";

export function Sparkline({ data = [], width = 120, height = 32, stroke = "var(--accent, #22d3ee)", fill = true, className = "" }) {
  const points = useMemo(() => {
    const values = data.map((d) => (typeof d === "number" ? d : Number(d?.value) || 0));
    if (values.length === 0) return { line: "", area: "", min: 0, max: 0 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = values.length > 1 ? width / (values.length - 1) : 0;
    const coords = values.map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return [x, y];
    });
    const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const area = `${line} L${width},${height} L0,${height} Z`;
    return { line, area, min, max };
  }, [data, width, height]);

  if (!data.length) return null;
  const gradId = `spark-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={points.area} fill={`url(#${gradId})`} />}
      <path d={points.line} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BarChart({ data = [], width = 320, height = 120, color = "var(--accent, #22d3ee)", showLabels = true, className = "" }) {
  const bars = useMemo(() => {
    if (!data.length) return [];
    const values = data.map((d) => Number(d?.value ?? d) || 0);
    const max = Math.max(...values, 1);
    const barGap = 6;
    const barWidth = (width - barGap * (data.length - 1)) / data.length;
    return data.map((d, i) => {
      const value = Number(d?.value ?? d) || 0;
      const h = (value / max) * (height - 24);
      const x = i * (barWidth + barGap);
      const y = height - h - 16;
      return { x, y, w: barWidth, h, label: d?.label ?? "", value };
    });
  }, [data, width, height]);

  if (!data.length) {
    return (
      <div className={`flex h-[${height}px] items-center justify-center text-xs text-zinc-600 ${className}`}>
        No data
      </div>
    );
  }

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className={className} preserveAspectRatio="none">
      <defs>
        <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {bars.map((b, i) => (
        <g key={i}>
          <rect
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            rx="2"
            fill="url(#bar-grad)"
            stroke={color}
            strokeOpacity="0.5"
            strokeWidth="0.5"
          />
          {showLabels && (
            <text
              x={b.x + b.w / 2}
              y={height - 4}
              textAnchor="middle"
              fontSize="9"
              fill="rgba(148,163,184,0.7)"
              fontFamily="var(--font-mono, monospace)"
            >
              {b.label}
            </text>
          )}
          {showLabels && b.value > 0 && (
            <text
              x={b.x + b.w / 2}
              y={b.y - 3}
              textAnchor="middle"
              fontSize="9"
              fill="rgba(244,246,251,0.85)"
              fontFamily="var(--font-mono, monospace)"
              fontWeight="600"
            >
              {b.value}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function DonutChart({ segments = [], size = 120, thickness = 14, centerLabel, centerValue }) {
  const total = segments.reduce((s, seg) => s + (Number(seg.value) || 0), 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth={thickness} />
        {segments.map((seg, i) => {
          const value = Number(seg.value) || 0;
          const fraction = value / total;
          const dash = fraction * circumference;
          const circle = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color || "var(--accent)"}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return circle;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="owner-kpi-value text-xl font-bold text-white">{centerValue}</div>
        {centerLabel && (
          <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{centerLabel}</div>
        )}
      </div>
    </div>
  );
}
