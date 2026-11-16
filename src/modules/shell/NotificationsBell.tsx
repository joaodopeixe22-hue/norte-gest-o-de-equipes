import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/modules/auth/useMe";
import { formatRelative } from "@/lib/dates";
import { toastError } from "@/lib/errors";
import { EmptyState } from "./EmptyState";

export function NotificationsBell() {
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["notifications", me?.id],
    enabled: !!me,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });
  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    onError: toastError,
  });
  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };
  const unread = (q.data ?? []).filter((n) => !n.read_at).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Notificações${unread ? `, ${unread} não lidas` : ""}`} className="relative">
          <Bell strokeWidth={1.75} />
          {unread > 0 && (
            <span className="num absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">Notificações</span>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markAll.mutate()}>
              <CheckCheck strokeWidth={1.75} /> Marcar lidas
            </Button>
          )}
        </div>
        {(q.data ?? []).length === 0 ? (
          <EmptyState compact icon={Bell} title="Tudo em dia" description="Avisos de aprovação e tarefas aparecem aqui." />
        ) : (
          <ScrollArea className="max-h-96">
            <ul className="divide-y divide-border">
              {q.data!.map((n) => (
                <li key={n.id}>
                  <button
                    className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted"
                    onClick={() => {
                      markOne(n.id);
                      if (n.link) navigate({ to: n.link });
                    }}
                  >
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-primary"}`}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{n.title}</span>
                      {n.body && <span className="block text-xs text-muted-foreground">{n.body}</span>}
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">{formatRelative(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
