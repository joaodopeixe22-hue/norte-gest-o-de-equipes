import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { AppRole } from "@/modules/auth/useMe";

export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type KpiGoal = Database["public"]["Tables"]["kpi_goals"]["Row"];

export interface AdminUser {
  id: string;
  full_name: string;
  matricula: string;
  team_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
  role: AppRole;
}

const rank = (roles: AppRole[]): AppRole =>
  roles.includes("admin") ? "admin" : roles.includes("gerente") ? "gerente" : "colaborador";

/** Todos os usuários com o papel de cada um. Só o admin enxerga tudo (RLS). */
export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: async (): Promise<AdminUser[]> => {
      const [profiles, roles] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, matricula, team_id, avatar_url, is_active")
          .order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profiles.error) throw profiles.error;
      if (roles.error) throw roles.error;
      const byUser = new Map<string, AppRole[]>();
      for (const r of roles.data ?? [])
        byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role as AppRole]);
      return (profiles.data ?? []).map((p) => ({ ...p, role: rank(byUser.get(p.id) ?? []) }));
    },
  });
}

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Depois de mexer em pessoas, equipes ou metas, quase tudo no app pode ter mudado. */
export function useInvalidateAdmin() {
  const qc = useQueryClient();
  return () => {
    for (const key of [
      "admin",
      "teams",
      "managed-teams",
      "teams-managed",
      "assignable",
      "ranking",
      "me",
      "kpi-progress",
      "kpi-definitions",
      "settings",
    ]) {
      qc.invalidateQueries({ queryKey: [key] });
    }
  };
}

export function useSaveTeam() {
  const inv = useInvalidateAdmin();
  return useMutation({
    mutationFn: async (v: {
      id?: string;
      name: string;
      color: string;
      manager_id: string | null;
    }) => {
      const { id, ...values } = v;
      const { error } = id
        ? await supabase.from("teams").update(values).eq("id", id)
        : await supabase.from("teams").insert(values);
      if (error) throw error;
    },
    onSuccess: inv,
  });
}

export function useDeleteTeam() {
  const inv = useInvalidateAdmin();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("teams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: inv,
  });
}

export function useUpdateKpi() {
  const inv = useInvalidateAdmin();
  return useMutation({
    mutationFn: async (v: {
      id: string;
      description: string | null;
      default_daily_goal: number;
      points_per_unit: number;
      is_active: boolean;
    }) => {
      const { id, ...values } = v;
      const { error } = await supabase.from("kpi_definitions").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: inv,
  });
}

export function useKpiGoals() {
  return useQuery({
    queryKey: ["admin", "kpi-goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpi_goals")
        .select("*")
        .neq("scope", "global")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveKpiGoal() {
  const inv = useInvalidateAdmin();
  return useMutation({
    mutationFn: async (v: {
      kpi_id: string;
      scope: "team" | "user";
      target: string;
      daily_goal: number;
    }) => {
      const row: Database["public"]["Tables"]["kpi_goals"]["Insert"] = {
        kpi_id: v.kpi_id,
        scope: v.scope,
        daily_goal: v.daily_goal,
        team_id: v.scope === "team" ? v.target : null,
        user_id: v.scope === "user" ? v.target : null,
      };
      // Uma meta por indicador e alvo: se já existe, atualiza o valor.
      let find = supabase
        .from("kpi_goals")
        .select("id")
        .eq("kpi_id", v.kpi_id)
        .eq("scope", v.scope);
      find = v.scope === "team" ? find.eq("team_id", v.target) : find.eq("user_id", v.target);
      const { data: existing, error: fErr } = await find.maybeSingle();
      if (fErr) throw fErr;
      const { error } = existing
        ? await supabase
            .from("kpi_goals")
            .update({ daily_goal: v.daily_goal })
            .eq("id", existing.id)
        : await supabase.from("kpi_goals").insert(row);
      if (error) throw error;
    },
    onSuccess: inv,
  });
}

export function useDeleteKpiGoal() {
  const inv = useInvalidateAdmin();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kpi_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: inv,
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveSettings() {
  const inv = useInvalidateAdmin();
  return useMutation({
    mutationFn: async (v: { workspace_name: string; daily_goal_bonus: number }) => {
      const { error } = await supabase
        .from("app_settings")
        .update({ ...v, updated_at: new Date().toISOString() })
        .eq("id", true);
      if (error) throw error;
    },
    onSuccess: inv,
  });
}
