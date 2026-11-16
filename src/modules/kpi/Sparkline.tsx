export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const w = 96;
  const h = 28;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`).join(" ");
  const hasData = values.some((v) => v > 0);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} className="overflow-visible">
      {hasData ? (
        <polyline points={pts} fill="none" stroke="var(--color-primary)" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      ) : (
        <line x1={0} x2={w} y1={h - 2} y2={h - 2} stroke="var(--color-border)" strokeWidth={1.5} strokeDasharray="3 3" />
      )}
    </svg>
  );
}

export function ProgressBar({ value, max, tone = "primary" }: { value: number; max: number; tone?: "primary" | "warning" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : value > 0 ? 100 : 0;
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div
        className={`progress-fill h-full rounded-full ${tone === "warning" ? "bg-warning" : "bg-primary"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
