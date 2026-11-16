import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/modules/auth/guards";
import { TeamsPage } from "@/modules/team/TeamsPage";

export const Route = createFileRoute("/_authenticated/equipes/")({
  head: () => ({
    meta: [
      { title: "Equipes — Norte" },
      { name: "description", content: "Equipes que você gerencia." },
    ],
  }),
  beforeLoad: ({ context }) => requireRole(context.queryClient, "manager"),
  component: TeamsPage,
});
