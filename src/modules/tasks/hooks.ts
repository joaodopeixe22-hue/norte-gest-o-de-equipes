import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { addDays, spDayBounds, startOfWeek, todaySP } from "@/lib/dates";
import { useMe } from "@/modules/auth/useMe";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskFilter = "hoje" | "semana" | "atrasadas" | "todas" | "concluidas";

export const PRIORITY_LABEL = { baixa: "Baixa", media: "Média", alta: "Alta" } as const;

export function isOverdue(t: Pick<Task, "status" | "due_date">, today = todaySP()) {
  return t.status === "aberta" && !!t.due_date && t.due_date < today;
}

export function useTasks(filter: TaskFilter, scope: "mine" | "created" = "mine") {
  const me = useMe();
  return useQuery({
    queryKey: ["tasks", me?.id, filter, scope],
    enabled: !!me,
    queryFn: async () => {
      const today = todaySP();
      let q = supabase
        .from("tasks")
        .select("*, assignee:profiles!tasks_assigned_to_fkey(full_name)")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(200);
      q = scope === "mine" ? q.eq("assigned_to", me!.id) : q.eq("created_by", me!.id).neq("assigned_to", me!.id);
      if (filter === "hoje") q = q.eq("status", "aberta").lte("due_date", today);
      if (filter === "semana") q = q.eq("status", "aberta").gte("due_date", startOfWeek(today)).lte("due_date", addDays(startOfWeek(today), 6));
      if (filter === "atrasadas") q = q.eq("status", "aberta").lt("due_date", today);
      if (filter === "todas") q = q.eq("status", "aberta");
      if (filter === "concluidas") q = q.eq("status", "concluida").order("completed_at", { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

/** Today's tasks for the Home: open & due ≤ today, plus those completed today. */
export function useTodayTasks() {
  const me = useMe();
  return useQuery({
    queryKey: ["tasks", me?.id, "home"],
    enabled: !!me,
    queryFn: async () => {
      const today = todaySP();
      const { from } = spDayBounds(today);
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", me!.id)
        .or(`and(status.eq.aberta,due_date.lte.${today}),and(status.eq.concluida,completed_at.gte.${from})`)
        .order("status")
        .order("due_date")
        .limit(30);
      if (error) throw error;
      return data;
    },
  });
}

function useInvalidateTasks() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["day-summary"] });
  };
}

export function useToggleTask() {
  const inv = useInvalidateTasks();
  return useMutation({
    mutationFn: async (t: Pick<Task, "id" | "status">) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: t.status === "aberta" ? "concluida" : "aberta" })
        .eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: inv,
  });
}

export function useSaveTask() {
  const inv = useInvalidateTasks();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: TaskInsert }) => {
      const { error } = id
        ? await supabase.from("tasks").update(values).eq("id", id)
        : await supabase.from("tasks").insert(values);
      if (error) throw error;
    },
    onSuccess: inv,
  });
}

export function useDeleteTask() {
  const inv = useInvalidateTasks();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: inv,
  });
}

/** People the current user can assign tasks to. */
export function useAssignable() {
  const me = useMe();
  return useQuery({
    queryKey: ["assignable", me?.id],
    enabled: !!me?.isManager,
    queryFn: async () => {
      const { data: teams } = await supabase.from("teams").select("id, manager_id");
      const managed = new Set((teams ?? []).filter((t) => me!.isAdmin || t.manager_id === me!.id).map((t) => t.id));
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, matricula, team_id, is_active")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data.filter((p) => p.id === me!.id || me!.isAdmin || (p.team_id && managed.has(p.team_id)));
    },
  });
}

export function useEventsBetween(fromDate: string, toDate: string) {
  const me = useMe();
  return useQuery({
    queryKey: ["events", me?.id, fromDate, toDate],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, team:teams(name, color)")
        .gte("starts_at", spDayBounds(fromDate).from)
        .lt("starts_at", spDayBounds(toDate).to)
        .order("starts_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: Database["public"]["Tables"]["events"]["Insert"]) => {
      const { error } = await supabase.from("events").insert(v);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}
