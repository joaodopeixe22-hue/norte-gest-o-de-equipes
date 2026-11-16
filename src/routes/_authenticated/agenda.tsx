import { createFileRoute } from "@tanstack/react-router";

import { AgendaPage } from "@/modules/agenda/AgendaPage";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda e tarefas — Norte" },
      { name: "description", content: "Tarefas e compromissos do dia e da semana." },
    ],
  }),

  component: AgendaPage,
});
