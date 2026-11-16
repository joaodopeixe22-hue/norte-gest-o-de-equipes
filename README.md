# Norte | Gestão de Equipes

Crie um projeto NOVO e independente chamado **Norte** — um workspace de alta performance para equipes de loja (farmácia): organiza o dia do colaborador, registra indicadores, tarefas, formulários e notas. Interface 100% em português do Brasil. Fuso: America/Sao_Paulo. Use Lovable Cloud (Supabase): Auth, Postgres com RLS, Storage e Edge Functions. Nada de dados fictícios: toda tela lê do banco e tem estado vazio bem desenhado.

O produto completo terá 7 módulos (Home, Performance, Formulários, Meu Workspace, Agenda e tarefas, Equipes, Administração). Vamos construir em etapas. **NESTA ETAPA construa: fundação + Home + registro de indicadores + tarefas básicas + fila de aprovação do gerente.** Os demais módulos já devem existir na navegação com uma página própria e um estado vazio honesto ("Em construção nesta etapa: …"), sem números inventados.

## 1. Identidade visual (design system)
Minimalista, jovial e profissional. Referências: Linear (navegação e densidade), Notion (calma e tipografia), Apple (hierarquia e refinamento).
- Tema claro. Fundo off-white `#FAFAF7`, superfícies brancas, texto `#16201B`, cinzas levemente esverdeados (nunca cinza puro).
- Cor principal: verde moderno `#12805C` (hover `#0E6B4C`), verde suave para fundos de destaque `#E7F4EC`. Âmbar `#B7791F` só para "atenção/pendente", vermelho discreto `#C2410C` só para erro/atraso.
- Tipografia: "Plus Jakarta Sans" (Google Fonts) em tudo; números com `tabular-nums`. Títulos com peso 600–700, sem caixa alta gritante.
- Bordas 1px suaves, raio 12px, sombras quase imperceptíveis. Sem gradientes chamativos, sem emojis como ícones (use lucide-react, traço 1.75).
- Poucos cards: prefira seções com título, linhas divisórias e listas. Card só quando o bloco é realmente um objeto separado.
- Microinterações discretas (150–200ms): hover, foco visível, progresso animando ao carregar. Respeite `prefers-reduced-motion`.
- Defina todos os tokens em `index.css` (HSL) + `tailwind.config.ts` e use somente tokens semânticos nos componentes.

## 2. Estrutura e navegação
- Sidebar à esquerda, recolhível (ícones apenas), estado lembrado. Itens: Home, Performance, Formulários, Meu Workspace, Agenda e tarefas, Equipes (gerente/admin), Administração (admin). Item ativo destacado; rodapé da sidebar com avatar, nome, papel e "Sair".
- Topo de cada página: breadcrumb + título + ações da página.
- Mobile (<768px): sidebar vira menu deslizante (sheet) aberto por um botão no topo; conteúdo em coluna única.
- Atalho `Ctrl/⌘+K`: paleta de comandos com navegação e ações rápidas (Registrar indicadores, Nova tarefa, Nova anotação, Abrir formulários, Abrir calendário).

## 3. Autenticação e papéis (RBAC verificado no backend)
- Login por **matrícula + senha** (internamente e-mail sintético `<matricula>@norte.app`). Cadastro público DESLIGADO.
- Papéis: `admin`, `gerente`, `colaborador`, em tabela separada `user_roles (user_id, role)` com enum `app_role`. NUNCA guardar papel em `profiles`. Função `has_role(uid, role)` SECURITY DEFINER com `search_path` fixo, usada nas policies.
- `profiles`: id (= auth.users.id), full_name, matricula (única), team_id, avatar_url, is_active. O usuário só edita o próprio nome/avatar; team_id, matrícula e is_active só o admin altera (garantir por trigger ou policy com colunas restritas).
- `teams`: id, name, color, manager_id (gerente responsável). Função `manages_user(manager, target)`: verdadeiro se o alvo pertence a uma equipe cujo manager_id é o gerente. Admin gerencia todos.
- **Primeiro acesso**: se não existir nenhum admin, a tela de login mostra "Configurar o Norte" (nome, matrícula, senha) que chama a edge function `bootstrap-admin`; ela só funciona enquanto não houver admin e depois passa a recusar sempre.
- Edge function `admin-users` (valida o JWT e exige admin): criar usuário (nome, matrícula, senha inicial, papel, equipe), redefinir senha, ativar/desativar. A service role key fica só na edge function.
- Usuário inativo não entra. Usuário logado pode trocar a própria senha.

## 4. Banco de dados desta etapa (todas as tabelas com RLS ligada; sem acesso anônimo)
- `app_settings` (linha única): nome do workspace, bônus por meta diária batida (padrão 10).
- `kpi_definitions`: key, name, description, unit, points_per_unit (padrão 1), default_daily_goal, sort_order, is_active. **Semeie apenas a configuração** dos 4 indicadores: OFEX, APOIO, SORRIA, CADASTRO (metas diárias padrão 6, 4, 3, 5 — editáveis pelo admin). Isso é configuração, não resultado.
- `kpi_goals`: meta por indicador com escopo (`global` | `team` | `user`) e alvo diário; vale a mais específica. Meta semanal/mensal = meta diária × dias com registro esperado no período (dias corridos menos domingos, simples e documentado).
- `daily_entries`: user_id, entry_date, status (`pending` | `approved` | `rejected`), submitted_at, reviewed_by, reviewed_at, review_note; único por (user_id, entry_date). `daily_entry_values`: entry_id, kpi_id, value (inteiro ≥ 0), original_value (o que a pessoa enviou, se o gerente ajustou).
  - Regra central: o colaborador **envia** o registro do dia e ele fica **aguardando aprovação**. O gerente da equipe (ou admin) aprova, aprova com ajuste, ou recusa com motivo. Só registro aprovado conta em metas, pontos e ranking. Recusado pode ser corrigido e reenviado. Ninguém aprova o próprio registro (admin pode).
  - Colaborador não escreve `status`, `reviewed_*` nem em registro já aprovado: faça as transições por funções RPC SECURITY DEFINER (`submit_daily_entry`, `review_daily_entry`) e bloqueie UPDATE direto dessas colunas.
