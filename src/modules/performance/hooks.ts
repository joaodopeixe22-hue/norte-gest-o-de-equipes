import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/modules/auth/useMe";

/** Meus registros diários no intervalo, com os valores por indicador. */
export function useMyEntries(start: string, end: string) {
  const me = useMe();
  return useQuery({
    queryKey: ["my-entries", me?.id, start, end],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_entries")
        .select(
          "id, entry_date, status, review_note, daily_entry_values(kpi_id, value, original_value)",
        )
        .eq("user_id", me!.id)
        .gte("entry_date", start)
        .lte("entry_date", end)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Extrato do livro de pontos: toda linha tem origem e data. */
export function useLedger(limit = 40) {
  const me = useMe();
  return useQuery({
    queryKey: ["ledger", me?.id, limit],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("points_ledger")
        .select("id, source_type, points, description, ref_date, created_at")
        .eq("user_id", me!.id)
        .order("ref_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}
