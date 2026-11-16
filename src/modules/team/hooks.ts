import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useMe } from "@/modules/auth/useMe";

export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type Announcement = Database["public"]["Tables"]["announcements"]["Row"];
export interface Person {
  id: string;
  full_name: string;
  matricula: string;
  team_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

/** Equipes que eu gerencio (admin: todas) e as pessoas ativas de cada uma. */
export function useManagedTeams() {
  const me = useMe();
  return useQuery({
    queryKey: ["managed-teams", me?.id],
    enabled: !!me?.isManager,
    queryFn: async () => {
      const { data: all, error } = await supabase.from("teams").select("*").order("name");
      if (error) throw error;
      const teams = (all ?? []).filter((t) => me!.isAdmin || t.manager_id === me!.id);
      const ids = teams.map((t) => t.id);
      let people: Person[] = [];
      if (ids.length) {
        const { data, error: pErr } = await supabase
          .from("profiles")
          .select("id, full_name, matricula, team_id, avatar_url, is_active")
          .in("team_id", ids)
          .eq("is_active", true)
          .order("full_name");
        if (pErr) throw pErr;
        people = data ?? [];
      }
      return { teams, people };
    },
  });
}

export interface ApprovalEntry {
  id: string;
  user_id: string;
  entry_date: string;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  reviewed_at: string | null;
  review_note: string | null;
  daily_entry_values: { kpi_id: string; value: number; original_value: number | null }[];
}

/** Registros do dia que eu posso ver (a RLS já limita a mim e a quem eu gerencio). */
export function useEntriesOfDay(date: string) {
  const me = useMe();
  return useQuery({
    queryKey: ["approvals", "day", me?.id, date],
    enabled: !!me?.isManager,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_entries")
        .select(
          "id, user_id, entry_date, status, submitted_at, reviewed_at, review_note, daily_entry_values(kpi_id, value, original_value)",
        )
        .eq("entry_date", date)
        .order("submitted_at");
      if (error) throw error;
      const entries = (data ?? []) as ApprovalEntry[];
      // Nomes de quem enviou e não está em nenhuma equipe minha (ex.: pessoa sem equipe, vista pelo admin).
      const ids = [...new Set(entries.map((e) => e.user_id))];
      let authors: Person[] = [];
      if (ids.length) {
        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select("id, full_name, matricula, team_id, avatar_url, is_active")
          .in("id", ids);
        if (pErr) throw pErr;
        authors = p ?? [];
      }
      return { entries, authors };
    },
  });
}

/** Dias com registros pendentes, para o gestor não precisar procurar. */
export function usePendingDays() {
  const me = useMe();
  return useQuery({
    queryKey: ["approvals", "pending-days", me?.id],
    enabled: !!me?.isManager,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_entries")
        .select("entry_date, user_id")
        .eq("status", "pending")
        .order("entry_date", { ascending: false })
        .limit(500);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const r of data ?? []) {
        // O próprio registro só conta para o admin, que pode aprová-lo.
        if (r.user_id === me!.id && !me!.isAdmin) continue;
        counts.set(r.entry_date, (counts.get(r.entry_date) ?? 0) + 1);
      }
      return [...counts.entries()].map(([date, count]) => ({ date, count }));
    },
  });
}

function useInvalidateApprovals() {
  const qc = useQueryClient();
  return () => {
    for (const key of [
      "approvals",
      "day-summary",
      "ranking",
      "team-weekly",
      "kpi-progress",
      "kpi-series",
      "my-entry",
      "ledger",
      "my-entries",
    ]) {
      qc.invalidateQueries({ queryKey: [key] });
    }
  };
}

export function useReviewEntry() {
  const inv = useInvalidateApprovals();
  return useMutation({
    mutationFn: async (v: {
      entry: string;
      approve: boolean;
      values?: Record<string, number>;
      note?: string;
    }) => {
      const { error } = await supabase.rpc("review_daily_entry", {
        _entry: v.entry,
        _approve: v.approve,
        ...(v.values ? { _values: v.values } : {}),
        ...(v.note ? { _note: v.note } : {}),
      });
      if (error) throw error;
    },
    onSuccess: inv,
  });
}

export function useReopenEntry() {
  const inv = useInvalidateApprovals();
  return useMutation({
    mutationFn: async (entry: string) => {
      const { error } = await supabase.rpc("reopen_daily_entry", { _entry: entry });
      if (error) throw error;
    },
    onSuccess: inv,
  });
}

/** Avisos que eu posso gerenciar: admin vê todos; gerente, os das equipes dele. */
export function useManageableAnnouncements() {
  const me = useMe();
  return useQuery({
    queryKey: ["announcements", "manage", me?.id],
    enabled: !!me?.isManager,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      id?: string;
      title: string;
      body: string;
      team_id: string | null;
      pinned: boolean;
      expires_at: string | null;
    }) => {
      const { id, ...values } = v;
      const { error } = id
        ? await supabase.from("announcements").update(values).eq("id", id)
        : await supabase.from("announcements").insert(values);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}
