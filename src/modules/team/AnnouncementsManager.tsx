import { useEffect, useState } from "react";
import { Loader2, Megaphone, Pencil, Pin, Plus, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatShortDate, todaySP } from "@/lib/dates";
import { toastError } from "@/lib/errors";
import { useMe } from "@/modules/auth/useMe";
import { ConfirmDialog } from "@/modules/shell/ConfirmDialog";
import { EmptyState } from "@/modules/shell/EmptyState";
import { Field } from "@/modules/shell/Field";
import { Section } from "@/modules/shell/PageHeader";
import {
  useDeleteAnnouncement,
  useManageableAnnouncements,
  useSaveAnnouncement,
  type Announcement,
  type Team,
} from "./hooks";

const ALL = "todos";

/** Avisos que aparecem na Home. Admin publica para todos ou para uma equipe; gerente, só para as equipes dele. */
export function AnnouncementsManager({ teams }: { teams: Team[] }) {
  const me = useMe()!;
  const list = useManageableAnnouncements();
  const del = useDeleteAnnouncement();
  const [editing, setEditing] = useState<Announcement | "new" | null>(null);
  const [deleting, setDeleting] = useState<Announcement | null>(null);
  const canCreate = me.isAdmin || teams.length > 0;
  const now = new Date().toISOString();
  const teamIds = new Set(teams.map((t) => t.id));
  const mine = (list.data ?? []).filter(
    (a) => me.isAdmin || (a.team_id !== null && teamIds.has(a.team_id)),
  );

  return (
    <Section
      title="Avisos"
      description="Aparecem na Home de quem recebe."
      action={
        canCreate ? (
          <Button size="sm" variant="soft" onClick={() => setEditing("new")}>
            <Plus strokeWidth={1.75} /> Novo aviso
          </Button>
        ) : undefined
      }
    >
      {list.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : mine.length === 0 ? (
        <EmptyState
          compact
          icon={Megaphone}
          title="Nenhum aviso publicado"
          description="Use avisos para mudanças de rotina, campanhas e lembretes importantes."
        />
      ) : (
        <ul className="divide-y divide-border">
          {mine.map((a) => {
            const team = teams.find((t) => t.id === a.team_id);
            const expired = a.expires_at !== null && a.expires_at <= now;
            return (
              <li
                key={a.id}
                className={`flex items-start gap-3 py-3 ${expired ? "opacity-60" : ""}`}
              >
                {a.pinned ? (
                  <Pin
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    strokeWidth={1.75}
                    aria-label="Fixado"
                  />
                ) : (
                  <Megaphone
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{a.title}</p>
                  {a.body && <p className="text-xs text-muted-foreground">{a.body}</p>}
                  <p className="eyebrow mt-0.5">
                    {a.team_id ? `Equipe ${team?.name ?? "—"}` : "Todos"}
                    {a.expires_at
                      ? ` · ${expired ? "expirou" : "até"} ${formatShortDate(todaySP(new Date(a.expires_at)))}`
                      : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={`Editar "${a.title}"`}
                  onClick={() => setEditing(a)}
                >
                  <Pencil strokeWidth={1.75} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground"
                  aria-label={`Excluir "${a.title}"`}
                  onClick={() => setDeleting(a)}
                >
                  <Trash2 strokeWidth={1.75} />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <AnnouncementDialog
        open={editing !== null}
        announcement={editing === "new" ? null : editing}
        teams={teams}
        allowAll={me.isAdmin}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir aviso?"
        description={deleting ? `"${deleting.title}" some da Home de todos.` : undefined}
        confirmLabel="Excluir"
        destructive
        onConfirm={() =>
          deleting &&
          del.mutate(deleting.id, {
            onSuccess: () => toast.success("Aviso excluído."),
            onError: toastError,
          })
        }
      />
    </Section>
  );
}

function AnnouncementDialog({
  open,
  announcement,
  teams,
  allowAll,
  onClose,
}: {
  open: boolean;
  announcement: Announcement | null;
  teams: Team[];
  allowAll: boolean;
  onClose: () => void;
}) {
  const save = useSaveAnnouncement();
  const [target, setTarget] = useState(ALL);
  const [pinned, setPinned] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const firstTeam = teams[0]?.id;

  useEffect(() => {
    if (!open) return;
    setError(undefined);
    setPinned(announcement?.pinned ?? false);
    setTarget(announcement?.team_id ?? (allowAll ? ALL : (firstTeam ?? ALL)));
  }, [open, announcement, allowAll, firstTeam]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    const body = String(fd.get("body") ?? "").trim();
    const until = String(fd.get("until") ?? "");
    if (title.length < 3) {
      setError("Dê um título ao aviso.");
      return;
    }
    try {
      await save.mutateAsync({
        ...(announcement ? { id: announcement.id } : {}),
        title,
        body,
        team_id: target === ALL ? null : target,
        pinned,
        // Vale até o fim do dia escolhido, no horário de São Paulo.
        expires_at: until ? `${until}T23:59:59-03:00` : null,
      });
      toast.success(announcement ? "Aviso atualizado." : "Aviso publicado.");
      onClose();
    } catch (err) {
      toastError(err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>{announcement ? "Editar aviso" : "Novo aviso"}</DialogTitle>
            <DialogDescription>Curto e direto: o que muda e a partir de quando.</DialogDescription>
          </DialogHeader>
          <Field id="a-title" label="Título" error={error}>
            <Input
              id="a-title"
              name="title"
              defaultValue={announcement?.title ?? ""}
              maxLength={120}
              autoFocus
            />
          </Field>
          <Field id="a-body" label="Detalhes (opcional)">
            <Textarea
              id="a-body"
              name="body"
              rows={3}
              defaultValue={announcement?.body ?? ""}
              maxLength={600}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="a-target" label="Para">
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger id="a-target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowAll && <SelectItem value={ALL}>Todos</SelectItem>}
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      Equipe {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="a-until" label="Válido até (opcional)">
              <Input
                id="a-until"
                name="until"
                type="date"
                min={todaySP()}
                defaultValue={
                  announcement?.expires_at ? todaySP(new Date(announcement.expires_at)) : ""
                }
              />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="a-pinned" checked={pinned} onCheckedChange={setPinned} />
            <Label htmlFor="a-pinned">Fixar no topo</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="animate-spin" />}{" "}
              {announcement ? "Salvar" : "Publicar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
