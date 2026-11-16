import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Norte — workspace da loja" },
      { name: "description", content: "Indicadores, tarefas e aprovações da equipe em um só lugar." },
      { property: "og:title", content: "Norte — workspace da loja" },
      { property: "og:description", content: "Indicadores, tarefas e aprovações da equipe em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/inicio" });
  },
});
