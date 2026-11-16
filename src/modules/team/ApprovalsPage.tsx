import { useMemo, useState } from "react";
import {
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { addDays, formatLongDate, formatShortDate, formatTimeSP, todaySP } from "@/lib/dates";
import { errorMessage, toastError } from "@/lib/errors";
import { useMe } from "@/modules/auth/useMe";
import { useKpiDefinitions } from "@/modules/kpi/hooks";
import { ConfirmDialog } from "@/modules/shell/ConfirmDialog";
import { EmptyState } from "@/modules/shell/EmptyState";
import { PageHeader, Section } from "@/modules/shell/PageHeader";
import { UserAvatar } from "@/modules/shell/UserAvatar";
import {
  useEntriesOfDay,
  useManagedTeams,
  usePendingDays,
  useReopenEntry,
  useReviewEntry,
  type ApprovalEntry,
  type Person,
} from "./hooks";

type Edits = Record<string, Record<string, number>>;

function changedValues(entry: ApprovalEntry, edits: Edits): Record<string, number> | undefined {
  const mine = edits[entry.id];
  if (!mine) return undefined;
  const diff: Record<string, number> = {};
  for (const v of entry.daily_entry_values) {
    const next = mine[v.kpi_id];
    if (next !== undefined && next !== v.value) diff[v.kpi_id] = next;
  }
  return Object.keys(diff).length ? diff : undefined;
}

export function ApprovalsPage() {
  const me = useMe()!;
  const today = todaySP();
  const [date, setDate] = useState(today);
  const kpis = useKpiDefinitions();
  const managed = useManagedTeams();
  const day = useEntriesOfDay(date);
  const pendingDays = usePendingDays();
  const review = useReviewEntry();
  const reopen = useReopenEntry();
  const [edits, setEdits] = useState<Edits>({});
  const [rejecting, setRejecting] = useState<ApprovalEntry | null>(null);
  const [reopening, setReopening] = useState<ApprovalEntry | null>(null);
  const [bulk, setBulk] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const people = useMemo(() => {
    const map = new Map<string, Person>();
    for (const p of managed.data?.people ?? []) map.set(p.id, p);
    for (const p of day.data?.authors ?? []) if (!map.has(p.id)) map.set(p.id, p);
    return map;
  }, [managed.data, day.data]);
  const teamOf = (id: string | null | undefined) => managed.data?.teams.find((t) => t.id === id);

  // O que eu posso revisar: registros de quem eu gerencio; o meu próprio só se eu for admin.
  const visible = (day.data?.entries ?? []).filter(
    (e) => e.user_id !== me.id || me.isAdmin || people.get(e.user_id)?.team_id != null,
  );
  const canReview = (e: ApprovalEntry) => e.user_id !== me.id || me.isAdmin;
  const pending = visible.filter((e) => e.status === "pending");
  const approvable = pending.filter(canReview);
  const approved = visible.filter((e) => e.status === "approved");
  const rejected = visible.filter((e) => e.status === "rejected");
  const withEntry = new Set(visible.map((e) => e.user_id));
  const missing =
    date <= today ? (managed.data?.people ?? []).filter((p) => !withEntry.has(p.id)) : [];
  const loading = day.isLoading || managed.isLoading || kpis.isLoading;

  const setValue = (entry: string, kpi: string, value: number) =>
    setEdits((s) => ({ ...s, [entry]: { ...s[entry], [kpi]: value } }));

  async function approve(e: ApprovalEntry) {
    const values = changedValues(e, edits);
    try {
      await review.mutateAsync({ entry: e.id, approve: true, ...(values ? { values } : {}) });
      toast.success(
        values ? "Aprovado com ajuste. O valor original ficou registrado." : "Registro aprovado.",
      );
    } catch (err) {
      toastError(err);
    }
  }

  async function approveAll() {
    setBulk(true);
    let ok = 0;
    let firstError: unknown = null;
    for (const e of approvable) {
      const values = changedValues(e, edits);
      try {
        await review.mutateAsync({ entry: e.id, approve: true, ...(values ? { values } : {}) });
        ok++;
      } catch (err) {
        firstError ??= err;
      }
    }
    setBulk(false);
    if (ok) toast.success(ok === 1 ? "1 registro aprovado." : `${ok} registros aprovados.`);
    if (firstError)
      toast.error(`Alguns registros não foram aprovados: ${errorMessage(firstError)}`);
  }

  return (
    <div className="fade-up">
      <PageHeader
        crumbs={[
          { label: "Home", to: "/inicio" },
          { label: "Equipes", to: "/equipes" },
          { label: "Aprovações" },
        ]}
        title="Aprovações"
        description="Confira com o relatório do sistema. Só registro aprovado conta em metas, pontos e ranking."
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Dia anterior"
          onClick={() => setDate(addDays(date, -1))}
        >
          <ChevronLeft strokeWidth={1.75} />
        </Button>
        <p
          className="min-w-44 text-center text-sm font-semibold first-letter:uppercase"
          aria-live="polite"
        >
          {formatLongDate(date)}
        </p>
        <Button
          variant="outline"
          size="icon"
          aria-label="Próximo dia"
          onClick={() => setDate(addDays(date, 1))}
          disabled={date >= today}
        >
          <ChevronRight strokeWidth={1.75} />
        </Button>
        {date !== today && (
          <Button variant="ghost" size="sm" onClick={() => setDate(today)}>
            Hoje
          </Button>
        )}
        {(pendingDays.data ?? []).filter((d) => d.date !== date).length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
            <span className="eyebrow">Outros dias com pendência:</span>
            {pendingDays
              .data!.filter((d) => d.date !== date)
              .slice(0, 6)
              .map((d) => (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setDate(d.date)}
                  className="num rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning transition-colors hover:bg-warning/15"
                >
                  {formatShortDate(d.date)} · {d.count}
                </button>
              ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : day.isError ? (
        <p className="py-6 text-sm text-destructive">
          Não foi possível carregar os registros. Tente novamente.
        </p>
      ) : (managed.data?.teams.length ?? 0) === 0 && visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Você ainda não é responsável por nenhuma equipe"
          description="Peça ao administrador para definir você como gerente de uma equipe em Administração › Equipes."
        />
      ) : (
        <div className="space-y-10">
          <Section
            title={`Aguardando aprovação (${pending.length})`}
            action={
              approvable.length > 1 ? (
                <Button size="sm" onClick={() => setBulkConfirm(true)} disabled={bulk}>
                  {bulk ? <Loader2 className="animate-spin" /> : <CheckCheck strokeWidth={1.75} />}{" "}
                  Aprovar todos ({approvable.length})
                </Button>
              ) : undefined
            }
          >
            {pending.length === 0 ? (
              <EmptyState compact icon={Check} title="Nada aguardando neste dia" />
            ) : (
              <ul className="divide-y divide-border">
                {pending.map((e) => {
                  const p = people.get(e.user_id);
                  const team = teamOf(p?.team_id);
                  const own = !canReview(e);
                  const changed = !!changedValues(e, edits);
                  return (
                    <li key={e.id} className="py-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <UserAvatar
                          name={p?.full_name ?? "?"}
                          url={p?.avatar_url}
                          className="size-9"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {p?.full_name || p?.matricula || "Pessoa"}
                            {e.user_id === me.id ? " (você)" : ""}
                          </p>
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {team && (
                              <span
                                className="size-2 rounded-full"
                                style={{ backgroundColor: team.color }}
                                aria-hidden
                              />
                            )}
                            {team ? `${team.name} · ` : ""}enviado às {formatTimeSP(e.submitted_at)}
                          </p>
                        </div>
                        {own ? (
                          <p className="text-xs text-muted-foreground">
                            Seu registro precisa ser aprovado por outro gestor.
                          </p>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRejecting(e)}
                              disabled={review.isPending}
                            >
                              <X strokeWidth={1.75} /> Recusar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => approve(e)}
                              disabled={review.isPending}
                            >
                              <Check strokeWidth={1.75} />{" "}
                              {changed ? "Aprovar com ajuste" : "Aprovar"}
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {kpis.data.map((k) => {
                          const v = e.daily_entry_values.find((x) => x.kpi_id === k.id);
                          const current = edits[e.id]?.[k.id] ?? v?.value ?? 0;
                          const edited = v !== undefined && current !== v.value;
                          const inputId = `v-${e.id}-${k.id}`;
                          return (
                            <div key={k.id}>
                              <Label htmlFor={inputId} className="eyebrow">
                                {k.name}
                              </Label>
                              <input
                                id={inputId}
                                type="number"
                                inputMode="numeric"
                                min={0}
                                disabled={own}
                                value={current}
                                onFocus={(ev) => ev.target.select()}
                                onChange={(ev) =>
                                  setValue(
                                    e.id,
                                    k.id,
                                    Math.max(
                                      0,
                                      Math.min(100000, Math.floor(Number(ev.target.value) || 0)),
                                    ),
                                  )
                                }
                                className={`num mt-1 h-9 w-full rounded-lg border bg-surface px-3 text-sm font-semibold outline-none transition-colors focus-visible:border-primary disabled:opacity-60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none ${
                                  edited ? "border-warning" : "border-input"
                                }`}
                              />
                              {edited && (
                                <p className="num mt-0.5 text-[11px] text-warning">
                                  enviado: {v.value}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          {missing.length > 0 && (
            <Section title={`Ainda não registraram (${missing.length})`}>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 py-1">
                {missing.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <UserAvatar name={p.full_name} url={p.avatar_url} className="size-6" />
                    <span>{p.full_name || p.matricula}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {rejected.length > 0 && (
            <Section
              title={`Recusados (${rejected.length})`}
              description="Voltam para a fila quando a pessoa corrigir e reenviar."
            >
              <ul className="divide-y divide-border">
                {rejected.map((e) => {
                  const p = people.get(e.user_id);
                  return (
                    <li key={e.id} className="flex items-center gap-3 py-3 text-sm">
                      <UserAvatar
                        name={p?.full_name ?? "?"}
                        url={p?.avatar_url}
                        className="size-7"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {p?.full_name || "Pessoa"}
                        </span>
                        <span className="block truncate text-xs text-destructive">
                          Motivo: {e.review_note}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {approved.length > 0 && (
            <Section title={`Aprovados (${approved.length})`}>
              <ul className="divide-y divide-border">
                {approved.map((e) => {
                  const p = people.get(e.user_id);
                  const adjusted = e.daily_entry_values.some(
                    (v) => v.original_value !== null && v.original_value !== v.value,
                  );
                  return (
                    <li key={e.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                      <UserAvatar
                        name={p?.full_name ?? "?"}
                        url={p?.avatar_url}
                        className="size-7"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {p?.full_name || "Pessoa"}
                        </span>
                        <span className="num block text-xs text-muted-foreground">
                          {kpis.data
                            .map(
                              (k) =>
                                `${k.name} ${e.daily_entry_values.find((v) => v.kpi_id === k.id)?.value ?? 0}`,
                            )
                            .join(" · ")}
                          {adjusted ? " · ajustado na aprovação" : ""}
                        </span>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReopening(e)}
                        disabled={reopen.isPending}
                      >
                        <RotateCcw strokeWidth={1.75} /> Reabrir
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}
        </div>
      )}

      <RejectDialog
        entry={rejecting}
        name={rejecting ? (people.get(rejecting.user_id)?.full_name ?? "") : ""}
        onClose={() => setRejecting(null)}
        onConfirm={async (note) => {
          if (!rejecting) return;
          try {
            await review.mutateAsync({ entry: rejecting.id, approve: false, note });
            toast.success("Registro recusado. A pessoa foi avisada do motivo.");
            setRejecting(null);
          } catch (err) {
            toastError(err);
          }
        }}
        busy={review.isPending}
      />
      <ConfirmDialog
        open={bulkConfirm}
        onOpenChange={setBulkConfirm}
        title={`Aprovar ${approvable.length} registros?`}
        description="Os valores vão para metas, pontos e ranking. Ajustes que você digitou nos campos serão aplicados."
        confirmLabel="Aprovar todos"
        onConfirm={approveAll}
      />
      <ConfirmDialog
        open={!!reopening}
        onOpenChange={(o) => !o && setReopening(null)}
        title="Reabrir registro aprovado?"
        description="Os pontos desse dia são estornados e o registro volta para a fila de aprovação."
        confirmLabel="Reabrir"
        onConfirm={() =>
          reopening &&
          reopen.mutate(reopening.id, {
            onSuccess: () => toast.success("Registro reaberto. Pontos estornados."),
            onError: toastError,
          })
        }
      />
    </div>
  );
}

function RejectDialog({
  entry,
  name,
  onClose,
  onConfirm,
  busy,
}: {
  entry: ApprovalEntry | null;
  name: string;
  onClose: () => void;
  onConfirm: (note: string) => void;
  busy: boolean;
}) {
  const [note, setNote] = useState("");
  return (
    <Dialog
      open={!!entry}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setNote("");
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (note.trim()) onConfirm(note.trim());
          }}
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle>Recusar registro{name ? ` de ${name.split(" ")[0]}` : ""}</DialogTitle>
            <DialogDescription>A pessoa vê o motivo, corrige e envia de novo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reject-note">Motivo</Label>
            <Textarea
              id="reject-note"
              rows={3}
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex.: o relatório mostra 3 cadastros, não 6"
              maxLength={300}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={busy || !note.trim()}>
              {busy && <Loader2 className="animate-spin" />} Recusar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
