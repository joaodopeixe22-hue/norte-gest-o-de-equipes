import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/modules/shell/PageHeader";
import { AnnouncementsManager } from "@/modules/team/AnnouncementsManager";
import { useTeams } from "./hooks";
import { KpiTab } from "./KpiTab";
import { TeamsTab } from "./TeamsTab";
import { UsersTab } from "./UsersTab";

export function AdminPage() {
  const teams = useTeams();
  return (
    <div className="fade-up">
      <PageHeader
        crumbs={[{ label: "Home", to: "/inicio" }, { label: "Administração" }]}
        title="Administração"
        description="Pessoas, equipes, indicadores e avisos. Comece criando as equipes e depois os usuários."
      />
      <Tabs defaultValue="usuarios">
        <TabsList className="mb-8 flex h-auto w-full justify-start overflow-x-auto md:inline-flex md:w-auto">
          <TabsTrigger className="shrink-0 max-md:py-2" value="usuarios">
            Usuários
          </TabsTrigger>
          <TabsTrigger className="shrink-0 max-md:py-2" value="equipes">
            Equipes
          </TabsTrigger>
          <TabsTrigger className="shrink-0 max-md:py-2" value="indicadores">
            Indicadores e metas
          </TabsTrigger>
          <TabsTrigger className="shrink-0 max-md:py-2" value="avisos">
            Avisos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="usuarios">
          <UsersTab />
        </TabsContent>
        <TabsContent value="equipes">
          <TeamsTab />
        </TabsContent>
        <TabsContent value="indicadores">
          <KpiTab />
        </TabsContent>
        <TabsContent value="avisos">
          <AnnouncementsManager teams={teams.data ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
