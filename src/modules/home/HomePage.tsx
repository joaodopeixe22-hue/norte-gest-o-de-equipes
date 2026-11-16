import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  Clock,
  Inbox,
  ListChecks,
  ListPlus,
  Megaphone,
  NotebookPen,
  PenLine,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/modules/auth/useMe";
import { addDays, formatLongDate, formatShortDate, formatTimeSP, greeting, hourSP, startOfMonth, startOfWeek, todaySP } from "@/lib/dates";
import { useKpiProgress } from "@/modules/kpi/hooks";
import { useEventsBetween, useTodayTasks } from "@/modules/tasks/hooks";
import { TaskRow } from "@/modules/tasks/TaskRow";
import { EmptyState } from "@/modules/shell/EmptyState";
import { Section } from "@/modules/shell/PageHeader";
import { UserAvatar } from "@/modules/shell/UserAvatar";
import { useUiActions } from "@/modules/shell/ui-actions";
import { useAnnouncements, useDaySummary, useRanking, useTeamWeekly } from "./hooks";
import { KpiSection } from "./KpiSection";

export function HomePage() {
  const me = useMe()!;
  const today = todaySP();
  const first = (me.full_name || me.matricula).split(" ")[0];
  const summary = useDaySummary(today);
  const dayKpi = useKpiProgress(me.id, today, today);
  const month = useRanking(startOfMonth(today), today);
  const ui = useUiActions();

  const goalSum = (dayKpi.data ?? []).reduce((a, k) => a + k.goal, 0);
  const doneSum = (dayKpi.data ?? []).reduce((a, k) => a + Math.min(k.total, k.goal), 0);
  const goalPct = goalSum > 0 ? Math.round((doneSum / goalSum) * 100) : 0;
  const myRank = month.data?.individual.find((p) => p.user_id === me.id);
  const s = summary.data;

  return (
    <div className="space-y-10 fade-up">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow first-letter:uppercase">{formatLongDate(today)}</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
            {greeting(hourSP())}, {first}
          </h1>
        </div>
        <Link to="/perfil" aria-label="Meu perfil" className="rounded-full">
          <UserAvatar name={me.full_name} url={me.avatar_url} className="size-10" />
        </Link>
      </header>

      {/* Visão do dia */}
      <section aria-label="Visão do dia">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-0 rounded-xl border border-border bg-surface px-5 py-4 shadow-soft sm:grid-cols-5 sm:divide-x sm:divide-border">
          <Stat label="Meta do dia" value={dayKpi.isLoading ? null : `${goalPct}%`} hint="aprovado hoje" />
          <Stat label="Pontos no mês" value={summary.isLoading ? null : String(s?.month_points ?? 0)} />
          <Stat
            label="Ranking do mês"
            value={month.isLoading ? null : myRank ? `${myRank.position}º` : "—"}
            hint={month.data ? `de ${month.data.individual.length}` : undefined}
          />
          <Stat label="Tarefas pendentes" value={summary.isLoading ? null : String(s?.tasks_pending ?? 0)} hint="até hoje" />
          <Stat label="Concluídas hoje" value={summary.isLoading ? null : String(s?.tasks_done ?? 0)} />
        </dl>
        <EntryStatus summary={s} loading={summary.isLoading} onFix={ui.openRegisterKpi} />
      </section>

      {me.isManager && (s?.pending_approvals ?? 0) > 0 && (
        <section aria-label="Aguardando você" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning-soft px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Inbox className="size-5 text-warning" strokeWidth={1.75} aria-hidden />
            <p className="text-sm">
              <span className="font-semibold">Aguardando você:</span>{" "}
              <span className="num">{s!.pending_approvals}</span> {s!.pending_approvals === 1 ? "registro pendente" : "registros pendentes"} de aprovação.
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/equipes/aprovacoes">Revisar agora</Link>
          </Button>
        </section>
      )}

      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-10">
          <KpiSection />
          <Routine />
        </div>
        <div className="space-y-10">
          <QuickAccess />
          <TeamSection />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | null; hint?: string | undefined }) {
  return (
    <div className="px-0 sm:px-5 sm:first:pl-0">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-1.5">
        {value === null ? <Skeleton className="h-7 w-14" /> : <span className="num text-2xl font-bold">{value}</span>}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </dd>
    </div>
  );
}

