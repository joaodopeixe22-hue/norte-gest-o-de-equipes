import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/modules/shell/Field";
import { useMe } from "@/modules/auth/useMe";
import { todaySP } from "@/lib/dates";
import { toastError } from "@/lib/errors";
import { PRIORITY_LABEL, useAssignable, useSaveTask, type Task } from "./hooks";

const schema = z.object({
  title: z.string().trim().min(2, "Dê um título à tarefa.").max(140),
  description: z.string().trim().max(2000).optional(),
  due_date: z.string().optional(),
  due_time: z.string().optional(),
  priority: z.enum(["baixa", "media", "alta"]),
  category: z.string().trim().max(40).optional(),
  assigned_to: z.string().uuid(),
});

export function TaskDialog({
  open,
  onOpenChange,
  task,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  task?: Task | null;
}) {
  const me = useMe();
  const people = useAssignable();
  const save = useSaveTask();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [priority, setPriority] = useState<"baixa" | "media" | "alta">("media");
  const [assignee, setAssignee] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setPriority(task?.priority ?? "media");
    setAssignee(task?.assigned_to ?? me?.id ?? "");
  }, [open, task, me?.id]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = Object.fromEntries(fd) as Record<string, string>;
    const parsed = schema.safeParse({ ...raw, priority, assigned_to: assignee });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    const v = parsed.data;
    try {
      await save.mutateAsync({
        id: task?.id,
        values: {
          title: v.title,
          description: v.description || null,
          due_date: v.due_date || null,
          due_time: v.due_time || null,
          priority: v.priority,
          category: v.category || null,
          assigned_to: v.assigned_to,
          ...(task ? {} : { created_by: me!.id }),
        },
      });
      toast.success(task ? "Tarefa atualizada." : "Tarefa criada.");
      onOpenChange(false);
    } catch (err) {
      toastError(err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
            <DialogDescription>Defina o que precisa ser feito e quando.</DialogDescription>
          </DialogHeader>
          <Field id="t-title" label="Título" error={errors.title}>
            <Input id="t-title" name="title" defaultValue={task?.title} autoFocus />
          </Field>
          <Field id="t-desc" label="Descrição (opcional)">
            <Textarea id="t-desc" name="description" rows={3} defaultValue={task?.description ?? ""} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="t-date" label="Prazo">
              <Input id="t-date" name="due_date" type="date" defaultValue={task?.due_date ?? todaySP()} />
            </Field>
            <Field id="t-time" label="Horário (opcional)">
              <Input id="t-time" name="due_time" type="time" defaultValue={task?.due_time?.slice(0, 5) ?? ""} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="t-priority" label="Prioridade">
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger id="t-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["baixa", "media", "alta"] as const).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="t-cat" label="Categoria (opcional)">
              <Input id="t-cat" name="category" placeholder="Ex.: Estoque" defaultValue={task?.category ?? ""} />
            </Field>
          </div>
          {me?.isManager && (
            <Field id="t-assignee" label="Responsável" error={errors.assigned_to}>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger id="t-assignee">
                  <SelectValue placeholder="Escolha a pessoa" />
                </SelectTrigger>
                <SelectContent>
                  {(people.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.id === me.id ? `${p.full_name} (eu)` : p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="animate-spin" />} {task ? "Salvar" : "Criar tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
