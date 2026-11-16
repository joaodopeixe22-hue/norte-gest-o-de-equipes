import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/modules/auth/useMe";

export interface DaySummary {
  entry: { id: string; status: "pending" | "approved" | "rejected"; review_note: string | null; submitted_at: string } | null;
  tasks_pending: number;
  tasks_done: number;
  month_points: number;
  pending_approvals: number;
}

export interface RankPerson {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  team_id: string | null;
  team_name: string | null;
  team_color: string | null;
  points: number;
  position: number;
}
export interface RankTeam {
  team_id: string;
  name: string;
  color: string;
  points: number;
  members: number;
}

export function useDaySummary(date: string) {
  const me = useMe();
  return useQuery({
    queryKey: ["day-summary", me?.id, date],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_day_summary", { _date: date });
      if (error) throw error;
      return data as unknown as DaySummary;
    },
  });
}

export function useRanking(start: string, end: string) {
  return useQuery({
    queryKey: ["ranking", start, end],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ranking", { _start: start, _end: end });
      if (error) throw error;
      return data as unknown as { individual: RankPerson[]; teams: RankTeam[] };
    },
  });
}

export function useTeamWeekly(teamId: string | null | undefined) {
  return useQuery({
    queryKey: ["team-weekly", teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("team_weekly", { _team: teamId!, _weeks: 8 });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });
}