function EntryStatus({
  summary,
  loading,
  onFix,
}: {
  summary: ReturnType<typeof useDaySummary>["data"];
  loading: boolean;
  onFix: () => void;
}) {
  if (loading) return null;
  const e = summary?.entry;
  if (!e)
    return (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1 text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <PenLine className="size-4" strokeWidth={1.75} aria-hidden /> Você ainda não registrou hoje.
        </span>
        <Button variant="soft" size="sm" onClick={onFix}>
          Registrar agora
        </Button>
      </div>
    );
  if (e.status === "pending")
    return (
      <p className="mt-3 flex items-center gap-2 px-1 text-sm text-warning">
        <Clock className="size-4" strokeWidth={1.75} aria-hidden /> Registro de hoje enviado às {formatTimeSP(e.submitted_at)} — aguardando aprovação.
      </p>
    );
  if (e.status === "rejected")
    return (
      <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-destructive-soft px-4 py-2.5 text-sm text-destructive">
        <span className="flex items-center gap-2">
          <AlertCircle className="size-4" strokeWidth={1.75} aria-hidden />
          <span>
            <strong>Registro recusado.</strong> Motivo: {e.review_note}
          </span>
        </span>
        <Button size="sm" variant="outline" onClick={onFix}>
          Corrigir
        </Button>
      </div>
    );
  return (
    <p className="mt-3 flex items-center gap-2 px-1 text-sm text-primary">
      <ListChecks className="size-4" strokeWidth={1.75} aria-hidden /> Registro de hoje aprovado.
    </p>
  );
}

