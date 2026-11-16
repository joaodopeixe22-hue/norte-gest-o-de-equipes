import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/modules/auth/guards";
import { AdminPage } from "@/modules/admin/AdminPage";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administração — Norte" },
      { name: "description", content: "Usuários, equipes, indicadores e avisos." },
    ],
  }),
  beforeLoad: ({ context }) => requireRole(context.queryClient, "admin"),
  component: AdminPage,
});
