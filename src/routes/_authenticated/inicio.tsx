import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "@/modules/home/HomePage";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({
    meta: [
      { title: "Home — Norte" },
      {
        name: "description",
        content: "Seu dia em uma tela: indicadores, tarefas, compromissos e equipe.",
      },
    ],
  }),

  component: HomePage,
});
