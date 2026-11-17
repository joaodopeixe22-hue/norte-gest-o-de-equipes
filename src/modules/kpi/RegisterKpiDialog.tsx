import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/modules/auth/useMe";
import { addDays, formatLongDate, todaySP } from "@/lib/dates";
import { toastError } from "@/lib/errors";
import { useKpiDefinitions, useMyEntry, useSubmitEntry } from "./hooks";
import { NumberStepper } from "./NumberStepper";

export function RegisterKpiDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const me = useMe();
  const today = todaySP();
  const [date, setDate] = useState(today);
  const kpis = useKpiDefinitions();
  const entry = useMyEntry(me?.id, date);
  const submit = useSubmitEntry();
  const [values, setValues] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open) return;
    const init: Record<string, number> = {};
    for (const k of kpis.data) init[k.id] = 0;
    for (const v of entry.data?.daily_entry_values ?? []) init[v.kpi_id] = v.value;
    setValues(init);
  }, [open, entry.data, kpis.data]);

  useEffect(() => {
    if (open) setDate(todaySP());
  }, [open]);

  const approved = entry.data?.status === "approved";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await submit.mutateAsync({ date, values });
      toast.success("Registro enviado. Agora é com seu gerente.");
      onOpenChange(false);
    } catch (err) {
      toastError(err);
    }
  }

  const dates = [today, addDays(today, -1), addDays(today, -2)];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Registrar indicadores</DialogTitle>
            <DialogDescription>O registro vai para aprovação do seu gerente antes de contar pontos.</DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex gap-1.5" role="radiogroup" aria-label="Dia do registro">
            {dates.map((d, i) => (
              <button
                type="button"
                key={d}
                role="radio"
                aria-checked={date === d}
                onClick={() => setDate(d)}
                className={`rounded-full border px-3 py-1 text-xs font-medium max-md:px-3.5 max-md:py-2 max-md:text-sm transition-colors ${
                  date === d ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {i === 0 ? "Hoje" : i === 1 ? "Ontem" : formatLongDate(d).split(",")[0]}
              </button>
            ))}
          </div>

          {entry.data?.status === "rejected" && (
            <p className="mt-4 rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive">
              Recusado: {entry.data.review_note}. Corrija e envie de novo.
            </p>
          )}
          {entry.data?.status === "pending" && (
            <p className="mt-4 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
              Já existe um envio aguardando aprovação. Reenviar substitui os valores.
            </p>
          )}
          {approved && (
            <p className="mt-4 rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary">
              O registro de {formatLongDate(date)} já foi aprovado.
            </p>
          )}

          <div className="mt-4 divide-y divide-border">
            {kpis.isLoading || entry.isLoading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="my-3 h-12 w-full" />)
              : kpis.data.map((k) => (
                  <div key={k.id} className="flex items-center justify-between gap-4 py-3">
                    <label htmlFor={`kpi-${k.id}`} className="min-w-0">
                      <span className="block text-sm font-semibold">{k.name}</span>
                      {k.description && <span className="block truncate text-xs text-muted-foreground">{k.description}</span>}
                    </label>
                    <NumberStepper
                      id={`kpi-${k.id}`}
                      value={values[k.id] ?? 0}
                      onChange={(v) => setValues((s) => ({ ...s, [k.id]: v }))}
                    />
                  </div>
                ))}
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submit.isPending || approved || kpis.isLoading}>
              {submit.isPending ? <Loader2 className="animate-spin" /> : <Send strokeWidth={1.75} />}
              Enviar para aprovação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
