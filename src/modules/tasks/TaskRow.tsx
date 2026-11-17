import { Check, Clock } from "lucide-react";
import { formatShortDate, todaySP } from "@/lib/dates";
import { toastError } from "@/lib/errors";
import { isOverdue, PRIORITY_LABEL, useToggleTask, type Task } from "./hooks";

export function TaskRow({
  task,
  onOpen,
  assigneeName,
  trailing,
}: {
  task: Task;
  onOpen?: (() => void) | undefined;
  assigneeName?: string | null | undefined;
  trailing?: React.ReactNode;
}) {
  const toggle = useToggleTask();
  const done = task.status === "concluida";
  const late = isOverdue(task);
  const today = todaySP();
  return (
    <li className="group flex items-start gap-3 py-2.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Reabrir "${task.title}"` : `Concluir "${task.title}"`}
        onClick={() => toggle.mutate(task, { onError: toastError })}
        className={`relative mt-0.5 flex size-5 shrink-0 after:absolute after:-inset-3 after:content-[''] max-md:size-6 items-center justify-center rounded-md border transition-colors duration-150 ${
          done ? "border-primary bg-primary text-primary-foreground" : "border-input bg-surface hover:border-primary"
        }`}
      >
        {done && <Check className="size-3.5" strokeWidth={2.5} />}
      </button>
      <button type="button" onClick={onOpen} disabled={!onOpen} className="min-w-0 flex-1 text-left disabled:cursor-default">
        <span className={`block text-sm ${done ? "text-muted-foreground line-through" : "font-medium"}`}>{task.title}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {task.due_date && (
            <span className={`num inline-flex items-center gap-1 ${late ? "font-semibold text-destructive" : ""}`}>
              <Clock className="size-3" aria-hidden />
              {late ? "Atrasada · " : ""}
              {task.due_date === today ? "Hoje" : formatShortDate(task.due_date)}
              {task.due_time ? ` ${task.due_time.slice(0, 5)}` : ""}
            </span>
          )}
          {task.category && <span>{task.category}</span>}
          {assigneeName && <span>· {assigneeName}</span>}
        </span>
      </button>
      {task.priority !== "media" && !done && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            task.priority === "alta" ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"
          }`}
        >
          {PRIORITY_LABEL[task.priority]}
        </span>
      )}
      {trailing}
    </li>
  );
}
