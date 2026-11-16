import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/modules/auth/useMe";
import { AppShell } from "@/modules/shell/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (!me || !me.is_active) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth", search: { inativo: "1" } as never });
    }
  },
  component: AppShell,
});
