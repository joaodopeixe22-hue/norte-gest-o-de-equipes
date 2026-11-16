import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/modules/auth/guards";
import { ApprovalsPage } from "@/modules/team/ApprovalsPage";

export const Route = createFileRoute("/_authenticated/equipes/aprovacoes")({
  head: () => ({
    meta: [
      { title: "Aprovações — Norte" },
      { name: "description", content: "Registros de indicadores aguardando aprovação." },
    ],
  }),
  beforeLoad: ({ context }) => requireRole(context.queryClient, "manager"),
  component: ApprovalsPage,
});
