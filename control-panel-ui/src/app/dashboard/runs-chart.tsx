"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, TriangleAlert, XCircle } from "lucide-react";
import type { Bucket } from "./metrics";

const HEIGHT = 220;
const PAD = { top: 12, right: 8, bottom: 26, left: 34 };
const GAP = 2; // surface gap between stacked segments
const SERIES = [
  { key: "passed", label: "Passed", Icon: CheckCircle2 },
  { key: "failed", label: "Failed", Icon: XCircle },
  { key: "errored", label: "Could not finish", Icon: TriangleAlert },
] as const;

function niceMax(value: number) {
  if (value <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(value)));
  return Math.ceil(value / step) * step;
}

/** Column with a 4px rounded top and a square base, drawn as one path. */
function column(x: number, y: number, width: number, height: number, rounded: boolean) {
  const r = rounded ? Math.min(4, width / 2, height) : 0;
  return `M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`;
}

export function RunsChart({ data, onSelect }: { data: Bucket[]; onSelect?: (bucket: Bucket) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);

  useEffect(() => {
    if (!box.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);

  const total = (b: Bucket) => b.passed + b.failed + b.errored;
  const max = niceMax(Math.max(0, ...data.map(total)));
  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const band = plotW / data.length;
  const barW = Math.min(24, band * 0.62);
  const y = (value: number) => PAD.top + plotH - (value / max) * plotH;
  const ticks = [0, max / 2, max];
  const labelEvery = Math.ceil(data.length / Math.max(1, Math.floor(plotW / 56)));
  const hovered = hover === null ? null : data[hover];

  return (
    <div className="qd-chart">
      <div className="qd-chart-bar">
        <ul className="qd-legend" aria-label="Legend">
          {SERIES.map(({ key, label, Icon }) => (
            <li key={key}><span className={`qd-swatch is-${key}`} /><Icon size={13} aria-hidden="true" />{label}</li>
          ))}
        </ul>
        <button type="button" className="qd-text-button" onClick={() => setTable(v => !v)} aria-pressed={table}>
          {table ? "Chart" : "Table"}
        </button>
      </div>

      {table ? (
        <div className="qd-table-wrap">
          <table className="qd-table">
            <thead><tr><th>Period</th><th>Passed</th><th>Failed</th><th>Could not finish</th></tr></thead>
            <tbody>
              {data.filter(b => total(b) > 0).map(b => (
                <tr key={b.start}><td>{b.label}</td><td>{b.passed}</td><td>{b.failed}</td><td>{b.errored}</td></tr>
              ))}
              {data.every(b => total(b) === 0) && <tr><td colSpan={4}>No runs in this period.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="qd-plot" ref={box} onMouseLeave={() => setHover(null)}>
          <svg width={width} height={HEIGHT} role="img" aria-label="Runs per period by outcome">
            {ticks.map(tick => (
              <g key={tick}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} className={tick === 0 ? "qd-baseline" : "qd-gridline"} />
                <text x={PAD.left - 8} y={y(tick)} className="qd-tick" textAnchor="end" dominantBaseline="middle">{tick}</text>
              </g>
            ))}
            {data.map((b, i) => {
              const x = PAD.left + i * band + (band - barW) / 2;
              let base = 0;
              const parts = SERIES.map(s => ({ key: s.key, value: b[s.key] })).filter(p => p.value > 0);
              return (
                <g key={b.start} className={hover !== null && hover !== i ? "is-dim" : undefined}>
                  {parts.map((part, index) => {
                    const top = y(base + part.value);
                    const height = y(base) - top - (index > 0 ? GAP : 0);
                    base += part.value;
                    return height > 0 ? (
                      <path key={part.key} d={column(x, top, barW, height, index === parts.length - 1)} className={`qd-seg is-${part.key}`} />
                    ) : null;
                  })}
                  {i % labelEvery === 0 && (
                    <text x={PAD.left + i * band + band / 2} y={HEIGHT - 8} className="qd-tick" textAnchor="middle">{b.label}</text>
                  )}
                  <rect
                    x={PAD.left + i * band} y={PAD.top} width={band} height={plotH} className="qd-hit"
                    onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => total(b) && onSelect?.(b)}
                    tabIndex={total(b) ? 0 : -1} aria-label={`${b.label}: ${b.passed} passed, ${b.failed} failed, ${b.errored} could not finish`}
                  />
                </g>
              );
            })}
          </svg>
          {hovered && (
            <div
              className="qd-tooltip"
              style={{ left: Math.min(width - 170, Math.max(0, PAD.left + (hover ?? 0) * band + band / 2 - 80)) }}
              role="status"
            >
              <strong>{hovered.label}</strong>
              {total(hovered) === 0 ? <span>No runs</span> : SERIES.map(({ key, label }) => (
                <span key={key}><i className={`qd-swatch is-${key}`} />{label}<b>{hovered[key]}</b></span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
