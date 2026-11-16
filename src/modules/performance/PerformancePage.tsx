import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Award, BarChart3, History, PenLine, ReceiptText, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  addDays,
  formatLongDate,
  formatShortDate,
  formatWeekdayShort,
  startOfMonth,
  startOfWeek,
  todaySP,
} from "@/lib/dates";
import { useMe } from "@/modules/auth/useMe";
import { useRanking, type RankPerson } from "@/modules/home/hooks";
import { useKpiDefinitions, useKpiProgress, useKpiSeries } from "@/modules/kpi/hooks";
import { ProgressBar } from "@/modules/kpi/Sparkline";
import { EmptyState } from "@/modules/shell/EmptyState";
import { PageHeader, Section } from "@/modules/shell/PageHeader";
import { UserAvatar } from "@/modules/shell/UserAvatar";
import { useUiActions } from "@/modules/shell/ui-actions";
import { useLedger, useMyEntries } from "./hooks";

type Range = "semana" | "mes";
const HISTORY_DAYS = 30;
const toggleItem =
  "h-7 px-2.5 text-xs data-[state=on]:bg-primary-soft data-[state=on]:text-primary";

const STATUS = {
  approved: { label: "Aprovado", cls: "bg-primary-soft text-primary" },
  pending: { label: "Aguardando", cls: "bg-warning-soft text-warning" },
  rejected: { label: "Recusado", cls: "bg-destructive-soft text-destructive" },
} as const;

const SOURCE_LABEL: Record<string, string> = {
  kpi: "Indicador",
  goal_bonus: "Bônus de meta",
  achievement: "Conquista",
  adjustment: "Ajuste",
};

