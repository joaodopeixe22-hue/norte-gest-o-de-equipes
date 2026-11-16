import { createFileRoute } from "@tanstack/react-router";

import { FormsPage } from "@/modules/shell/ComingSoon";

export const Route = createFileRoute("/_authenticated/formularios")({
  head: () => ({
    meta: [
      { title: "Formulários — Norte" },
      { name: "description", content: "Formulários da equipe." },
    ],
  }),

  component: FormsPage,
});
