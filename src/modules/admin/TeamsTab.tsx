import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
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
import { toastError } from "@/lib/errors";
import { ConfirmDialog } from "@/modules/shell/ConfirmDialog";
import { EmptyState } from "@/modules/shell/EmptyState";
import { Field } from "@/modules/shell/Field";
import { Section } from "@/modules/shell/PageHeader";
import { useAdminUsers, useDeleteTeam, useSaveTeam, useTeams, type Team } from "./hooks";

const NO_MANAGER = "sem-gerente";
/** Cores de equipe: tons distintos entre si e legíveis sobre fundo claro. */
const COLORS = [
  { value: "#12805C", name: "Verde" },
  { value: "#2A6FB0", name: "Azul" },
  { value: "#B7791F", name: "Âmbar" },
  { value: "#7C4DBA", name: "Violeta" },
  { value: "#C2410C", name: "Terracota" },
  { value: "#0F8B8D", name: "Turquesa" },
  { value: "#B83280", name: "Magenta" },
  { value: "#4B5563", name: "Grafite" },
];

export function TeamsTab() {
  const teams = useTeams();
  const users = useAdminUsers();
  const del = useDeleteTeam();
  const [editing, setEditing] = useState<Team | "new" | null>(null);
  const [deleting, setDeleting] = useState<Team | null>(null);
  const nameOf = (id: string | null) => users.data?.find((u) => u.id === id)?.full_name;
  const countOf = (id: string) =>
    (users.data ?? []).filter((u) => u.team_id === id && u.is_active).length;

  return (
    <Section
      title="Equipes"
      description="O gerente de cada equipe aprova os registros e acompanha as pessoas dela."
      action={
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus strokeWidth={1.75} /> Nova equipe
        </Button>
      }
    >
      {teams.isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : (teams.data ?? []).length === 0 ? (
        <EmptyState
          compact
          icon={Users}
          title="Nenhuma equipe criada"
          description="Crie as equipes e defina um gerente. Depois associe as pessoas na aba Usuários."
        />
      ) : (
        <ul className="divide-y divide-border">
          {teams.data!.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-3">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: t.color }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t.manager_id
                    ? `Gerente: ${nameOf(t.manager_id) ?? "—"}`
                    : "Sem gerente: ninguém aprova os registros desta equipe além do administrador"}{" "}
                  · <span className="num">{countOf(t.id)}</span>{" "}
                  {countOf(t.id) === 1 ? "pessoa" : "pessoas"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 max-md:size-10"
                aria-label={`Editar ${t.name}`}
                onClick={() => setEditing(t)}
              >
                <Pencil strokeWidth={1.75} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 max-md:size-10 text-muted-foreground"
                aria-label={`Excluir ${t.name}`}
                onClick={() => setDeleting(t)}
              >
                <Trash2 strokeWidth={1.75} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <TeamDialog
        open={editing !== null}
        team={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Excluir a equipe ${deleting?.name ?? ""}?`}
        description="As pessoas ficam sem equipe (e sem gerente para aprovar os registros) até você associá-las a outra. Pontos e histórico são mantidos."
        confirmLabel="Excluir equipe"
        destructive
        onConfirm={() =>
          deleting &&
          del.mutate(deleting.id, {
            onSuccess: () => toast.success("Equipe excluída."),
            onError: toastError,
          })
        }
      />
    </Section>
  );
}

function TeamDialog({
  open,
  team,
  onClose,
}: {
  open: boolean;
  team: Team | null;
  onClose: () => void;
}) {
  const users = useAdminUsers();
  const save = useSaveTeam();
  const [color, setColor] = useState(COLORS[0]!.value);
  const [manager, setManager] = useState(NO_MANAGER);
  const [error, setError] = useState<string | undefined>();
  const managers = (users.data ?? []).filter((u) => u.is_active && u.role !== "colaborador");

  useEffect(() => {
    if (!open) return;
    setError(undefined);
    setColor(team?.color ?? COLORS[0]!.value);
    setManager(team?.manager_id ?? NO_MANAGER);
  }, [open, team]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
    if (name.length < 2) {
      setError("Dê um nome à equipe.");
      return;
    }
    try {
      await save.mutateAsync({
        ...(team ? { id: team.id } : {}),
        name,
        color,
        manager_id: manager === NO_MANAGER ? null : manager,
      });
      toast.success(team ? "Equipe atualizada." : "Equipe criada.");
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
            <DialogTitle>{team ? "Editar equipe" : "Nova equipe"}</DialogTitle>
            <DialogDescription>
              Nome, cor de identificação e quem responde por ela.
            </DialogDescription>
          </DialogHeader>
          <Field id="tm-name" label="Nome" error={error}>
            <Input
              id="tm-name"
              name="name"
              defaultValue={team?.name ?? ""}
              maxLength={40}
              autoFocus
            />
          </Field>
          <div className="space-y-1.5">
            <Label id="tm-color-label">Cor</Label>
            <div
              role="radiogroup"
              aria-labelledby="tm-color-label"
              className="flex flex-wrap gap-2"
            >
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={color === c.value}
                  aria-label={c.name}
                  title={c.name}
                  onClick={() => setColor(c.value)}
                  className={`size-8 rounded-full border-2 transition-transform duration-150 ${
                    color === c.value
                      ? "scale-110 border-foreground"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>
          <Field
            id="tm-manager"
            label="Gerente responsável"
            hint={
              managers.length === 0
                ? "Nenhum usuário com papel Gerente ainda. Crie ou edite um na aba Usuários."
                : undefined
            }
          >
            <Select value={manager} onValueChange={setManager}>
              <SelectTrigger id="tm-manager">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_MANAGER}>Sem gerente</SelectItem>
                {managers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.matricula}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="animate-spin" />}{" "}
              {team ? "Salvar" : "Criar equipe"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