export function PerformancePage() {
  const me = useMe()!;
  const ui = useUiActions();
  const today = todaySP();
  const [range, setRange] = useState<Range>("semana");
  const start = range === "semana" ? startOfWeek(today) : startOfMonth(today);
  const ranking = useRanking(start, today);
  const progress = useKpiProgress(me.id, start, today);
  const entries = useMyEntries(addDays(today, -(HISTORY_DAYS - 1)), today);

  const mine = ranking.data?.individual.find((p) => p.user_id === me.id);
  const goal = (progress.data ?? []).reduce((a, k) => a + k.goal, 0);
  const done = (progress.data ?? []).reduce((a, k) => a + Math.min(k.total, k.goal), 0);
  const approvedDays = (entries.data ?? []).filter(
    (e) => e.status === "approved" && e.entry_date >= start,
  ).length;
  const periodLabel = range === "semana" ? "nesta semana" : "neste mês";

  return (
    <div className="fade-up">
      <PageHeader
        crumbs={[{ label: "Home", to: "/inicio" }, { label: "Performance" }]}
        title="Performance"
        description="Sua evolução, seus pontos e onde você está no ranking. Só registros aprovados contam."
        actions={
          <>
            <ToggleGroup
              type="single"
              size="sm"
              value={range}
              onValueChange={(v) => v && setRange(v as Range)}
              aria-label="Período"
              className="rounded-lg border border-border bg-surface p-0.5"
            >
              <ToggleGroupItem value="semana" className={toggleItem}>
                Semana
              </ToggleGroupItem>
              <ToggleGroupItem value="mes" className={toggleItem}>
                Mês
              </ToggleGroupItem>
            </ToggleGroup>
            <Button onClick={ui.openRegisterKpi}>
              <PenLine strokeWidth={1.75} /> Registrar indicadores
            </Button>
          </>
        }
      />

      <dl className="mb-10 grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-0 rounded-xl border border-border bg-surface px-5 py-4 shadow-soft sm:grid-cols-4 sm:divide-x sm:divide-border">
        <Stat
          label="Pontos"
          value={ranking.isLoading ? null : String(mine?.points ?? 0)}
          hint={periodLabel}
        />
        <Stat
          label="Posição"
          value={ranking.isLoading ? null : mine && mine.points > 0 ? `${mine.position}º` : "—"}
          hint={ranking.data ? `de ${ranking.data.individual.length}` : undefined}
        />
        <Stat
          label="Meta do período"
          value={progress.isLoading ? null : goal > 0 ? `${Math.round((done / goal) * 100)}%` : "—"}
          hint="até hoje"
        />
        <Stat
          label="Dias aprovados"
          value={entries.isLoading ? null : String(approvedDays)}
          hint={periodLabel}
        />
      </dl>

      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-10">
          <Section title="Metas por indicador" description={`Acumulado ${periodLabel}, até hoje`}>
            {progress.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <ul className="divide-y divide-border">
                {(progress.data ?? []).map((k) => {
                  const pct = k.goal > 0 ? Math.round((k.total / k.goal) * 100) : 0;
                  return (
                    <li
                      key={k.kpi_id}
                      className="grid grid-cols-[7rem_1fr_auto] items-center gap-4 py-3"
                    >
                      <span className="text-sm font-semibold">{k.name}</span>
                      <ProgressBar value={k.total} max={k.goal} />
                      <span className="num w-28 text-right text-sm">
                        <span className="font-bold">{k.total}</span>
                        <span className="text-muted-foreground"> / {k.goal}</span>
                        <span
                          className={`ml-2 text-xs font-semibold ${pct >= 100 ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {pct}%
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Evolution />
          <EntryHistory entries={entries.data ?? []} loading={entries.isLoading} />
          <Ledger />
        </div>

        <div className="space-y-10">
          <RankingSection
            data={ranking.data?.individual ?? []}
            loading={ranking.isLoading}
            meId={me.id}
            periodLabel={periodLabel}
          />
          <Section title="Equipes" description={`Pontos ${periodLabel}`}>
            {ranking.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (ranking.data?.teams ?? []).length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Nenhuma equipe criada ainda.</p>
            ) : (
              <ol className="space-y-3 py-1">
                {ranking.data!.teams.map((t, i) => {
                  const max = Math.max(1, ...ranking.data!.teams.map((x) => x.points));
                  return (
                    <li key={t.team_id}>
                      <div className="mb-1 flex items-center gap-2 text-sm">
                        <span className="num w-5 text-xs font-bold text-muted-foreground">
                          {i + 1}º
                        </span>
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: t.color }}
                          aria-hidden
                        />
                        <span
                          className={`flex-1 truncate ${t.team_id === me.team_id ? "font-semibold" : ""}`}
                        >
                          {t.name}
                        </span>
                        <span className="num font-semibold">{t.points}</span>
                      </div>
                      <ProgressBar value={t.points} max={max} />
                    </li>
                  );
                })}
              </ol>
            )}
          </Section>
          <Section title="Conquistas">
            <EmptyState
              compact
              icon={Award}
              title="Chega em uma próxima etapa"
              description="Marcos de constância e de metas batidas. Nada é exibido aqui até o recurso estar pronto."
            />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | null;
  hint?: string | undefined;
}) {
  return (
    <div className="px-0 sm:px-5 sm:first:pl-0">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-1.5">
        {value === null ? (
          <Skeleton className="h-7 w-14" />
        ) : (
          <span className="num text-2xl font-bold">{value}</span>
        )}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </dd>
    </div>
  );
}

const chartConfig = {
  value: { label: "Aprovado", color: "var(--color-primary)" },
} satisfies ChartConfig;

function Evolution() {
  const me = useMe()!;
  const kpis = useKpiDefinitions();
  const series = useKpiSeries(me.id, HISTORY_DAYS);
  const [kpi, setKpi] = useState("todos");
  const data = useMemo(() => {
    if (!series.data) return [];
    return series.data.dates.map((date, i) => {
      const value =
        kpi === "todos"
          ? [...series.data!.byKpi.values()].reduce((a, arr) => a + (arr[i] ?? 0), 0)
          : (series.data!.byKpi.get(kpi)?.[i] ?? 0);
      return { date, value };
    });
  }, [series.data, kpi]);
  const hasData = data.some((d) => d.value > 0);

  return (
    <Section
      title="Evolução"
      description={`Unidades aprovadas por dia, últimos ${HISTORY_DAYS} dias`}
      action={
        <ToggleGroup
          type="single"
          size="sm"
          value={kpi}
          onValueChange={(v) => v && setKpi(v)}
          aria-label="Indicador"
          className="flex-wrap justify-end rounded-lg border border-border bg-surface p-0.5"
        >
          <ToggleGroupItem value="todos" className={toggleItem}>
            Todos
          </ToggleGroupItem>
          {kpis.data.map((k) => (
            <ToggleGroupItem key={k.id} value={k.id} className={toggleItem}>
              {k.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      }
    >
      {series.isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : !hasData ? (
        <EmptyState
          compact
          icon={BarChart3}
          title="Ainda sem histórico"
          description="O gráfico aparece quando seus primeiros registros forem aprovados."
        />
      ) : (
        <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
          <BarChart
            data={data}
            margin={{ top: 8, right: 4, left: -18, bottom: 0 }}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={28}
              tickFormatter={(d: string) => formatShortDate(d)}
            />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={44} />
            <ChartTooltip
              cursor={{ fill: "var(--color-muted)" }}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, p) => formatLongDate(String(p[0]?.payload?.date ?? ""))}
                />
              }
            />
            <Bar
              dataKey="value"
              fill="var(--color-value)"
              radius={[3, 3, 0, 0]}
              maxBarSize={18}
              isAnimationActive={false}
            />
          </BarChart>
        </ChartContainer>
      )}
    </Section>
  );
}

function RankingSection({
  data,
  loading,
  meId,
  periodLabel,
}: {
  data: RankPerson[];
  loading: boolean;
  meId: string;
  periodLabel: string;
}) {
  const scored = data.filter((p) => p.points > 0);
  const podium = scored.slice(0, 3);
  const rest = scored.slice(3, 10);
  const mine = data.find((p) => p.user_id === meId);
  // Ordem visual do pódio: 2º, 1º, 3º.
  const order = [podium[1], podium[0], podium[2]];
  const height = ["h-14", "h-20", "h-10"];

  return (
    <Section title="Ranking" description={`Pontos aprovados ${periodLabel}`}>
      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : scored.length === 0 ? (
        <EmptyState
          compact
          icon={Trophy}
          title="Ranking ainda vazio"
          description="Os pontos aparecem quando os primeiros registros forem aprovados."
        />
      ) : (
        <>
          <ol className="mb-4 grid grid-cols-3 items-end gap-2 pt-2" aria-label="Pódio">
            {order.map((p, i) =>
              p ? (
                <li key={p.user_id} className="flex flex-col items-center text-center">
                  <UserAvatar
                    name={p.full_name}
                    url={p.avatar_url}
                    className={i === 1 ? "size-12" : "size-10"}
                  />
                  <span className="mt-1.5 w-full truncate text-xs font-semibold">
                    {p.full_name.split(" ")[0]}
                    {p.user_id === meId ? " (você)" : ""}
                  </span>
                  <span className="num text-xs text-muted-foreground">{p.points} pts</span>
                  <span
                    className={`num mt-1.5 flex w-full items-start justify-center rounded-t-lg pt-1.5 text-sm font-bold ${height[i]} ${
                      i === 1
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary-soft text-primary"
                    }`}
                  >
                    {p.position}º
                  </span>
                </li>
              ) : (
                <li key={`empty-${i}`} aria-hidden />
              ),
            )}
          </ol>
          {rest.length > 0 && (
            <ol className="divide-y divide-border border-t border-border">
              {rest.map((p) => (
                <RankRow key={p.user_id} p={p} highlight={p.user_id === meId} />
              ))}
            </ol>
          )}
          {mine && mine.points > 0 && mine.position > 10 && (
            <ol className="border-t border-border">
              <RankRow p={mine} highlight />
            </ol>
          )}
          {mine && mine.points === 0 && (
            <p className="border-t border-border pt-3 text-xs text-muted-foreground">
              Você ainda não pontuou {periodLabel}.
            </p>
          )}
        </>
      )}
    </Section>
  );
}

function RankRow({ p, highlight }: { p: RankPerson; highlight: boolean }) {
  return (
    <li
      className={`flex items-center gap-3 rounded-lg py-2 ${highlight ? "-mx-2 bg-primary-soft px-2" : ""}`}
    >
      <span className="num w-6 text-sm font-bold text-muted-foreground">{p.position}º</span>
      <UserAvatar name={p.full_name} url={p.avatar_url} className="size-7" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {p.full_name}
          {highlight ? " (você)" : ""}
        </span>
        {p.team_name && (
          <span className="block truncate text-xs text-muted-foreground">{p.team_name}</span>
        )}
      </span>
      <span className="num text-sm font-bold">{p.points}</span>
    </li>
  );
}

function EntryHistory({
  entries,
  loading,
}: {
  entries: NonNullable<ReturnType<typeof useMyEntries>["data"]>;
  loading: boolean;
}) {
  const kpis = useKpiDefinitions(false);
  const [all, setAll] = useState(false);
  const shown = all ? entries : entries.slice(0, 7);
  return (
    <Section title="Histórico de registros" description={`Últimos ${HISTORY_DAYS} dias`}>
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : entries.length === 0 ? (
        <EmptyState
          compact
          icon={History}
          title="Nenhum registro ainda"
          description="Seus envios diários aparecem aqui com o status de aprovação."
        />
      ) : (
        <>
          <ul className="divide-y divide-border">
            {shown.map((e) => {
              const st = STATUS[e.status];
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                  <span className="num w-24 text-sm font-medium first-letter:uppercase">
                    {formatWeekdayShort(e.entry_date)} {formatShortDate(e.entry_date)}
                  </span>
                  <span className="num min-w-0 flex-1 text-xs text-muted-foreground">
                    {kpis.data
                      .filter((k) => e.daily_entry_values.some((v) => v.kpi_id === k.id))
                      .map(
                        (k) =>
                          `${k.name} ${e.daily_entry_values.find((v) => v.kpi_id === k.id)?.value ?? 0}`,
                      )
                      .join(" · ")}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}
                  >
                    {st.label}
                  </span>
                  {e.status === "rejected" && e.review_note && (
                    <p className="w-full text-xs text-destructive">Motivo: {e.review_note}</p>
                  )}
                  {e.status === "approved" &&
                    e.daily_entry_values.some(
                      (v) => v.original_value !== null && v.original_value !== v.value,
                    ) && (
                      <p className="w-full text-xs text-muted-foreground">
                        Valores ajustados pelo gestor na aprovação.
                      </p>
                    )}
                </li>
              );
            })}
          </ul>
          {entries.length > 7 && (
            <Button variant="ghost" size="sm" className="mt-1" onClick={() => setAll((v) => !v)}>
              {all ? "Mostrar menos" : `Ver os ${entries.length} registros`}
            </Button>
          )}
        </>
      )}
    </Section>
  );
}

function Ledger() {
  const ledger = useLedger();
  return (
    <Section
      title="Extrato de pontos"
      description="Cada ponto tem origem e data. Correções aparecem como estorno, nada é apagado."
    >
      {ledger.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (ledger.data ?? []).length === 0 ? (
        <EmptyState
          compact
          icon={ReceiptText}
          title="Sem pontos ainda"
          description="Os pontos entram quando o gestor aprova seus registros."
        />
      ) : (
        <ul className="divide-y divide-border">
          {ledger.data!.map((l) => (
            <li key={l.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="num w-12 shrink-0 text-xs text-muted-foreground">
                {formatShortDate(l.ref_date)}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {l.description || SOURCE_LABEL[l.source_type]}
                <span className="text-xs text-muted-foreground">
                  {" "}
                  · {SOURCE_LABEL[l.source_type] ?? l.source_type}
                </span>
              </span>
              <span
                className={`num font-semibold ${l.points < 0 ? "text-destructive" : "text-primary"}`}
              >
                {l.points > 0 ? "+" : ""}
                {l.points}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
