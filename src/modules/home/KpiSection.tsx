import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { periodRange, todaySP, type Period } from "@/lib/dates";
import { useMe } from "@/modules/auth/useMe";
import { useKpiProgress, useKpiSeries } from "@/modules/kpi/hooks";
import { ProgressBar, Sparkline } from "@/modules/kpi/Sparkline";
import { useUiActions } from "@/modules/shell/ui-actions";
import { Section } from "@/modules/shell/PageHeader";

const PERIOD_LABEL: Record<Period, string> = { dia: "ontem", semana: "semana anterior", mes: "mês anterior" };

export function KpiSection() {
  const me = useMe();
  const { openRegisterKpi } = useUiActions();
  const [period, setPeriod] = useState<Period>("dia");
  const r = periodRange(period, todaySP());
  const cur = useKpiProgress(me?.id, r.start, r.end);
  const prev = useKpiProgress(me?.id, r.prevStart, r.prevEnd);
  const series = useKpiSeries(me?.id, 14);

  return (
    <Section
      title="Indicadores"
      description="Só registros aprovados contam. Mini-histórico: últimos 14 dias."
      action={
        <ToggleGroup
          type="single"
          size="sm"
          value={period}
          onValueChange={(v) => v && setPeriod(v as Period)}
          aria-label="Período"
          className="rounded-lg border border-border bg-surface p-0.5"
        >
          <ToggleGroupItem value="dia" className="h-7 px-2.5 text-xs max-md:h-9 max-md:px-3 max-md:text-sm data-[state=on]:bg-primary-soft data-[state=on]:text-primary">Dia</ToggleGroupItem>
          <ToggleGroupItem value="semana" className="h-7 px-2.5 text-xs max-md:h-9 max-md:px-3 max-md:text-sm data-[state=on]:bg-primary-soft data-[state=on]:text-primary">Semana</ToggleGroupItem>
          <ToggleGroupItem value="mes" className="h-7 px-2.5 text-xs max-md:h-9 max-md:px-3 max-md:text-sm data-[state=on]:bg-primary-soft data-[state=on]:text-primary">Mês</ToggleGroupItem>
        </ToggleGroup>
      }
    >
      <ul className="divide-y divide-border">
        {cur.isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="py-4">
                <Skeleton className="h-10 w-full" />
              </li>
            ))
          : (cur.data ?? []).map((k) => {
              const before = prev.data?.find((p) => p.kpi_id === k.kpi_id)?.total ?? 0;
              const delta = k.total - before;
              const pct = k.goal > 0 ? Math.round((k.total / k.goal) * 100) : 0;
              return (
                <li key={k.kpi_id} className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 py-4 sm:grid-cols-[9rem_1fr_6rem_6rem]">
                  <div>
                    <p className="text-sm font-semibold">{k.name}</p>
                    <p className="eyebrow num">Meta diária {k.daily_goal}</p>
                  </div>
                  <div className="order-3 col-span-2 sm:order-none sm:col-span-1">
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="num text-lg font-bold">
                        {k.total}
                        <span className="text-sm font-medium text-muted-foreground"> / {k.goal}</span>
                      </span>
                      <span className={`num text-xs font-semibold ${pct >= 100 ? "text-primary" : "text-muted-foreground"}`}>{pct}%</span>
                    </div>
                    <ProgressBar value={k.total} max={k.goal} />
                  </div>
                  <div className="num flex items-center gap-1 text-xs text-muted-foreground" title={`vs. ${PERIOD_LABEL[period]}`}>
                    {delta > 0 ? (
                      <ArrowUpRight className="size-3.5 text-primary" aria-hidden />
                    ) : delta < 0 ? (
                      <ArrowDownRight className="size-3.5 text-destructive" aria-hidden />
                    ) : (
                      <Minus className="size-3.5" aria-hidden />
                    )}
                    <span>
                      {delta > 0 ? "+" : ""}
                      {delta} <span className="sr-only sm:not-sr-only">vs. {PERIOD_LABEL[period]}</span>
                    </span>
                  </div>
                  <div className="hidden justify-end sm:flex">
                    <Sparkline values={series.data?.byKpi.get(k.kpi_id) ?? new Array(14).fill(0)} label={`Histórico de ${k.name}`} />
                  </div>
                </li>
              );
            })}
      </ul>
      <div className="mt-4">
        <Button onClick={openRegisterKpi} className="max-sm:w-full">
          <PenLine strokeWidth={1.75} /> Registrar indicadores
        </Button>
      </div>
    </Section>
  );
}
