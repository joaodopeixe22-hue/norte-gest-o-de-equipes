import { ClipboardList, NotebookPen } from "lucide-react";
import { UnderConstruction } from "./EmptyState";
import { PageHeader } from "./PageHeader";

export function FormsPage() {
  return (
    <div className="fade-up">
      <PageHeader
        crumbs={[{ label: "Home", to: "/inicio" }, { label: "Formulários" }]}
        title="Formulários"
        description="Pesquisas, checklists e coletas da equipe, respondidos uma pergunta por vez."
      />
      <UnderConstruction
        icon={ClipboardList}
        items="construtor de formulários, resposta uma pergunta por vez com progresso, e gestão das respostas com exportação"
      />
    </div>
  );
}

export function WorkspacePage() {
  return (
    <div className="fade-up">
      <PageHeader
        crumbs={[{ label: "Home", to: "/inicio" }, { label: "Meu Workspace" }]}
        title="Meu Workspace"
        description="Seu espaço pessoal de páginas e anotações. Privado por padrão."
      />
      <UnderConstruction
        icon={NotebookPen}
        items="páginas e subpáginas, editor de texto com checklists e tabelas, busca, favoritos e salvamento automático"
      />
    </div>
  );
}
