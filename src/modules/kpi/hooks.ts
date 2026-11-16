import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, todaySP } from "@/lib/dates";

export interface KpiProgressRow {
  kpi_id: string;
  key: string;
  name: string;
  unit: string;
  sort_order: number;
  total: number;
  daily_goal: number;
  goal: number;
}

export const kpiDefinitionsQuery = queryOptions({
  queryKey: ["kpi-definitions"],
  staleTime: 5 * 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.from("kpi_definitions").select("*").order("sort_order");
    if (error) throw error;
    return data;
  },
});

export function useKpiDefinitions(activeOnly = true) {
  const q = useQuery(kpiDefinitionsQuery);
  return { ...q, data: (q.data ?? []).filter((k) => !activeOnly || k.is_active) };
}

export function useKpiProgress(userId: string | undefined, start: string, end: string) {
  return useQuery({
    queryKey: ["kpi-progress", userId, start, end],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("kpi_progress", { _user: userId!, _start: start, _end: end });
      if (error) throw error;
      return (data ?? []) as KpiProgressRow[];
    },
  });
}

export function useKpiSeries(userId: string | undefined, days = 14) {
  const end = todaySP();
  const start = addDays(end, -(days - 1));
  return useQuery({
    queryKey: ["kpi-series", userId, start, end],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("kpi_series", { _user: userId!, _start: start, _end: end });
      if (error) throw error;
      const dates = Array.from({ length: days }, (_, i) => addDays(start, i));
      const byKpi = new Map<string, number[]>();
      for (const row of data ?? []) {
        const arr = byKpi.get(row.kpi_id) ?? new Array(days).fill(0);
        const idx = dates.indexOf(row.entry_date);
        if (idx >= 0) arr[idx] = row.value;
        byKpi.set(row.kpi_id, arr);
      }
      return { dates, byKpi };
    },
  });
}

export function useMyEntry(userId: string | undefined, date: string) {
  return useQuery({
    queryKey: ["my-entry", userId, date],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_entries")
        .select("id, status, review_note, entry_date, daily_entry_values(kpi_id, value)")
        .eq("user_id", userId!)
        .eq("entry_date", date)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSubmitEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, values }: { date: string; values: Record<string, number> }) => {
      const { error } = await supabase.rpc("submit_daily_entry", { _date: date, _values: values });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-entry"] });
      qc.invalidateQueries({ queryKey: ["day-summary"] });
      qc.invalidateQueries({ queryKey: ["approvals"] });
    },
  });
}