- `points_ledger`: user_id, source_type (`kpi` | `goal_bonus` | `achievement` | `adjustment`), source_id, points, description, ref_date. **Somente o servidor grava** (dentro das RPCs/triggers); ninguém faz INSERT/UPDATE/DELETE pelo cliente. Aprovar gera pontos (valor × points_per_unit, + bônus se bateu todas as metas do dia); recusar/reabrir gera estorno, nunca apaga linha.
- `tasks`: title, description, due_date, due_time, priority (`baixa` | `media` | `alta`), category, status (`aberta` | `concluida`), assigned_to, created_by, team_id, completed_at. Colaborador cria e conclui as próprias; gerente cria para pessoas da sua equipe; admin para todos.
- `events` (compromissos): title, starts_at, ends_at, all_day, owner_id, team_id (nulo = pessoal).
- `announcements` (avisos): title, body, team_id (nulo = todos), pinned, expires_at, created_by — gerente/admin criam.
- `notifications`: user_id, title, body, link, read_at — criadas pelo servidor (ex.: "registro aprovado", "registro recusado: motivo", "nova tarefa atribuída").
- RPCs de leitura agregada: `my_day_summary(date)`, `kpi_progress(user, start, end)` e `ranking(period_start, period_end)` (individual e por equipe, somando o `points_ledger`), para a Home não precisar ler linhas de outras pessoas.
- Visibilidade: colaborador vê os próprios registros/tarefas/notificações e o ranking agregado; gerente vê os da(s) sua(s) equipe(s); admin vê tudo.

## 5. HOME — centro de comando (a tela mais importante)
Tudo que a pessoa precisa para conduzir o dia, em uma tela calma e escaneável:
1. **Cabeçalho**: saudação conforme o horário ("Bom dia, Gustavo"), dia da semana e data por extenso, avatar, sino de notificações (com contador de não lidas e lista), acesso ao perfil.
2. **Visão do dia** (faixa de números, sem cards pesados): % da meta diária concluída, pontos acumulados no mês, posição no ranking, tarefas pendentes hoje, tarefas concluídas hoje. Se o registro de hoje estiver pendente/recusado, mostrar o status com clareza (recusado mostra o motivo e botão "Corrigir").
3. **Indicadores**: OFEX, APOIO, SORRIA, CADASTRO — cada um com resultado, meta, barra de progresso e variação vs. período anterior; alternador Dia / Semana / Mês; mini-histórico (sparkline dos últimos 14 dias) feito com dados reais. Botão principal **"Registrar indicadores"** abre um diálogo rápido (um campo numérico grande por indicador, com − e +), envia para aprovação.
4. **Minha rotina**: tarefas de hoje (marcar concluída ali mesmo, atrasadas destacadas), compromissos de hoje, formulários aguardando resposta (vazio por enquanto), avisos importantes.
5. **Equipe**: top 5 do ranking individual da semana (com a minha posição destacada) e ranking de equipes; evolução semanal da minha equipe.
6. **Acesso rápido**: Criar anotação, Registrar indicadores, Criar tarefa, Formulários, Calendário.
Para gerente/admin, a Home mostra também um bloco "Aguardando você": quantos registros pendentes de aprovação, com link direto.
Estados vazios com orientação do próximo passo (ex.: "Você ainda não registrou hoje").

## 6. Fila de aprovação (dentro de Equipes › Aprovações)
Lista por dia dos registros pendentes da equipe: pessoa, valores por indicador (editáveis para "aprovar com ajuste"), Aprovar, Recusar (motivo obrigatório, em diálogo próprio — não use `window.confirm/prompt`), "Aprovar todos". Mostra também quem ainda não registrou.

## 7. Agenda e tarefas (básico nesta etapa)
Lista de tarefas com filtros (hoje, semana, atrasadas, concluídas), criar/editar/concluir, prioridade e categoria; criar compromisso simples. O calendário completo vem depois.

## 8. Administração (básico nesta etapa)
Usuários (criar, editar papel/equipe, redefinir senha, desativar), Equipes (criar, cor, gerente), Indicadores (metas padrão e pontos por unidade).

## Qualidade
- React Query para dados, tratamento de erro com toasts em português, loading com skeletons, formulários validados com zod.
- Acessibilidade: foco visível, labels, contraste AA, navegação por teclado.
- Código organizado por módulo (`src/modules/<modulo>`), hooks de dados separados dos componentes.
- Ao final, descreva em `README.md` as decisões técnicas tomadas e como fazer o primeiro acesso.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8e705db8-c469-4b55-a099-ec0f70a2b565).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
