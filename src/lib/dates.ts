export const TZ = "America/Sao_Paulo";

/** ISO date (YYYY-MM-DD) for "today" in São Paulo. */
export function todaySP(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function hourSP(now: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(now),
  );
}

function toUTC(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function fromUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = toUTC(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUTC(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / 86400000);
}

/** 1 = Monday … 7 = Sunday */
export function isoWeekday(iso: string): number {
  const w = toUTC(iso).getUTCDay();
  return w === 0 ? 7 : w;
}

export function startOfWeek(iso: string): string {
  return addDays(iso, 1 - isoWeekday(iso));
}
export function startOfMonth(iso: string): string {
  return iso.slice(0, 8) + "01";
}
export function endOfMonth(iso: string): string {
  const d = toUTC(startOfMonth(iso));
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return fromUTC(d);
}

/** Days a record is expected: calendar days minus Sundays (mirrors SQL expected_days). */
export function expectedDays(start: string, end: string): number {
  let n = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) if (isoWeekday(d) !== 7) n++;
  return n;
}

export type Period = "dia" | "semana" | "mes";

export interface PeriodRange {
  start: string;
  end: string;
  /** Previous period, truncated to the same elapsed length, for fair comparison. */
  prevStart: string;
  prevEnd: string;
}

export function periodRange(period: Period, today: string): PeriodRange {
  if (period === "dia") {
    const y = addDays(today, -1);
    return { start: today, end: today, prevStart: y, prevEnd: y };
  }
  if (period === "semana") {
    const start = startOfWeek(today);
    const elapsed = diffDays(start, today);
    const prevStart = addDays(start, -7);
    return { start, end: addDays(start, 6), prevStart, prevEnd: addDays(prevStart, elapsed) };
  }
  const start = startOfMonth(today);
  const elapsed = diffDays(start, today);
  const prevStart = startOfMonth(addDays(start, -1));
  const prevEndFull = addDays(start, -1);
  const candidate = addDays(prevStart, elapsed);
  return {
    start,
    end: endOfMonth(today),
    prevStart,
    prevEnd: candidate < prevEndFull ? candidate : prevEndFull,
  };
}

export function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(toUTC(iso));
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" }).format(
    toUTC(iso),
  );
}

export function formatWeekdayShort(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short" }).format(toUTC(iso));
}

export function formatTimeSP(ts: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(
    new Date(ts),
  );
}

export function formatRelative(ts: string): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "short" }).format(new Date(ts));
}

/** Start/end of a São Paulo calendar day as ISO timestamps (SP is UTC-3, no DST since 2019). */
export function spDayBounds(iso: string): { from: string; to: string } {
  return { from: `${iso}T00:00:00-03:00`, to: `${addDays(iso, 1)}T00:00:00-03:00` };
}

export function greeting(hour: number): string {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}
