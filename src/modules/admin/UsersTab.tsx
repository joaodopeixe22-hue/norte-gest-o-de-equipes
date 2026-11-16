import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  KeyRound,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  UserCheck,
  UserX,
  Users,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toastError } from "@/lib/errors";
import { matriculaSchema, passwordSchema } from "@/modules/auth/matricula";
import { ROLE_LABEL, useMe, type AppRole } from "@/modules/auth/useMe";
import { ConfirmDialog } from "@/modules/shell/ConfirmDialog";
import { EmptyState } from "@/modules/shell/EmptyState";
import { Field } from "@/modules/shell/Field";
import { Section } from "@/modules/shell/PageHeader";
import { UserAvatar } from "@/modules/shell/UserAvatar";
import {
  adminCreateUser,
  adminResetPassword,
  adminSetActive,
  adminUpdateUser,
} from "./admin.functions";
import { useAdminUsers, useInvalidateAdmin, useTeams, type AdminUser } from "./hooks";

const NO_TEAM = "sem-equipe";
const ROLES: AppRole[] = ["colaborador", "gerente", "admin"];

export function UsersTab() {
  const me = useMe()!;
  const users = useAdminUsers();
  const teams = useTeams();
  const inv = useInvalidateAdmin();
  const setActive = useServerFn(adminSetActive);
  const [editing, setEditing] = useState<AdminUser | "new" | null>(null);
  const [resetting, setResetting] = useState<AdminUser | null>(null);
  const [toggling, setToggling] = useState<AdminUser | null>(null);
  const [query, setQuery] = useState("");
  const teamName = (id: string | null) => teams.data?.find((t) => t.id === id)?.name;
  const q = query.trim().toLowerCase();
  const list = (users.data ?? []).filter(
    (u) => !q || u.full_name.toLowerCase().includes(q) || u.matricula.toLowerCase().includes(q),
  );

  async function toggle(u: AdminUser) {
    try {
      await setActive({ data: { user_id: u.id, active: !u.is_active } });
      toast.success(u.is_active ? "Acesso desativado." : "Acesso reativado.");
      inv();
    } catch (err) {
      toastError(err);
    }
  }

  return (
    <Section
      title="Usuários"
      description="Cada pessoa entra com matrícula e senha. Não existe cadastro público."
      action={
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus strokeWidth={1.75} /> Novo usuário
        </Button>
      }
    >
      {(users.data?.length ?? 0) > 6 && (
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou matrícula"
          aria-label="Buscar usuário"
          className="mb-2 max-w-xs"
        />
      )}
      {users.isLoading ? (
        <div className="space-y-2 py-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : users.isError ? (
        <p className="py-6 text-sm text-destructive">Não foi possível carregar os usuários.</p>
      ) : list.length === 0 ? (
        <EmptyState compact icon={Users} title={q ? "Ninguém encontrado" : "Nenhum usuário"} />
      ) : (
        <ul className="divide-y divide-border">
          {list.map((u) => (
            <li
              key={u.id}
              className={`flex items-center gap-3 py-3 ${u.is_active ? "" : "opacity-60"}`}
            >
              <UserAvatar name={u.full_name || u.matricula} url={u.avatar_url} className="size-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {u.full_name || "Sem nome"}
                  {u.id === me.id ? " (você)" : ""}
                </p>
                <p className="num truncate text-xs text-muted-foreground">
                  Matrícula {u.matricula} · {teamName(u.team_id) ?? "Sem equipe"}
                </p>
              </div>
              {!u.is_active && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  Inativo
                </span>
              )}
              <span
                className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline ${
                  u.role === "colaborador"
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary-soft text-primary"
                }`}
              >
                {ROLE_LABEL[u.role]}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Ações de ${u.full_name || u.matricula}`}
                  >
                    <MoreHorizontal strokeWidth={1.75} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditing(u)}>
                    <Pencil strokeWidth={1.75} /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setResetting(u)}>
                    <KeyRound strokeWidth={1.75} /> Redefinir senha
                  </DropdownMenuItem>
                  {u.id !== me.id && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => (u.is_active ? setToggling(u) : toggle(u))}>
                        {u.is_active ? (
                          <UserX strokeWidth={1.75} />
                        ) : (
                          <UserCheck strokeWidth={1.75} />
                        )}
                        {u.is_active ? "Desativar acesso" : "Reativar acesso"}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <UserDialog
        open={editing !== null}
        user={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
      />
      <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />
      <ConfirmDialog
        open={!!toggling}
        onOpenChange={(o) => !o && setToggling(null)}
        title={`Desativar ${toggling?.full_name || "usuário"}?`}
        description="A pessoa não consegue mais entrar. O histórico e os pontos dela são mantidos, e você pode reativar depois."
        confirmLabel="Desativar"
        destructive
        onConfirm={() => toggling && toggle(toggling)}
      />
    </Section>
  );
}

function UserDialog({
  open,
  user,
  onClose,
}: {
  open: boolean;
  user: AdminUser | null;
  onClose: () => void;
}) {
  const me = useMe()!;
  const teams = useTeams();
  const inv = useInvalidateAdmin();
  const create = useServerFn(adminCreateUser);
  const update = useServerFn(adminUpdateUser);
  const [role, setRole] = useState<AppRole>("colaborador");
  const [team, setTeam] = useState(NO_TEAM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setRole(user?.role ?? "colaborador");
    setTeam(user?.team_id ?? NO_TEAM);
  }, [open, user]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const full_name = String(fd.get("full_name") ?? "").trim();
    const errs: Record<string, string> = {};
    if (full_name.length < 2) errs["full_name"] = "Informe o nome.";
    const team_id = team === NO_TEAM ? null : team;
    let matricula = "";
    let password = "";
    if (!user) {
      const m = matriculaSchema.safeParse(fd.get("matricula"));
      const p = passwordSchema.safeParse(fd.get("password"));
      if (!m.success) errs["matricula"] = m.error.issues[0]?.message ?? "Matrícula inválida.";
      else matricula = m.data;
      if (!p.success) errs["password"] = p.error.issues[0]?.message ?? "Senha inválida.";
      else password = p.data;
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      if (user) await update({ data: { user_id: user.id, full_name, role, team_id } });
      else await create({ data: { full_name, matricula, password, role, team_id } });
      toast.success(
        user
          ? "Usuário atualizado."
          : "Usuário criado. Passe a matrícula e a senha inicial para a pessoa.",
      );
      inv();
      onClose();
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  const self = user?.id === me.id;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>{user ? "Editar usuário" : "Novo usuário"}</DialogTitle>
            <DialogDescription>
              {user
                ? `Matrícula ${user.matricula}. A matrícula não muda.`
                : "A pessoa entra com a matrícula e a senha inicial que você definir aqui."}
            </DialogDescription>
          </DialogHeader>
          <Field id="u-name" label="Nome completo" error={errors["full_name"]}>
            <Input
              id="u-name"
              name="full_name"
              defaultValue={user?.full_name ?? ""}
              autoComplete="off"
              autoFocus
            />
          </Field>
          {!user && (
            <div className="grid grid-cols-2 gap-3">
              <Field id="u-mat" label="Matrícula" error={errors["matricula"]}>
                <Input id="u-mat" name="matricula" autoComplete="off" />
              </Field>
              <Field
                id="u-pass"
                label="Senha inicial"
                error={errors["password"]}
                hint="Mínimo de 8 caracteres."
              >
                <Input id="u-pass" name="password" type="text" autoComplete="off" />
              </Field>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field
              id="u-role"
              label="Papel"
              hint={self ? "Você não pode mudar o próprio papel." : undefined}
            >
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)} disabled={self}>
                <SelectTrigger id="u-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="u-team" label="Equipe">
              <Select value={team} onValueChange={setTeam}>
                <SelectTrigger id="u-team">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TEAM}>Sem equipe</SelectItem>
                  {(teams.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} {user ? "Salvar" : "Criar usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const reset = useServerFn(adminResetPassword);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const p = passwordSchema.safeParse(new FormData(e.currentTarget).get("password"));
    if (!p.success) {
      setError(p.error.issues[0]?.message ?? "Senha inválida.");
      return;
    }
    setError(undefined);
    setBusy(true);
    try {
      await reset({ data: { user_id: user.id, password: p.data } });
      toast.success("Senha redefinida. Passe a nova senha para a pessoa.");
      onClose();
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={!!user}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setError(undefined);
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>
              {user?.full_name || "A pessoa"} passa a entrar com a senha nova. Ela pode trocar
              depois em Meu perfil.
            </DialogDescription>
          </DialogHeader>
          <Field id="r-pass" label="Nova senha" error={error} hint="Mínimo de 8 caracteres.">
            <Input id="r-pass" name="password" type="text" autoComplete="off" autoFocus />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Redefinir
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
