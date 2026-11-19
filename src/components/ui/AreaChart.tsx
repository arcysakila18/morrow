"use client";
import { useMemo, useState } from "react";
import { formatUsd } from "@/lib/format";

/** Minimal area chart for real OHLCV closes. Renders nothing when data is missing. */
export function AreaChart({ data, height = 220, positive = true }: { data: { t: number; c: number }[]; height?: number; positive?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 800;
  const H = height;
  const pad = 8;
  const { path, area, pts } = useMemo(() => {
    if (data.length < 2) return { path: "", area: "", pts: [] as { x: number; y: number }[] };
    const min = Math.min(...data.map((d) => d.c));
    const max = Math.max(...data.map((d) => d.c));
    const span = max - min || max || 1;
    const pts = data.map((d, i) => ({ x: (i / (data.length - 1)) * W, y: pad + (1 - (d.c - min) / span) * (H - pad * 2) }));
    const path = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("");
    return { path, area: `${path}L${W},${H}L0,${H}Z`, pts };
  }, [data, H]);

  if (!path) return <div className="flex items-center justify-center text-sm text-faint" style={{ height }}>No chart data yet</div>;
  const color = positive ? "#40c98a" : "#ff6b5c";
  const h = hover != null ? data[hover] : null;

  return (
    <div className="relative">
      <div className="tabular absolute left-0 top-0 text-xs text-muted">
        {h ? `${formatUsd(h.c)} · ${new Date(h.t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric" })}` : " "}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="mt-5 w-full"
        style={{ height }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          setHover(Math.max(0, Math.min(data.length - 1, Math.round(((e.clientX - r.left) / r.width) * (data.length - 1)))));
        }}
      >
        <defs>
          <linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.14" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#area-fill)" />
        <path d={path} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {hover != null && pts[hover] && (
          <>
            <line x1={pts[hover].x} x2={pts[hover].x} y1={0} y2={H} stroke="#f4f4ef" strokeOpacity="0.2" vectorEffect="non-scaling-stroke" />
            <circle cx={pts[hover].x} cy={pts[hover].y} r="4" fill={color} vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
    </div>
  );
}
