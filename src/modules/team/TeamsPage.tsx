import { Link } from "@tanstack/react-router";
import { ArrowRight, Inbox, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { addDays, startOfWeek, todaySP } from "@/lib/dates";
import { useMe } from "@/modules/auth/useMe";
import { useRanking } from "@/modules/home/hooks";
import { EmptyState } from "@/modules/shell/EmptyState";
import { PageHeader, Section } from "@/modules/shell/PageHeader";
import { UserAvatar } from "@/modules/shell/UserAvatar";
import { AnnouncementsManager } from "./AnnouncementsManager";
import { useEntriesOfDay, useManagedTeams, usePendingDays } from "./hooks";

const STATUS = {
  approved: { label: "Aprovado", cls: "bg-primary-soft text-primary" },
  pending: { label: "Aguardando", cls: "bg-warning-soft text-warning" },
  rejected: { label: "Recusado", cls: "bg-destructive-soft text-destructive" },
  none: { label: "Não registrou", cls: "bg-muted text-muted-foreground" },
} as const;

export function TeamsPage() {
  const me = useMe()!;
  const today = todaySP();
  const ws = startOfWeek(today);
  const managed = useManagedTeams();
  const day = useEntriesOfDay(today);
  const pendingDays = usePendingDays();
  const week = useRanking(ws, addDays(ws, 6));
  const pendingTotal = (pendingDays.data ?? []).reduce((a, d) => a + d.count, 0);
  const statusOf = (userId: string) =>
    day.data?.entries.find((e) => e.user_id === userId)?.status ?? "none";
  const pointsOf = (userId: string) =>
    week.data?.individual.find((p) => p.user_id === userId)?.points ?? 0;

  return (
    <div className="fade-up">
      <PageHeader
        crumbs={[{ label: "Home", to: "/inicio" }, { label: "Equipes" }]}
        title="Equipes"
        description={
          me.isAdmin ? "Todas as equipes da loja." : "As equipes sob sua responsabilidade."
        }
        actions={
          <Button asChild variant={pendingTotal > 0 ? "default" : "outline"}>
            <Link to="/equipes/aprovacoes">
              <Inbox strokeWidth={1.75} /> Aprovações
              {pendingTotal > 0 && (
                <span className="num rounded-full bg-primary-foreground/20 px-1.5 text-xs">
                  {pendingTotal}
                </span>
              )}
            </Link>
          </Button>
        }
      />

      {managed.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : managed.isError ? (
        <p className="py-6 text-sm text-destructive">
          Não foi possível carregar as equipes. Tente novamente.
        </p>
      ) : (managed.data?.teams.length ?? 0) === 0 ? (
        <EmptyState
          icon={Users}
          title={
            me.isAdmin ? "Nenhuma equipe criada" : "Você ainda não é responsável por nenhuma equipe"
          }
          description={
            me.isAdmin
              ? "Crie as equipes e defina o gerente de cada uma em Administração."
              : "Peça ao administrador para definir você como gerente de uma equipe."
          }
          action={
            me.isAdmin ? (
              <Button asChild size="sm" variant="soft">
                <Link to="/admin">
                  Abrir Administração <ArrowRight strokeWidth={1.75} />
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
          <div className="space-y-10">
            {managed.data!.teams.map((team) => {
              const members = managed.data!.people.filter((p) => p.team_id === team.id);
              const teamPoints = week.data?.teams.find((t) => t.team_id === team.id)?.points ?? 0;
              return (
                <Section
                  key={team.id}
                  title={team.name}
                  description={`${members.length} ${members.length === 1 ? "pessoa" : "pessoas"} · ${teamPoints} pts na semana`}
                  action={
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: team.color }}
                      aria-hidden
                    />
                  }
                >
                  {members.length === 0 ? (
                    <p className="py-3 text-sm text-muted-foreground">
                      Nenhuma pessoa nesta equipe ainda. O administrador associa as pessoas em
                      Administração › Usuários.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {members.map((p) => {
                        const st = STATUS[statusOf(p.id)];
                        return (
                          <li key={p.id} className="flex items-center gap-3 py-2.5">
                            <UserAvatar name={p.full_name} url={p.avatar_url} className="size-8" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">
                                {p.full_name || p.matricula}
                                {p.id === team.manager_id ? " · gerente" : ""}
                              </span>
                              <span className="num block text-xs text-muted-foreground">
                                {pointsOf(p.id)} pts na semana
                              </span>
                            </span>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}
                              title="Registro de hoje"
                            >
                              {st.label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Section>
              );
            })}
          </div>
          <AnnouncementsManager teams={managed.data!.teams} />
        </div>
      )}
    </div>
  );
}
