import { useEffect, useState } from "react";
import { Loader2, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { toastError } from "@/lib/errors";
import { useKpiDefinitions } from "@/modules/kpi/hooks";
import { EmptyState } from "@/modules/shell/EmptyState";
import { Section } from "@/modules/shell/PageHeader";
import {
  useAdminUsers,
  useDeleteKpiGoal,
  useKpiGoals,
  useSaveKpiGoal,
  useSaveSettings,
  useSettings,
  useTeams,
  useUpdateKpi,
} from "./hooks";

const int = (v: string, max: number) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));

export function KpiTab() {
  return (
    <div className="space-y-10">
      <Definitions />
      <SpecificGoals />
      <General />
    </div>
  );
}

function Definitions() {
  const kpis = useKpiDefinitions(false);
  return (
    <Section
      title="Indicadores"
      description="Meta diária padrão e quantos pontos vale cada unidade aprovada."
    >
      {kpis.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <ul className="divide-y divide-border">
          {kpis.data.map((k) => (
            <KpiRow key={k.id} kpi={k} />
          ))}
        </ul>
      )}
    </Section>
  );
}

function KpiRow({ kpi }: { kpi: ReturnType<typeof useKpiDefinitions>["data"][number] }) {
  const update = useUpdateKpi();
  const [goal, setGoal] = useState(kpi.default_daily_goal);
  const [points, setPoints] = useState(kpi.points_per_unit);
  const [description, setDescription] = useState(kpi.description ?? "");
  const [active, setActive] = useState(kpi.is_active);
  useEffect(() => {
    setGoal(kpi.default_daily_goal);
    setPoints(kpi.points_per_unit);
    setDescription(kpi.description ?? "");
    setActive(kpi.is_active);
  }, [kpi]);
  const dirty =
    goal !== kpi.default_daily_goal ||
    points !== kpi.points_per_unit ||
    description !== (kpi.description ?? "") ||
    active !== kpi.is_active;

  return (
    <li
      className={`grid items-end gap-3 py-4 sm:grid-cols-[8rem_1fr_6rem_6rem_auto_auto] ${active ? "" : "opacity-70"}`}
    >
      <p className="self-center text-sm font-semibold">{kpi.name}</p>
      <div className="space-y-1">
        <Label htmlFor={`kd-${kpi.id}`} className="eyebrow">
          Descrição
        </Label>
        <Input
          id={`kd-${kpi.id}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={120}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`kg-${kpi.id}`} className="eyebrow">
          Meta diária
        </Label>
        <Input
          id={`kg-${kpi.id}`}
          type="number"
          min={0}
          inputMode="numeric"
          className="num"
          value={goal}
          onChange={(e) => setGoal(int(e.target.value, 100000))}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`kp-${kpi.id}`} className="eyebrow">
          Pts / unidade
        </Label>
        <Input
          id={`kp-${kpi.id}`}
          type="number"
          min={0}
          inputMode="numeric"
          className="num"
          value={points}
          onChange={(e) => setPoints(int(e.target.value, 1000))}
        />
      </div>
      <div className="flex h-9 items-center gap-2">
        <Switch id={`ka-${kpi.id}`} checked={active} onCheckedChange={setActive} />
        <Label htmlFor={`ka-${kpi.id}`} className="text-xs">
          Ativo
        </Label>
      </div>
      <Button
        size="sm"
        variant={dirty ? "default" : "outline"}
        className="h-9"
        disabled={!dirty || update.isPending}
        onClick={() =>
          update.mutate(
            {
              id: kpi.id,
              description: description.trim() || null,
              default_daily_goal: goal,
              points_per_unit: points,
              is_active: active,
            },
            { onSuccess: () => toast.success(`${kpi.name} atualizado.`), onError: toastError },
          )
        }
      >
        {update.isPending && <Loader2 className="animate-spin" />} Salvar
      </Button>
    </li>
  );
}

function SpecificGoals() {
  const kpis = useKpiDefinitions();
  const teams = useTeams();
  const users = useAdminUsers();
  const goals = useKpiGoals();
  const save = useSaveKpiGoal();
  const del = useDeleteKpiGoal();
  const [scope, setScope] = useState<"team" | "user">("team");
  const [target, setTarget] = useState("");
  const [kpi, setKpi] = useState("");
  const [value, setValue] = useState(0);
  const people = (users.data ?? []).filter((u) => u.is_active);
  const options =
    scope === "team"
      ? (teams.data ?? []).map((t) => ({ id: t.id, label: t.name }))
      : people.map((u) => ({ id: u.id, label: u.full_name || u.matricula }));
  const labelOf = (g: { scope: string; team_id: string | null; user_id: string | null }) =>
    g.scope === "team"
      ? `Equipe ${teams.data?.find((t) => t.id === g.team_id)?.name ?? "—"}`
      : (users.data?.find((u) => u.id === g.user_id)?.full_name ?? "Pessoa");

  return (
    <Section
      title="Metas específicas"
      description="Quando uma equipe ou pessoa precisa de meta diferente da padrão. Vale a mais específica: pessoa, depois equipe, depois padrão."
    >
      <form
        className="grid items-end gap-3 py-3 sm:grid-cols-[8rem_1fr_9rem_6rem_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!target || !kpi) {
            toast.error("Escolha para quem e qual indicador.");
            return;
          }
          save.mutate(
            { scope, target, kpi_id: kpi, daily_goal: value },
            { onSuccess: () => toast.success("Meta salva."), onError: toastError },
          );
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="sg-scope" className="eyebrow">
            Para
          </Label>
          <Select
            value={scope}
            onValueChange={(v) => {
              setScope(v as typeof scope);
              setTarget("");
            }}
          >
            <SelectTrigger id="sg-scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="team">Equipe</SelectItem>
              <SelectItem value="user">Pessoa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="sg-target" className="eyebrow">
            {scope === "team" ? "Qual equipe" : "Qual pessoa"}
          </Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger id="sg-target">
              <SelectValue placeholder="Escolha" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="sg-kpi" className="eyebrow">
            Indicador
          </Label>
          <Select value={kpi} onValueChange={setKpi}>
            <SelectTrigger id="sg-kpi">
              <SelectValue placeholder="Escolha" />
            </SelectTrigger>
            <SelectContent>
              {kpis.data.map((k) => (
                <SelectItem key={k.id} value={k.id}>
                  {k.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="sg-value" className="eyebrow">
            Meta diária
          </Label>
          <Input
            id="sg-value"
            type="number"
            min={0}
            inputMode="numeric"
            className="num"
            value={value}
            onChange={(e) => setValue(int(e.target.value, 100000))}
          />
        </div>
        <Button type="submit" size="sm" className="h-9" disabled={save.isPending}>
          {save.isPending ? <Loader2 className="animate-spin" /> : <Plus strokeWidth={1.75} />}{" "}
          Definir
        </Button>
      </form>

      {goals.isLoading ? (
        <Skeleton className="h-12 w-full" />
      ) : (goals.data ?? []).length === 0 ? (
        <EmptyState compact icon={Target} title="Todos seguem a meta padrão" />
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {goals.data!.map((g) => (
            <li key={g.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{labelOf(g)}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {kpis.data.find((k) => k.id === g.kpi_id)?.name ?? "Indicador inativo"}
                </span>
              </span>
              <span className="num font-semibold">{g.daily_goal} / dia</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                aria-label="Remover meta específica"
                onClick={() =>
                  del.mutate(g.id, {
                    onSuccess: () => toast.success("Meta removida. Volta a valer a padrão."),
                    onError: toastError,
                  })
                }
              >
                <Trash2 strokeWidth={1.75} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function General() {
  const settings = useSettings();
  const save = useSaveSettings();
  const [name, setName] = useState("");
  const [bonus, setBonus] = useState(0);
  useEffect(() => {
    if (!settings.data) return;
    setName(settings.data.workspace_name);
    setBonus(settings.data.daily_goal_bonus);
  }, [settings.data]);
  const dirty =
    !!settings.data &&
    (name.trim() !== settings.data.workspace_name || bonus !== settings.data.daily_goal_bonus);

  return (
    <Section
      title="Geral"
      description="Nome do workspace e bônus de quem bate todas as metas do dia."
    >
      {settings.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <form
          className="grid items-end gap-3 py-3 sm:grid-cols-[1fr_10rem_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length < 2) {
              toast.error("Dê um nome ao workspace.");
              return;
            }
            save.mutate(
              { workspace_name: name.trim(), daily_goal_bonus: bonus },
              { onSuccess: () => toast.success("Configurações salvas."), onError: toastError },
            );
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="g-name" className="eyebrow">
              Nome do workspace
            </Label>
            <Input
              id="g-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="g-bonus" className="eyebrow">
              Bônus diário (pts)
            </Label>
            <Input
              id="g-bonus"
              type="number"
              min={0}
              inputMode="numeric"
              className="num"
              value={bonus}
              onChange={(e) => setBonus(int(e.target.value, 1000))}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="h-9"
            variant={dirty ? "default" : "outline"}
            disabled={!dirty || save.isPending}
          >
            {save.isPending && <Loader2 className="animate-spin" />} Salvar
          </Button>
        </form>
      )}
    </Section>
  );
}
