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
        <TabsList className="mb-8 max-w-full overflow-x-auto">
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="equipes">Equipes</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores e metas</TabsTrigger>
          <TabsTrigger value="avisos">Avisos</TabsTrigger>
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
