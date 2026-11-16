import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "gerente" | "colaborador";

export interface Me {
  id: string;
  full_name: string;
  matricula: string;
  team_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
  role: AppRole;
  isAdmin: boolean;
  isManager: boolean;
}

export const meQuery = queryOptions({
  queryKey: ["me"],
  staleTime: 60_000,
  queryFn: async (): Promise<Me | null> => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const [{ data: profile, error }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", u.user.id),
    ]);
    if (error) throw error;
    if (!profile) return null;
    const list = (roles ?? []).map((r) => r.role as AppRole);
    const role: AppRole = list.includes("admin") ? "admin" : list.includes("gerente") ? "gerente" : "colaborador";
    return {
      ...profile,
      role,
      isAdmin: role === "admin",
      isManager: role === "admin" || role === "gerente",
    };
  },
});

export function useMe() {
  const q = useQuery(meQuery);
  return q.data ?? null;
}

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  colaborador: "Colaborador",
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
