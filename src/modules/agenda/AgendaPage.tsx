import { useState } from "react";
import {
  CalendarClock,
  CalendarPlus,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { addDays, formatLongDate, formatTimeSP, todaySP } from "@/lib/dates";
import { toastError } from "@/lib/errors";
import { useMe } from "@/modules/auth/useMe";
import { ConfirmDialog } from "@/modules/shell/ConfirmDialog";
import { EmptyState } from "@/modules/shell/EmptyState";
import { PageHeader, Section } from "@/modules/shell/PageHeader";
import { useUiActions } from "@/modules/shell/ui-actions";
import { TaskDialog } from "@/modules/tasks/TaskDialog";
import { TaskRow } from "@/modules/tasks/TaskRow";
import {
  useDeleteEvent,
  useDeleteTask,
  useEventsBetween,
  useTasks,
  type Task,
  type TaskFilter,
} from "@/modules/tasks/hooks";

const FILTERS: { value: TaskFilter; label: string; empty: string }[] = [
  { value: "hoje", label: "Hoje", empty: "Nada pendente para hoje." },
  { value: "semana", label: "Semana", empty: "Nenhuma tarefa aberta nesta semana." },
  { value: "atrasadas", label: "Atrasadas", empty: "Nenhuma tarefa atrasada. Bom trabalho." },
  { value: "todas", label: "Abertas", empty: "Nenhuma tarefa aberta." },
  { value: "concluidas", label: "Concluídas", empty: "Você ainda não concluiu tarefas." },
];

const toggleItem =
  "h-7 px-2.5 text-xs data-[state=on]:bg-primary-soft data-[state=on]:text-primary";

export function AgendaPage() {
  const me = useMe()!;
  const ui = useUiActions();
  const [filter, setFilter] = useState<TaskFilter>("hoje");
  const [scope, setScope] = useState<"mine" | "created">("mine");
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const tasks = useTasks(filter, scope);
  const delTask = useDeleteTask();
  const current = FILTERS.find((f) => f.value === filter)!;

  return (
    <div className="fade-up">
      <PageHeader
        crumbs={[{ label: "Home", to: "/inicio" }, { label: "Agenda e tarefas" }]}
        title="Agenda e tarefas"
        description="O que precisa ser feito e o que tem hora marcada."
        actions={
          <>
            <Button variant="outline" onClick={ui.openNewEvent}>
              <CalendarPlus strokeWidth={1.75} /> Compromisso
            </Button>
            <Button onClick={ui.openNewTask}>
              <Plus strokeWidth={1.75} /> Nova tarefa
            </Button>
          </>
        }
      />

      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <Section
          title="Tarefas"
          action={
            me.isManager ? (
              <ToggleGroup
                type="single"
                size="sm"
                value={scope}
                onValueChange={(v) => v && setScope(v as typeof scope)}
                aria-label="De quem"
                className="rounded-lg border border-border bg-surface p-0.5"
              >
                <ToggleGroupItem value="mine" className={toggleItem}>
                  Minhas
                </ToggleGroupItem>
                <ToggleGroupItem value="created" className={toggleItem}>
                  Que atribuí
                </ToggleGroupItem>
              </ToggleGroup>
            ) : undefined
          }
        >
          <div
            className="mb-2 flex flex-wrap gap-1.5"
            role="tablist"
            aria-label="Filtro de tarefas"
          >
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150 ${
                  filter === f.value
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {tasks.isLoading ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : tasks.isError ? (
            <p className="py-6 text-sm text-destructive">
              Não foi possível carregar as tarefas. Tente novamente.
            </p>
          ) : (tasks.data ?? []).length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title={current.empty}
              description={
                scope === "created"
                  ? "Tarefas que você criar para a equipe aparecem aqui."
                  : undefined
              }
              action={
                <Button size="sm" variant="soft" onClick={ui.openNewTask}>
                  Nova tarefa
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {tasks.data!.map((t) => {
                const canEdit = t.created_by === me.id || me.isManager;
                const canDelete = t.created_by === me.id || me.isAdmin;
                return (
                  <TaskRow
                    key={t.id}
                    task={t}
                    assigneeName={scope === "created" ? t.assignee?.full_name : undefined}
                    onOpen={canEdit ? () => setEditing(t) : undefined}
                    trailing={
                      canEdit || canDelete ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 shrink-0"
                              aria-label={`Ações de "${t.title}"`}
                            >
                              <MoreHorizontal strokeWidth={1.75} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEdit && (
                              <DropdownMenuItem onClick={() => setEditing(t)}>
                                <Pencil strokeWidth={1.75} /> Editar
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleting(t)}
                              >
                                <Trash2 strokeWidth={1.75} /> Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : undefined
                    }
                  />
                );
              })}
            </ul>
          )}
        </Section>

        <UpcomingEvents />
      </div>

      <TaskDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} task={editing} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir tarefa?"
        description={deleting ? `"${deleting.title}" será excluída para sempre.` : undefined}
        confirmLabel="Excluir"
        destructive
        onConfirm={() =>
          deleting &&
          delTask.mutate(deleting.id, {
            onSuccess: () => toast.success("Tarefa excluída."),
            onError: toastError,
          })
        }
      />
    </div>
  );
}

function UpcomingEvents() {
  const me = useMe()!;
  const ui = useUiActions();
  const today = todaySP();
  const events = useEventsBetween(today, addDays(today, 13));
  const del = useDeleteEvent();
  const [deleting, setDeleting] = useState<{ id: string; title: string } | null>(null);

  const byDay = new Map<string, NonNullable<typeof events.data>>();
  for (const e of events.data ?? []) {
    const day = todaySP(new Date(e.starts_at));
    byDay.set(day, [...(byDay.get(day) ?? []), e]);
  }

  return (
    <Section title="Compromissos" description="Próximos 14 dias">
      {events.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : byDay.size === 0 ? (
        <EmptyState
          compact
          icon={CalendarClock}
          title="Agenda livre"
          description="Reuniões, entregas e visitas com hora marcada aparecem aqui."
          action={
            <Button size="sm" variant="soft" onClick={ui.openNewEvent}>
              Novo compromisso
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {[...byDay.entries()].map(([day, list]) => (
            <div key={day}>
              <h3 className="eyebrow mb-1 first-letter:uppercase">
                {day === today ? "Hoje" : formatLongDate(day)}
              </h3>
              <ul className="divide-y divide-border">
                {list.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="num w-12 shrink-0 text-xs font-semibold text-muted-foreground">
                      {e.all_day ? "Dia" : formatTimeSP(e.starts_at)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{e.title}</span>
                      {e.team && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: e.team.color }}
                            aria-hidden
                          />
                          Equipe {e.team.name}
                        </span>
                      )}
                    </span>
                    {(e.owner_id === me.id || me.isAdmin) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-muted-foreground"
                        aria-label={`Excluir "${e.title}"`}
                        onClick={() => setDeleting({ id: e.id, title: e.title })}
                      >
                        <Trash2 strokeWidth={1.75} />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir compromisso?"
        description={
          deleting ? `"${deleting.title}" sai da agenda de todos que o viam.` : undefined
        }
        confirmLabel="Excluir"
        destructive
        onConfirm={() =>
          deleting &&
          del.mutate(deleting.id, {
            onSuccess: () => toast.success("Compromisso excluído."),
            onError: toastError,
          })
        }
      />
    </Section>
  );
}
