# Norte

Workspace de alta performance para equipes de loja. Centraliza o dia do colaborador: indicadores, tarefas, agenda, formulários e notas. A Home é o centro de comando.

Projeto independente (não depende do app Gincana Farma). Interface em português do Brasil, fuso America/Sao_Paulo.

## Módulos

| Módulo | Estado | O que faz |
|---|---|---|
| **Home** | pronto | Saudação e data, visão do dia, indicadores (dia/semana/mês) com mini-histórico, minha rotina (tarefas, compromissos, avisos), ranking da equipe, acesso rápido, `Ctrl+K` |
| **Performance** | pronto | Metas por indicador, gráfico de evolução (30 dias), pódio e ranking, ranking de equipes, histórico de registros, extrato de pontos |
| **Agenda e tarefas** | pronto (lista) | Tarefas com filtros, prioridade e categoria; gerente atribui para a equipe; compromissos dos próximos 14 dias. Calendário mês/semana/dia: próxima etapa |
| **Equipes** | pronto | Equipes que o gerente responde, status do registro de hoje por pessoa, **fila de aprovação**, avisos da equipe |
| **Administração** | pronto | Usuários (criar, editar papel/equipe, redefinir senha, desativar), equipes, indicadores e metas, avisos, nome do workspace e bônus diário |
| **Meu perfil** | pronto | Nome, foto e troca da própria senha |
| **Formulários** | próxima etapa | Construtor estilo Tally, resposta uma pergunta por vez, gestão de respostas |
| **Meu Workspace** | próxima etapa | Páginas e subpáginas estilo Notion, editor rico, busca e favoritos |
| Conquistas | próxima etapa | Marcos de constância e metas batidas |

## No celular

- Barra inferior com Home, Agenda, **Registrar** (botão central), Evolução (ou Equipes, para quem gerencia, com contador de pendências) e Mais.
- Janelas abrem de baixo para cima, com botões na largura da tela; campos e botões têm pelo menos 44 px de altura.
- Dá para instalar: no navegador do celular, "Adicionar à tela de início". Abre em tela cheia, com ícone próprio.

## Primeiro acesso

1. Abra o app. Enquanto não existir administrador, a tela de login mostra **Configurar o Norte**: informe nome, matrícula e senha. Essa tela deixa de existir depois do primeiro administrador — faça isso assim que publicar.
2. Em **Administração › Equipes**, crie as equipes.
3. Em **Administração › Usuários**, crie as pessoas (matrícula + senha inicial, papel e equipe).
4. Volte em **Equipes** e defina o **gerente responsável** de cada uma (precisa ter papel Gerente ou Administrador).
5. Revise as metas em **Indicadores e metas**.

Cada pessoa entra com matrícula e senha e pode trocar a senha em **Meu perfil**. Quem esquecer pede ao administrador para redefinir.

## Regras do produto

- **Registro com aprovação.** O colaborador envia os indicadores do dia e o registro fica *aguardando aprovação*. O gerente da equipe (ou o administrador) aprova, aprova com ajuste (o valor enviado fica guardado) ou recusa com motivo. Só registro aprovado conta em metas, pontos e ranking. Ninguém aprova o próprio registro, exceto o administrador.
- **Livro de pontos** (`points_ledger`). Cada ponto é uma linha com origem e data, gravada só pelo servidor. Aprovar gera `valor × pontos por unidade` e um bônus quando todas as metas do dia foram batidas. Reabrir um registro gera estorno; nada é apagado.
- **Metas.** Vale a mais específica: pessoa, depois equipe, depois o padrão do indicador. Meta de semana/mês = meta diária × dias esperados no período (dias corridos menos domingos).
- **Sem dados fictícios.** Toda tela lê do banco; módulo sem registro mostra estado vazio com o próximo passo.

## Decisões técnicas

- **Stack**: TanStack Start (React 19, roteamento por arquivos em `src/routes`), Tailwind 4, shadcn/ui, TanStack Query, Lovable Cloud (Supabase: Auth, Postgres com RLS, Storage).
- **Server functions no lugar de edge functions.** Operações que precisam da service role (primeiro administrador e gestão de usuários) ficam em `*.functions.ts` e rodam só no servidor. Toda função confere no banco se quem chamou é administrador ativo; a interface não é barreira de segurança.
- **Login por matrícula.** O Auth usa um e-mail sintético `<matricula>@norte.app`. Cadastro público desligado.
- **Papéis** em `user_roles` (enum `app_role`), nunca em `profiles`. Checagem por `has_role()`/`manages_user()` (SECURITY DEFINER) nas policies.
- **Transições por RPC.** `submit_daily_entry`, `review_daily_entry` e `reopen_daily_entry` são as únicas portas para mudar status de registro e gravar pontos; o cliente não tem permissão de escrita nessas tabelas.
- **Desativar usuário** bane a conta no Auth (bloqueia login e renovação de sessão) além de marcar `is_active = false`. O sistema nunca fica sem administrador ativo.
- **Banco**: mudanças de esquema são feitas pelo Lovable (não editar `drizzle/` nem `supabase/migrations/` à mão).

### Ajustes de banco pendentes (pedir ao Lovable)

- `tasks.created_by` é `NOT NULL` com `ON DELETE SET NULL`: trocar para `ON DELETE CASCADE`.
- Em tarefa criada por outra pessoa, o responsável só deveria poder alterar `status` (hoje a policy deixa editar os demais campos).
- `REVOKE EXECUTE ... FROM public, anon` nas funções auxiliares (`has_role`, `manages_user`, `manages_team`, `my_team_id`, `daily_goal_for`, `expected_days`, `sp_today`).

## Estrutura

```
src/
  routes/                 rotas (arquivo = página); _authenticated/ exige login
  modules/
    auth/                 sessão, papéis, primeiro acesso
    shell/                menu lateral, cabeçalhos, Ctrl+K, estados vazios, diálogos
    home/  kpi/           Home e registro de indicadores
    performance/          evolução, ranking, histórico, extrato
    tasks/  agenda/       tarefas e compromissos
    team/                 equipes, fila de aprovação, avisos
    admin/                usuários, equipes, indicadores (server functions em admin.functions.ts)
    profile/              meu perfil
  lib/dates.ts            regra única de datas no fuso de São Paulo
drizzle/                  esquema e migrations (gerenciado pelo Lovable)
```

## Desenvolvimento

```sh
bun install
bun run dev
bun run build
bun run test
npx tsc --noEmit
```