function Routine() {
  const today = todaySP();
  const tasks = useTodayTasks();
  const events = useEventsBetween(today, today);
  const ann = useAnnouncements();
  const ui = useUiActions();
  return (
    <Section
      title="Minha rotina"
      action={
        <Button variant="ghost" size="sm" asChild>
          <Link to="/agenda">Ver agenda</Link>
        </Button>
      }
    >
      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <h3 className="eyebrow mb-1">Tarefas de hoje</h3>
          {tasks.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (tasks.data ?? []).length === 0 ? (
            <EmptyState compact icon={ListChecks} title="Nada para hoje" description="Crie uma tarefa para organizar o dia." action={<Button size="sm" variant="soft" onClick={ui.openNewTask}>Nova tarefa</Button>} />
          ) : (
            <ul className="divide-y divide-border">
              {tasks.data!.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-6">
          <div>
            <h3 className="eyebrow mb-1">Compromissos de hoje</h3>
            {events.isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (events.data ?? []).length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Nenhum compromisso hoje.</p>
            ) : (
              <ul className="divide-y divide-border">
                {events.data!.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="num w-12 shrink-0 text-xs font-semibold text-muted-foreground">
                      {e.all_day ? "Dia" : formatTimeSP(e.starts_at)}
                    </span>
                    <span className="font-medium">{e.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="eyebrow mb-1">Formulários aguardando</h3>
            <p className="py-2 text-sm text-muted-foreground">Nenhum formulário pendente.</p>
          </div>
          <div>
            <h3 className="eyebrow mb-1">Avisos</h3>
            {(ann.data ?? []).length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Sem avisos no momento.</p>
            ) : (
              <ul className="divide-y divide-border">
                {ann.data!.map((a) => (
                  <li key={a.id} className="flex gap-2.5 py-2">
                    <Megaphone className={`mt-0.5 size-4 shrink-0 ${a.pinned ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.75} aria-hidden />
                    <div>
                      <p className="text-sm font-medium">{a.title}</p>
                      {a.body && <p className="text-xs text-muted-foreground">{a.body}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

function QuickAccess() {
  const ui = useUiActions();
  const items = [
    { label: "Criar anotação", icon: NotebookPen, to: "/workspace" as const },
    { label: "Registrar indicadores", icon: PenLine, onClick: ui.openRegisterKpi },
    { label: "Criar tarefa", icon: ListPlus, onClick: ui.openNewTask },
    { label: "Novo compromisso", icon: CalendarPlus, onClick: ui.openNewEvent },
    { label: "Formulários", icon: ClipboardList, to: "/formularios" as const },
    { label: "Calendário", icon: CalendarDays, to: "/agenda" as const },
  ];
  const cls =
    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-150 hover:bg-accent focus-visible:bg-accent";
  return (
    <Section title="Acesso rápido">
      <div className="grid grid-cols-2 gap-1">
        {items.map((i) =>
          i.to ? (
            <Link key={i.label} to={i.to} className={cls}>
              <i.icon className="size-4 text-primary" strokeWidth={1.75} aria-hidden /> {i.label}
            </Link>
          ) : (
            <button key={i.label} onClick={i.onClick} className={`${cls} text-left`}>
              <i.icon className="size-4 text-primary" strokeWidth={1.75} aria-hidden /> {i.label}
            </button>
          ),
        )}
      </div>
    </Section>
  );
}

function TeamSection() {
  const me = useMe()!;
  const today = todaySP();
  const ws = startOfWeek(today);
  const week = useRanking(ws, addDays(ws, 6));
  const weekly = useTeamWeekly(me.team_id);
  const top = (week.data?.individual ?? []).slice(0, 5);
  const mine = week.data?.individual.find((p) => p.user_id === me.id);
  const maxW = Math.max(1, ...(weekly.data ?? []).map((w) => w.points));

  return (
    <Section title="Equipe" description="Ranking da semana (pontos aprovados)">
      {week.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : top.length === 0 || top.every((p) => p.points === 0) ? (
        <EmptyState compact icon={Trophy} title="Ranking ainda vazio" description="Os pontos aparecem quando os primeiros registros forem aprovados." />
      ) : (
        <ol className="divide-y divide-border">
          {top.map((p) => (
            <RankRow key={p.user_id} p={p} highlight={p.user_id === me.id} />
          ))}
          {mine && mine.position > 5 && (
            <>
              <li className="py-1 text-center text-xs text-muted-foreground" aria-hidden>…</li>
              <RankRow p={mine} highlight />
            </>
          )}
        </ol>
      )}

      {(week.data?.teams ?? []).length > 0 && (
        <div className="mt-6">
          <h3 className="eyebrow mb-2">Equipes</h3>
          <ul className="space-y-2">
            {week.data!.teams.map((t) => (
              <li key={t.team_id} className="flex items-center gap-2.5 text-sm">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} aria-hidden />
                <span className={`flex-1 truncate ${t.team_id === me.team_id ? "font-semibold" : ""}`}>{t.name}</span>
                <span className="num font-semibold">{t.points}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {me.team_id && (
        <div className="mt-6">
          <h3 className="eyebrow mb-2">Evolução semanal da minha equipe</h3>
          {weekly.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (weekly.data ?? []).every((w) => w.points === 0) ? (
            <p className="text-sm text-muted-foreground">Sem pontos aprovados nas últimas 8 semanas.</p>
          ) : (
            <div className="flex h-24 items-end gap-1.5" role="img" aria-label="Pontos da equipe nas últimas 8 semanas">
              {weekly.data!.map((w) => (
                <div key={w.week_start} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="progress-fill w-full rounded-t-sm bg-primary/80 [transform-origin:bottom]"
                    style={{ height: `${Math.max(4, (w.points / maxW) * 72)}px` }}
                    title={`${formatShortDate(w.week_start)}: ${w.points} pts`}
                  />
                  <span className="num text-[10px] text-muted-foreground">{formatShortDate(w.week_start)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

function RankRow({ p, highlight }: { p: { position: number; full_name: string; avatar_url: string | null; team_name: string | null; points: number }; highlight: boolean }) {
  return (
    <li className={`flex items-center gap-3 rounded-lg py-2 ${highlight ? "-mx-2 bg-primary-soft px-2" : ""}`}>
      <span className="num w-6 text-sm font-bold text-muted-foreground">{p.position}º</span>
      <UserAvatar name={p.full_name} url={p.avatar_url} className="size-7" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{p.full_name}{highlight ? " (você)" : ""}</span>
        {p.team_name && <span className="block truncate text-xs text-muted-foreground">{p.team_name}</span>}
      </span>
      <span className="num text-sm font-bold">{p.points}</span>
    </li>
  );
}
