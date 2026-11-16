import { createFileRoute } from "@tanstack/react-router";

import { WorkspacePage } from "@/modules/shell/ComingSoon";

export const Route = createFileRoute("/_authenticated/workspace")({
  head: () => ({
    meta: [
      { title: "Meu Workspace — Norte" },
      { name: "description", content: "Suas páginas e anotações." },
    ],
  }),

  component: WorkspacePage,
});
