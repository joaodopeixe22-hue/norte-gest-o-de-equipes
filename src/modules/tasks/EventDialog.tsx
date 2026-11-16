import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Field } from "@/modules/shell/Field";
import { useMe } from "@/modules/auth/useMe";
import { todaySP } from "@/lib/dates";
import { toastError } from "@/lib/errors";
import { useCreateEvent } from "./hooks";

const schema = z
  .object({
    title: z.string().trim().min(2, "Dê um título ao compromisso.").max(140),
    date: z.string().min(10, "Informe a data."),
    start: z.string().optional(),
    end: z.string().optional(),
  })
  .refine((d) => !d.start || !d.end || d.end > d.start, { path: ["end"], message: "O fim deve ser depois do início." });

export function EventDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const me = useMe();
  const create = useCreateEvent();
  const [allDay, setAllDay] = useState(false);
  const [team, setTeam] = useState("pessoal");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const teams = useQuery({
    queryKey: ["teams-managed", me?.id],
    enabled: !!me?.isManager && open,
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("id, name, manager_id").order("name");
      return (data ?? []).filter((t) => me!.isAdmin || t.manager_id === me!.id);
    },
  });

  useEffect(() => {
    if (open) {
      setAllDay(false);
      setTeam("pessoal");
      setErrors({});
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    const { title, date, start, end } = parsed.data;
    const startsAt = `${date}T${allDay || !start ? "00:00" : start}:00-03:00`;
    const endsAt = !allDay && end ? `${date}T${end}:00-03:00` : null;
    try {
      await create.mutateAsync({
        title,
        starts_at: startsAt,
        ends_at: endsAt,
        all_day: allDay || !start,
        owner_id: me!.id,
        team_id: team === "pessoal" ? null : team,
      });
      toast.success("Compromisso criado.");
      onOpenChange(false);
    } catch (err) {
      toastError(err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>Novo compromisso</DialogTitle>
            <DialogDescription>Reuniões, entregas, visitas — o que tem hora marcada.</DialogDescription>
          </DialogHeader>
          <Field id="e-title" label="Título" error={errors["title"]}>
            <Input id="e-title" name="title" autoFocus />
          </Field>
          <Field id="e-date" label="Data" error={errors["date"]}>
            <Input id="e-date" name="date" type="date" defaultValue={todaySP()} />
          </Field>
          <div className="flex items-center gap-2">
            <Switch id="e-allday" checked={allDay} onCheckedChange={setAllDay} />
            <Label htmlFor="e-allday">Dia inteiro</Label>
          </div>
          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <Field id="e-start" label="Início">
                <Input id="e-start" name="start" type="time" />
              </Field>
              <Field id="e-end" label="Fim (opcional)" error={errors["end"]}>
                <Input id="e-end" name="end" type="time" />
              </Field>
            </div>
          )}
          {me?.isManager && (teams.data?.length ?? 0) > 0 && (
            <Field id="e-team" label="Visível para">
              <Select value={team} onValueChange={setTeam}>
                <SelectTrigger id="e-team">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pessoal">Só eu</SelectItem>
                  {teams.data!.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      Equipe {t.name}
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
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="animate-spin" />} Criar compromisso
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
