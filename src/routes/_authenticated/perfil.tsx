import { createFileRoute } from "@tanstack/react-router";

import { ProfilePage } from "@/modules/profile/ProfilePage";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — Norte" },
      { name: "description", content: "Nome, foto e senha." },
    ],
  }),

  component: ProfilePage,
});
