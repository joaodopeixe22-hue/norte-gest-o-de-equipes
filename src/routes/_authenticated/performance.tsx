import { createFileRoute } from "@tanstack/react-router";

import { PerformancePage } from "@/modules/performance/PerformancePage";

export const Route = createFileRoute("/_authenticated/performance")({
  head: () => ({
    meta: [
      { title: "Performance — Norte" },
      {
        name: "description",
        content: "Evolução dos indicadores, pontos, ranking e histórico de registros.",
      },
    ],
  }),

  component: PerformancePage,
});
