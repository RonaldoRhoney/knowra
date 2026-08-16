# DECISIONS.md — KnowRa

Registro de decisões arquiteturais e de produto — atualizado a cada decisão relevante, para nunca precisar "lembrar de cabeça" o motivo de uma escolha.

## 2026-08-15 — Repositório próprio, fora do home-root

**Decisão**: KnowRa vive em `github.com/RonaldoRhoney/knowra`, repositório próprio, criado e conectado nesta data.
**Motivo**: o repo git na raiz do `/home/rhoney` pertence de fato ao MeuPet (origin aponta pra `MeuPet.git`) — usar esse repo pro KnowRa misturaria histórico de dois produtos. Mesmo padrão já usado por AmaVida, MontaMovel, VagaLume, VoaRadar.

## 2026-08-15 — Stack: React+Vite+TS+Tailwind no frontend, Node/Express no backend, Supabase como banco+auth

**Decisão**: seguir a stack proposta em [ARCHITECTURE.md](ARCHITECTURE.md) — divergindo do blueprint original em um ponto: usar **Supabase Auth** no lugar de um "Auth Service" customizado com JWT próprio que aparecia no diagrama conceitual (`KnowRa.png`).
**Motivo**: Supabase já é o padrão de fato do ecossistema RhoneyInc (MeuPet, VoaRadar, VagaLume, MenuFlex, hub) e resolve Auth (incluindo Google OAuth) + RLS + API automática sem reimplementar nada — menor custo de desenvolvimento e menor superfície de ataque que um Auth Service próprio.
**Impacto**: a camada "Auth Engine" do blueprint conceitual passa a ser "Supabase Auth" na prática — o restante do diagrama (Knowledge Engine, Game Engine, AI Engine) permanece como serviços do backend próprio.
**Status**: proposto em Fase 0, a confirmar com uso real na Fase 1.

## 2026-08-15 — Login social com Google é obrigatório desde a Fase 1

**Decisão**: login com Google (via Supabase Auth OAuth) entra junto com e-mail/senha desde o início da Fase 1, não como item posterior.
**Motivo**: pedido explícito do Ronaldo — padrão RhoneyInc, consistente com os demais produtos do ecossistema.
**Impacto**: `profiles.avatar_url` já nasce previsto no modelo de dados para aproveitar a foto do Google quando disponível.

## 2026-08-15 — Domínio de produção: `knowra.rhoneyinc.com`

**Decisão**: URL final segue o padrão de subdomínio RhoneyInc, não um domínio genérico Vercel.
**Motivo**: pedido explícito do Ronaldo — mesmo padrão já usado em AmaVida, MenuFlex, VagaLume, VoaRadar (skill `novo-app-no-ar`).
**Impacto**: nenhuma ação imediata (produto ainda não tem deploy) — registrar aqui para não esquecer na hora do primeiro deploy.

## 2026-08-15 — Fase 1: Painel ADM entra desde já, métricas reais chegam depois

**Decisão**: em vez de adiar o Painel ADM inteiro para quando houver dado real (Fase 3/4), a Fase 1 já entrega a base — acesso restrito a `role = 'admin'`, listagem de usuários via RPC `admin_list_profiles()` — com os cards de métrica de perguntas/desafios/XP visíveis como "—, chega na Fase X" em vez de dado fake.
**Motivo**: pedido explícito do Ronaldo. Risco identificado e sinalizado antes de implementar: mostrar "todas as métricas" nesse ponto exigiria mockar dado, o que o próprio `CLAUDE.md`/`ARCHITECTURE.md` proíbe (nunca apresentar dado fictício como real).
**Impacto**: `Admin.tsx` já existe com estrutura de cards de métrica prontos para receber dado real nas Fases 2/3, sem retrabalho de layout.

## 2026-08-15 — RPC com `security definer` no lugar de `service_role` key no client/backend

**Decisão**: a listagem de usuários do Painel ADM usa a função Postgres `admin_list_profiles()` (`security definer`, checa `is_admin(auth.uid())` internamente) chamada via `supabase.rpc()` direto do frontend autenticado — não via `SUPABASE_SERVICE_ROLE_KEY` no backend.
**Motivo**: reduz superfície de ataque — não existe chave `service_role` (que bypassa todo RLS) circulando em nenhum `.env` do projeto na Fase 1. A própria autorização já é garantida pelo Postgres, reforçando o princípio de "nenhuma decisão de permissão fora do banco" (ver [SECURITY.md](SECURITY.md)).
**Impacto**: `backend/.env` fica com `SUPABASE_SERVICE_ROLE_KEY` vazio por enquanto — só será preenchido se uma necessidade real de operação administrativa fora do alcance de RLS/RPC aparecer.

## 2026-08-15 — Deploy da Fase 1 é só o frontend

**Decisão**: `vercel --prod` publicado a partir de `frontend/`, domínio `knowra.rhoneyinc.com` já apontado (pedido explícito do Ronaldo). Backend (`backend/`) não tem deploy ainda.
**Motivo**: login, Home e Painel ADM da Fase 1 falam direto com Supabase (Auth + RPC) — nenhuma feature atual depende do backend Node/Express, que existe só como esqueleto pronto para o AI Engine da Fase 2 (chamadas de IA nunca podem ser client-side, ver [AI_ENGINE.md](AI_ENGINE.md)).
**Impacto**: nenhum — quando a Fase 2 precisar do backend rodando, ele será publicado (Vercel serverless, mesmo padrão usado no MeuPet para o backend de push notifications).

## 2026-08-15 — Login social Google: configurado e validado em produção

**Decisão**: o fluxo `signInWithOAuth({ provider: "google" })` já estava implementado no frontend; a ativação (Google Cloud Console + Supabase Dashboard) foi concluída pelo Ronaldo, guiada passo a passo. Reaproveitado o mesmo projeto Google Cloud do MeuPet (`meupet-501512`) — é o projeto "guarda-chuva" de OAuth da RhoneyInc, não um projeto por produto — com um novo Client ID ("KnowRa Supabase") específico para o redirect do Supabase do KnowRa.
**Motivo**: criação de credenciais OAuth no Google Cloud Console não é acessível via código/CLI, exigiu ação manual no navegador.
**Ajuste necessário**: `Authentication → URL Configuration` no Supabase precisou de Site URL (`https://knowra.rhoneyinc.com`) e Redirect URLs (`http://localhost:5173/**`, `https://knowra.rhoneyinc.com/**`) explícitas — sem isso, o OAuth caía no `localhost:3000` padrão do Supabase (conexão recusada).
**Status**: ✅ validado em produção — login com `rhoneyinc@gmail.com` via Google cria a conta, popula nome/avatar do Google e reconhece admin automaticamente.

## 2026-08-15 — Fase 2: classificação de área via tool use, sem service_role

**Decisão**: o backend chama a Anthropic com `tool_choice` forçado (`responder_e_classificar`) pra obter resposta + classificação de área em formato estruturado, e grava tudo via RPC `registrar_pergunta()` (security definer, mesmo padrão do `admin_list_profiles()` da Fase 1) — o backend nunca usa `service_role`, sempre repassa o token do próprio usuário autenticado.
**Motivo**: structured output evita parsear texto livre pra extrair XP-relevant data no futuro (Fase 3), e mantém a decisão da Fase 1 de nunca ter uma chave que bypassa RLS circulando.
**Impacto**: `registrar_pergunta()` também faz `upsert` de área por `slug` (reaproveita área existente), implementando a regra de "não duplicar nós quase iguais" do `KNOWLEDGE_MODEL.md`.

## 2026-08-15 — Backend deployado como projeto Vercel próprio

**Decisão**: `backend/` publicado como projeto Vercel separado (`knowra-api`, adaptado pra rodar como função serverless via `api/index.ts` + `vercel.json`), não junto do frontend.
**Motivo**: mantém a separação já desenhada em `ARCHITECTURE.md` (frontend e backend como deploys independentes) e evita acoplar o ciclo de deploy de UI ao de API.
**Status**: URL atual é `knowra-api-eta.vercel.app` (sem subdomínio RhoneyInc customizado ainda — API não é acessada diretamente por usuário final, só pelo frontend, então não é prioridade no padrão `novo-app-no-ar`; reavaliar se algum dia precisar de URL pública estável).

## 2026-08-15 — Fase 2 validada em produção

**Decisão/registro**: após o Ronaldo adicionar crédito na conta Anthropic, o fluxo completo foi testado em `knowra.rhoneyinc.com` — pergunta real enviada, resposta da IA e classificação de área ("Apresentação do KnowRa") confirmadas gravadas na tabela `perguntas` via `psql`.
**Status**: ✅ Fase 2 formalmente concluída.

## 2026-08-15 — Atualização Oficial da Foundation: Competitive Mode, Concursos, Ranking

**Contexto**: recebido `KnowRaV0.1/KNOWRA ATUALIZAÇÃO OFICIAL.md`, atualizando o briefing original com duas capacidades estratégicas futuras — Módulo de Concursos Públicos e Sistema de Ranking/Competição — a serem consideradas desde a Foundation, mas **não implementadas agora**.
**Conflito identificado e resolvido com o Ronaldo**: o projeto já estava na Fase 3 (Gamification) em produção — migration de `desafios`/`badges`/`niveis`/XP já aplicada ao banco real, backend/frontend ainda não construídos. O documento novo pede explicitamente para não avançar código e voltar à Fase 0. Opções apresentadas: pausar Fase 3 e atualizar Foundation primeiro / terminar Fase 3 e documentar depois / fazer os dois em paralelo. **Ronaldo escolheu pausar a Fase 3** e atualizar toda a Foundation primeiro, seguindo a atualização oficial à risca.
**Decisão**: os 8 documentos de fundação afetados (`PRODUCT.md`, `GAME_RULES.md`, `KNOWLEDGE_MODEL.md`, `AI_ENGINE.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `SECURITY.md`, `ROADMAP.md`) foram atualizados com as seções exigidas na atualização oficial (§27 do documento). `DECISIONS.md` (este arquivo) registra o pivot. `VISION.md`, `CORE_LOOP.md` e `UX_PRINCIPLES.md` não precisaram de mudança estrutural — o Core Loop é explicitamente mantido ("não deve ser alterado sem justificativa explícita").
**Impacto no código já escrito**: a migration `0004_game.sql` (níveis, badges, desafios, RPCs de XP) continua válida e compatível com a visão nova — não precisou de rollback, só não foi commitada/deployada até esta atualização de documentação ser aprovada. Os endpoints de backend e a UI de desafio da Fase 3, que ainda não tinham sido escritos, ficam pendentes de retomada.
**Status**: Foundation atualizada, aguardando aprovação do Ronaldo pra retomar a Fase 3.

## DEC-001 — Separação entre XP e Rating

**Contexto**: XP representa progressão dentro do KnowRa (Knowledge Mode); Rating representará desempenho competitivo (Competitive Mode, planejado).
**Decisão**: manter os dois sistemas independentes — nunca usar XP como critério de ranking competitivo, nunca misturar as duas métricas no mesmo campo/cálculo.
**Motivo**: evitar que volume de atividade acumulado ao longo do tempo determine diretamente competência competitiva — um usuário com meses de XP acumulado não é necessariamente melhor competidor do que alguém mais recente com poucas tentativas de altíssima precisão. Regra classificada como **obrigatória** na atualização oficial da Foundation.
**Consequência**: quando o Competitive Mode for implementado (Fase 5+), o sistema precisa de mecanismos de cálculo independentes para progressão (XP, já implementado) e competição (Rating, a definir) — ver [GAME_RULES.md](GAME_RULES.md) §Rating e [DATA_MODEL.md](DATA_MODEL.md).

## 2026-08-15 — Painel ADM: demografia e sessão, geolocalização via ip-api.com (free tier)

**Contexto**: pedido do Ronaldo pra Painel ADM mostrar dispositivo, região, país, faixa etária, gênero e frequência de uso, em gráficos.
**Decisão**: dispositivo/país/região vêm de uma tabela nova `sessoes`, populada a cada login via endpoint `/api/sessao` (parse de User-Agent + geolocalização de IP, sem guardar o IP bruto). Faixa etária/gênero são opcionais, coletados via card de consentimento explícito na Home (nunca obrigatório, nunca bloqueia o produto). Ver [DATA_MODEL.md](DATA_MODEL.md) e [SECURITY.md](SECURITY.md) §LGPD.
**Bug encontrado e corrigido**: a primeira versão de `admin_demographics()` tinha uma coluna `dia` ambígua na query de frequência (alias de `generate_series` colidindo com alias da subquery) — corrigido em `0007_fix_admin_demographics.sql`, testado antes e depois da correção via simulação de `auth.uid()` no psql.
**⚠️ Atenção pra reavaliar**: geolocalização usa `ip-api.com`, cujo tier gratuito **proíbe uso comercial** nos termos de serviço. Isso é aceitável enquanto o KnowRa não cobra nada, mas **precisa ser revisto antes de qualquer monetização** (ver conversa sobre modelo freemium) — trocar por um provedor pago/com licença comercial (ex: ipapi.co pago, MaxMind GeoIP2) nesse momento.
**Status**: implementado e testado (RPCs validadas via psql, build limpo, deploy em produção).

## 2026-08-15 — Modal "Complete seu cadastro" pós-login (Nome, Cidade, País, Idade, Gênero)

**Contexto**: pedido do Ronaldo pra alertar o usuário após login com Google a completar o cadastro com Nome, Cidade, Idade (opcional), País e Gênero.
**Decisão**: modal em destaque (não um card discreto) aparece uma vez por sessão de navegador até o usuário efetivamente salvar — só **Nome** é obrigatório pra salvar (já vem preenchido do Google, então na prática nunca bloqueia); Cidade, País, Idade e Gênero continuam 100% opcionais, mantendo a regra de LGPD já estabelecida (nunca obrigar dado sensível). RPC `completar_cadastro()` substitui `atualizar_demografia()`.
**Idade substitui faixa etária**: campo de faixa fixa (`<18`/`18-24`/...) foi removido do schema — agora coleta idade exata (opcional), e o Painel ADM calcula o bucket a partir dela. Mais simples pro usuário preencher e mais útil pro admin (permite média real, não só faixa).
**Cidade/País autodeclarados vs. inferidos**: `profiles.cidade`/`profiles.pais` (o que o usuário digita no cadastro) são conceitualmente diferentes de `sessoes.pais`/`sessoes.regiao` (o que a geolocalização de IP infere a cada login) — os dois convivem no Painel ADM como métricas separadas, não devem ser fundidos num único conceito.
**Status**: implementado, testado via simulação de `auth.uid()` no psql, publicado em produção.

## 2026-08-15 — Confirmação de e-mail desativada (bug real encontrado em produção)

**Contexto**: cadastro por e-mail/senha de um usuário real (`ronaldorhoney@hotmail.com`) falhou com erro genérico na tela. Investigado: a conta foi criada normalmente, mas o envio do e-mail de confirmação bateu no rate limit do serviço de e-mail compartilhado do Supabase (já registrado como risco conhecido desde a Fase 1) — a conta ficou presa em estado não confirmado, sem conseguir logar.
**Correção imediata**: confirmado manualmente via SQL (`auth.users.email_confirmed_at`) pra desbloquear a conta existente.
**Correção definitiva**: `Confirm email` desativado em `Authentication → Sign In / Providers` no Supabase Dashboard — cadastro por e-mail/senha agora concede sessão imediatamente, sem depender do envio de e-mail. Validado via `curl` direto no endpoint de signup (retornou `access_token` na hora).
**Motivo da escolha**: Google OAuth já é a opção recomendada/principal (ver Fase 1) e já vem verificado pelo próprio Google; e-mail/senha é a alternativa secundária. Manter confirmação obrigatória sem SMTP próprio deixaria essa alternativa quebrada a qualquer volume de uso. Configurar SMTP próprio (Resend/SendGrid) fica como melhoria futura se a confirmação de e-mail voltar a ser necessária.
**Status**: ✅ resolvido e validado em produção.

## 2026-08-15 — Três bugs reais encontrados e corrigidos (RLS sem policy + queries sem filtro de usuário)

**Bug 1 — RLS ativo sem nenhuma policy em `niveis`/`badges`/`areas`**: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `GRANT SELECT` sem uma `CREATE POLICY` correspondente resulta em **zero linhas visíveis**, mesmo com o grant certo — RLS nega tudo por padrão até existir uma policy explícita. Efeito visível: barra de XP sempre aparecia 100% cheia mesmo com 0 XP (a lógica caía no fallback `: 100` porque `niveis` vinha sempre vazio), vitrine de badges nunca aparecia, chip de área sumia do histórico. Corrigido em `0010_fix_niveis_badges_rls.sql` e `0011_fix_areas_rls.sql` com policies `using (true)` — são dados de referência/catálogo, não sensíveis por usuário.
**Por que passou despercebido nos testes**: toda validação anterior via `psql` rodava como usuário `postgres` (superusuário, `rolbypassrls=true`), que **ignora RLS inteiramente** — simular `auth.uid()` via `request.jwt.claim.sub` não é suficiente sozinho pra testar RLS de verdade. A partir de agora, testes de leitura direta de tabela devem incluir `SET LOCAL ROLE authenticated;` além do `request.jwt.claim.sub`, não só o segundo.
**Bug 2 — `HistoricoPerguntas`/`BadgesVitrine` sem filtro explícito de usuário**: as policies de `perguntas`/`usuario_badges` são `auth.uid() = usuario_id OR is_admin(auth.uid())` (intencional, pro Painel ADM). Sem um `.eq("usuario_id", ...)` explícito na query do frontend, uma conta admin via essas duas telas via RLS **todas as perguntas/badges de todos os usuários**, misturadas como se fossem próprias — bug real observado em produção (badge duplicada de duas contas diferentes, histórico com perguntas de outra conta). Corrigido adicionando `.eq("usuario_id", session.user.id)` explícito nas duas queries — nunca confiar só na policy quando ela tem uma cláusula `OR is_admin()`.
**Bug 3 — rotas diretas 404 no Vercel**: `/privacidade`, `/termos`, `/perfil` retornavam 404 ao acessar a URL diretamente (só funcionavam navegando pelo React Router dentro do app) — faltava `vercel.json` com rewrite `"/(.*)" → "/index.html"` pro deploy de SPA. Corrigido.
**Lição geral**: RLS com múltiplas condições (`próprio OR admin`) exige disciplina dupla — a policy garante que ninguém vê o que não deveria, mas o código do client também precisa filtrar explicitamente o que quer mostrar como "meu", porque a policy sozinha define o teto de acesso, não a intenção da tela.

## 2026-08-15 — Mensagens de boas-vindas / "sentimos sua falta" (sem e-mail/push)

**Contexto**: pedido do Ronaldo por mensagem de boas-vindas no primeiro acesso, um "alerta" após 72h sem abrir o app, e uma mensagem diferente ("sentimos sua falta") após 7 dias, disparada quando o usuário volta.
**Decisão**: os três casos são resolvidos **sem infraestrutura de e-mail/push** — o backend já sabe o último acesso (via `profiles.ultimo_acesso`, atualizado a cada login) e decide, na hora que o usuário volta a abrir o app, qual mensagem mostrar (`primeiro_acesso` | `ausencia_media` 72h+ | `ausencia_longa` 7d+ | `normal`) via `registrar_sessao()`. Decisão sempre no banco, nunca calculada no client.
**Trade-off explicado ao Ronaldo**: isso cobre exatamente "quando o usuário retornar ao app", mas não envia nada enquanto o app está fechado (não é uma notificação de verdade tipo push/e-mail — se quiser reengajar quem nunca mais voltou, precisa de canal externo, registrado como melhoria futura).
**Coordenação de UI**: no primeiro acesso, a mensagem de boas-vindas e o modal de completar cadastro (`CompletarCadastroModal`) disputariam a tela ao mesmo tempo — resolvido fazendo o modal de cadastro esperar `tipoAcesso !== 'primeiro_acesso'` antes de aparecer.
**Status**: implementado, testado (4 cenários simulados no banco), publicado em produção.

## 2026-08-15 — Modo preview de nível pro admin (só visual, nunca escreve no banco)

**Contexto**: pedido do Ronaldo (admin) pra conseguir ver como o app fica em qualquer nível/fase, sem precisar progredir de verdade.
**Decisão**: `SimuladorNivel` é um seletor visível só pra `role='admin'` na Home, que sobrepõe **localmente no componente React** o `nivel_global`/`xp_total` exibido na barra de progresso — nunca escreve no banco, nunca chama nenhuma RPC de XP. Banner "🔍 MODO PREVIEW" fica sempre visível enquanto ativo, pra nunca ser confundido com progresso real (mesmo princípio de "nunca apresentar dado fictício como real" do `CLAUDE.md`, aplicado aqui como "deixar claríssimo que é fictício quando for").
**Por que não simular no banco**: alterar `profiles.xp_total`/`nivel_global` de verdade (mesmo que temporariamente) violaria a proteção de integridade de XP já estabelecida em `SECURITY.md` — states fictícios nunca devem tocar a fonte de verdade dos dados de progressão.
**Escopo**: cobre nível/XP (o que foi pedido). Não simula badges conquistadas nem streak — o catálogo de badges (sempre as mesmas 5, estáticas) já aparece listado no painel do simulador pra referência, sem precisar simular "conquista".

## 2026-08-15 — Fase 4 (Progression) implementada; bônus de missão adiado

**Decisão**: Fase 4 implementada seguindo a ordem do roadmap (recomendação aceita pelo Ronaldo, não pulou direto pra Concursos). `progresso_area` calcula domínio como **média corrente de nota** por área (simples, sem "nível de área" separado — decisão consciente de não criar estrutura complexa antes de precisar, mesmo princípio já registrado em `DATA_MODEL.md`). Missões diárias (`missoes_hoje()`) são **calculadas ao vivo a cada chamada**, não uma tabela — três missões fixas (pergunta hoje, desafio hoje, área nova hoje), sem persistência de estado.
**Gap identificado e não implementado agora**: `GAME_RULES.md` já documentava um bônus de XP de "+50% por missão concluída" desde a Fase 3, mas a fórmula em `avaliar_desafio()` nunca implementou esse bônus (só streak/área nova/perfeito). Optei por **não** conectar isso agora — trataria as missões como puramente informativas nesta fase, evitando aumentar o escopo do que já é uma fase grande. Registrado aqui pra não ser esquecido, não decidido silenciosamente.
**Sinalização "requer verificação"**: implementada no mesmo lote — pedido do Ronaldo pra assuntos complexos terem uma indicação de checar fonte oficial. Decisão: **nunca gerar um link real via IA sem busca web** (risco de alucinação de citação); a IA sinaliza `requer_verificacao` + uma frase indicando que tipo de fonte checar, nunca uma URL. Busca web real (Anthropic web search tool) fica registrada como opção futura caso o Ronaldo queira link de verdade depois.
**Diretriz de Concursos Públicos confirmada**: fonte de questões deve vir de APIs públicas legalmente disponíveis, nunca scraping/cópia sem licença — já registrado em `KNOWLEDGE_MODEL.md`.

## 2026-08-15 — Fase 5 (Competitive Foundation): Rating + anti-cheat básico

**Decisão**: `profiles.rating` (default 1200, estilo Elo) implementado e calculado dentro de `avaliar_desafio()` — nunca no client, nunca a partir de XP. Fórmula v1: `delta = round((nota - 50) / 50 * 8 * peso_dificuldade)`, piso em 0. **Não é o algoritmo final** — GAME_RULES.md já registra que critérios como consistência, amostra mínima e desempenho recente ficam pra quando o ranking (Fase 6) existir de verdade; esta fase só precisava da separação estrutural entre XP e Rating existir e ser calculada corretamente.
**Anti-cheat básico**: `avaliar_desafio()` rejeita avaliação enviada em menos de 3 segundos após a criação do desafio — testado em transação única (sem esse controle, um bot poderia criar+avaliar instantaneamente). Validado: bloqueia o caso instantâneo, não interfere no uso humano normal (nenhuma pessoa lê e responde um desafio em menos de 3s).
**Visibilidade**: Rating aparece **só no Painel ADM** por enquanto (ao lado de nível/XP na lista de usuários) — sem ranking público, sem badge/UI competitiva pro usuário comum, conforme o critério de conclusão da fase ("preparação, não feature visível").
**Adiado conscientemente**: generalizar o Assessment Engine pra suportar `Question` (Concursos) — ficaria especulativo sem o caso de uso real da Fase 7 na frente; revisitar quando essa fase começar de verdade.

## 2026-08-15 — Fase 7a (Concursos Públicos): Question Engine mínimo, sem IA no caminho de resposta

**Decisão**: `Questão` (item reutilizável, múltipla escolha, gabarito) implementada como domínio **estritamente separado** de Pergunta/Desafio — tabelas novas (`concursos`, `questoes`, `tentativas_questao`, `progresso_concurso`), `desafios`/`avaliar_desafio` intocados. Correção é comparação de string no banco (`alternativa == gabarito`), **zero chamada de IA no caminho de resposta do usuário** — decisão estratégica alinhada com a discussão de sustentabilidade financeira: IA gera valor (questão + explicação), banco executa regra (correção).
**Repetição**: usuário pode responder a mesma questão várias vezes (toda tentativa fica gravada em `tentativas_questao`), mas só a **primeira** tentativa por questão conta pra `progresso_concurso`/ranking (`valida_para_progresso`) — evita inflar ranking por repetição, testado explicitamente (2 tentativas na mesma questão, só 1 contabilizada).
**`origem` extensível sem redesenho**: coluna `text` com `CHECK` já cobrindo `ia_knowra`/`provider_licensed`/`manual`/`import_licensed`, mesmo só `ia_knowra` sendo usado agora — ampliar a lista depois é um `ALTER CHECK` de uma linha, acoplado à migration que a integração de provider real já vai precisar de qualquer forma.
**Publicação controlada**: `questoes.review_status` (`generated`→`pending_review`→`approved`→`published`) — só `published` é servida por `listar_questoes()`. MVP não tem pipeline automático; promoção é manual via `revisar_questao()` (admin-only). Nenhuma questão gerada por IA entra como conteúdo confiável automaticamente.
**Metadados de auditoria**: `generation_model`, `prompt_version`, `generated_at` em `questoes` — permite rastrear "essa questão foi gerada pela versão X do gerador" quando o prompt de geração mudar.
**Geração fora do runtime**: banco de questões é populado por script/processo offline (backend, fora do request-path do usuário), nunca gerado sob demanda por tentativa — permite lote, revisão, controle de qualidade e custo previsível.
**Ranking por concurso**: mesmo padrão de segurança de `ranking_por_area` (Fase 6) — `security definer`, opt-in via `profiles.aparecer_no_ranking` reaproveitado (não duplicado), mínimo de 5 questões válidas. Regra MVP é acurácia pura sobre tentativas válidas — **não é o algoritmo definitivo**, mesma ressalva do Rating (Fase 5); peso por dificuldade/consistência fica pra quando houver volume real (`questoes.dificuldade` já existe, dá pra evoluir sem nova coluna).
**`cargo`**: atributo simples (`text`) em `concursos` por ora — vira entidade própria quando houver necessidade real de reutilização/filtro entre concursos diferentes.
**Anti-cheat**: sem gate de tempo tipo o de `avaliar_desafio` (3s) — questão objetiva pode ser respondida legitimamente em 1-2s por um humano; risco de automação em massa fica coberto pelo item já pendente em `SECURITY.md` §Rate limiting, não um controle ad-hoc novo.
**Status**: schema+RPCs aplicados em produção, checklist de segurança rodado (RLS ativo em todas as tabelas, `anon` sem acesso a nenhuma RPC/tabela nova, `questoes` sem SELECT direto pra proteger gabarito, teste funcional de repetição/progresso validado em transação com rollback). Frontend (`/concursos`) e script de geração de questões ainda **não implementados** — próximo passo.

## 2026-08-15 — Fase 8 (Seasons & Leagues): liga derivada do rating, encerramento manual

**Decisão**: `ligas` é um catálogo fixo (ordem, código, nome, rating_minimo), mesmo molde de `niveis` — a liga do usuário é **sempre calculada a partir do rating atual**, nunca um estado separado que precise de "promoção"/"rebaixamento" manual. Isso evita inventar uma máquina de estados nova quando o sistema de nível/XP já resolve exatamente esse problema de forma derivada desde a Fase 3.
**Temporadas**: `temporadas` (nome/início/fim/status) com índice único garantindo no máximo uma `ativa` por vez. Encerramento é **ação explícita do admin** via `encerrar_temporada()` — decisão consciente de não tentar congelar automaticamente quando a data `fim` passar, porque o projeto não tem infraestrutura de cron/job agendado, e uma checagem "lazy" no primeiro acesso após o vencimento introduziria condições de corrida desnecessárias pro MVP.
**Snapshot**: `temporada_resultados` congela posição/percentual/rating/liga de **todo usuário elegível** (mínimo de 5 desafios avaliados, mesmo limiar já usado em `ranking_geral`/`meu_ranking`), independente de `aparecer_no_ranking` — é tratado como registro histórico pessoal (RLS só permite ver a própria linha), não uma vitrine pública. A vitrine pública (`ranking_temporada()`) sim respeita o opt-in, mesma régua da Fase 6.
**Recompensa**: reaproveita `badges`/`conceder_badge()` — 7 badges (uma por liga), concedida na primeira vez que o usuário termina qualquer temporada naquela liga. Simplificação consciente: não é "uma badge por temporada", é "já alcançou essa liga alguma vez" — mantém compatibilidade com o modelo de badge único-por-usuário já existente desde a Fase 3, sem precisar generalizar `usuario_badges` pra permitir repetição.
**Testado**: usuário comum bloqueado tentando iniciar/encerrar temporada (RPC admin-only), segunda temporada ativa bloqueada pelo índice único, snapshot conferido em transação com rollback — nada de teste ficou em produção.
**Status**: schema+RPCs+frontend (`/temporadas`, com controles de admin na mesma página) implementados e publicados.

## 2026-08-15 — Fase 9 (Social): levantamento técnico, sem código

**Contexto**: Ronaldo pediu explicitamente pra seguir pra Fase 9. `ROADMAP.md` já registrava uma trava dupla ("não iniciar sem pedido explícito e sem as fases anteriores validadas com uso real") — o pedido explícito veio, mas a validação com uso real ainda não (produção com pouquíssimo uso até agora). Sinalizei o conflito em vez de decidir silenciosamente (regra do `CLAUDE.md` §3); Ronaldo escolheu planejar sem codificar.
**Restrição de design identificada**: `VISION.md` §O que NÃO queremos nos tornar já lista "rede social de conhecimento onde o foco vira competição/vaidade em vez de aprendizado" como anti-goal explícito — qualquer feature social precisa reforçar aprendizado, nunca virar métrica de vaidade pública.
**Decisões técnicas em aberto** (nenhuma decidida ainda, registradas em `ROADMAP.md` §Fase 9): amizade bidirecional vs. seguir unidirecional; desafio entre usuários reaproveitando Questões (Fase 7, recomendado — zero custo de IA) vs. novo tipo de desafio no Knowledge Mode; definição do que é "evento".
**Status**: nenhum schema, migration ou código escrito. Só documentação/planejamento.

## 2026-08-15 — Sustentabilidade financeira: cache de respostas canônicas (prioridade #1)

**Contexto**: Ronaldo propôs inverter a economia de IA do KnowRa (usuário usa → gera valor → monetiza → cobre custo de IA + infra) e sugeriu uma arquitetura completa: AI Router multi-provider, freemium, Concursos Pro, pacotes de créditos, B2B/EDU, ads controlado, e redução de chamadas de IA via cache de respostas canônicas. Avaliação técnica: concordo com a direção, mas recomendei **não** começar pelo router multi-provider nem por novos planos pagos — o cache de respostas é o maior retorno de custo com o menor risco de produto (é engenharia pura, não exige decisão de preço/plano), e deveria vir antes de tudo. Ronaldo confirmou essa prioridade.
**Decisão**: cache **exato** (normalização de texto: minúsculo, sem acento via extensão `unaccent`, espaços colapsados, pontuação final removida), não semântico — perguntas com o mesmo sentido mas fraseado diferente não batem ainda. Cache semântico (embeddings) fica como evolução registrada, não implementada, por exigir infraestrutura nova (pgvector) e o próprio embedding ter custo de IA.
**Implementação**: tabela `respostas_canonicas` (sem SELECT direto — acesso só via RPC), `buscar_resposta_canonica()` faz leitura+incremento do contador de reaproveitamento atomicamente (evita corrida), `salvar_resposta_canonica()` grava com `ON CONFLICT DO NOTHING` (protege contra duas perguntas idênticas simultâneas). Qualquer usuário autenticado pode popular o cache — não é admin-only, é o mecanismo pretendido (o primeiro a perguntar algo novo "aquece" o cache pros próximos). `askQuestion.ts` (backend) consulta o cache antes de chamar a Anthropic; em cache miss, chama a IA normalmente e grava o resultado pro próximo. `registrar_pergunta()` (grava o histórico do usuário) roda sempre, cache hit ou não — o cache só pula a chamada de IA, nunca pula o registro da pergunta do próprio usuário.
**Bug real encontrado e corrigido durante o teste**: a função de normalização não removia pontuação múltipla no final ("???") porque o `trim()` rodava depois do `regexp_replace` de pontuação, deixando um espaço residual entre a pontuação e o fim da string, o que quebrava o `$` do regex. Corrigido reordenando trim→colapso de espaço→trim→remoção de pontuação→trim final. Testado depois: "O que é FOTOSSÍNTESE???" e "o que e fotossintese" normalizam pro mesmo valor.
**Testado**: ciclo completo (miss → salvar → hit com variação de acento/pontuação → segundo hit incrementando contador) em transação com rollback; `anon` bloqueado de ler e escrever no cache.
**Métrica**: `admin_cache_stats()` (admin-only) expõe respostas únicas em cache, total de chamadas de IA economizadas, e as perguntas mais reaproveitadas — visível no Painel ADM.
**Não implementado ainda, ordem de prioridade combinada**: limite diário de IA no free → freemium/planos pagos → AI Router multi-provider → pacotes de créditos → B2B/EDU → ads. Ver [ROADMAP.md](ROADMAP.md) e [AI_ENGINE.md](AI_ENGINE.md) §Custo de IA e sustentabilidade financeira.

## 2026-08-15 — Sustentabilidade financeira: limite diário de IA (prioridade #2)

**Decisão**: `verificar_limite_ia()` (security definer, `auth.uid()`-based) checa e incrementa atomicamente `ia_uso_diario` (usuario_id, dia, chamadas) — 5 chamadas reais de IA por dia (número provisório, mesmo usado como exemplo pelo próprio Ronaldo na proposta original), admin isento. **Cache hit nunca consome a cota** — só chamadas que realmente chegam à Anthropic contam, mantendo o incentivo alinhado com o cache de respostas canônicas (item #1).
**Onde a checagem entra**: `askQuestion.ts` (só no branch de cache miss, antes da chamada à Anthropic), `gerarDesafio.ts` e `avaliarDesafio.ts` (sempre, já que não têm cache) — mesmo padrão de "checar antes de gastar", nunca depois.
**Erro tratado com classe própria** (`LimiteIAError`) nas 3 rotas da API, retornando HTTP 429 com mensagem amigável — reaproveitado pelo tratamento de erro genérico que o frontend já tinha (`err.message` do catch), **zero mudança de frontend necessária**.
**Testado**: 5 chamadas liberadas incrementando corretamente, 6ª bloqueada sem incrementar, leitura sem consumir (`meu_uso_ia()`), admin ilimitado — tudo em transação com rollback.
**Não implementado ainda**: nenhum plano pago pra comprar mais cota (item #3 da fila) — por ora o limite é igual pra todo mundo.

## 2026-08-15 — Audio Engine: discovery completo, extensão da Fase 0

**Contexto**: Ronaldo pediu uma extensão oficial da Fase 0/Foundation especificamente pra planejar uma futura identidade sonora do KnowRa (música ambiente + efeitos de gamificação) — explicitamente **discovery only**: analisar, modelar, documentar, validar, propor. Nenhum código, biblioteca, tabela, storage ou arquivo de áudio deveria ser criado nesta etapa, e nenhum foi. Documento completo em [AUDIO_ENGINE.md](AUDIO_ENGINE.md).

### DEC-AUDIO-001 — Separação entre Music e SFX
**Decisão**: música ambiente (contínua) e efeitos sonoros (curtos, por evento) são canais arquiteturalmente independentes — managers separados, sem estado compartilhado. **Motivo**: permite volume, comportamento e prioridade independentes por canal; é o que torna possível um SFX tocar por cima da música sem interrompê-la.

### DEC-AUDIO-002 — Áudio é sempre opcional
**Decisão**: nenhuma funcionalidade do KnowRa depende de reprodução de áudio pra funcionar ou ser compreendida. Toda informação que um som comunicaria tem equivalente visual/textual já existente como fonte primária. **Motivo**: acessibilidade (nem todo usuário ouve/quer ouvir som) e robustez (áudio pode falhar — bloqueio de autoplay, provider fora do ar — sem quebrar o produto).

### DEC-AUDIO-003 — Provider Abstraction desde o desenho
**Decisão**: nenhuma integração futura de áudio pode acoplar o KnowRa inteiro a um único fornecedor — mesmo princípio já aplicado à IA (`AI_ENGINE.md`) e a Questões (`ARCHITECTURE.md` §Provider Layer). **Motivo**: permite trocar/adicionar fornecedor sem reescrever o Music/SFX Manager; reduz risco de disponibilidade e de mudança de API de terceiro.

### DEC-AUDIO-004 — Metadados de licença obrigatórios antes de catalogar
**Decisão**: todo `AudioAsset` de fonte externa precisa de metadados de origem/licença (fonte, licença, exige atribuição, permite uso comercial, permite modificação, permite redistribuição) validados **antes** de entrar no catálogo oficial. "Está disponível na internet" e "é Creative Commons" nunca são, por si só, sinônimo de "podemos usar" — cada licença tem termos próprios que precisam ser lidos e conferidos contra o uso pretendido. **Motivo**: risco jurídico é o maior risco real deste domínio; mesma régua rigorosa já registrada pra Questões de Concursos (`KNOWLEDGE_MODEL.md` §Origem e licenciamento).

### DEC-AUDIO-005 — Recomendação de MVP: catálogo próprio pequeno, não provider externo
**Decisão**: quando/se o Audio Engine avançar pra implementação, recomenda-se um catálogo próprio pequeno (poucas faixas, poucos SFX, licença verificada manualmente ou conteúdo original) em vez de integrar um provider externo de música desde o início. **Motivo**: previsibilidade de custo, controle de licença, independência de disponibilidade de terceiro — mesmo raciocínio que já levou a não integrar um `QuestionProvider` real na Fase 7 antes de haver necessidade comprovada. **Status**: recomendação registrada, não é decisão de implementação — nada foi construído.

**Documentos atualizados nesta extensão**: `AUDIO_ENGINE.md` (novo), `PRODUCT.md`, `VISION.md`, `CORE_LOOP.md`, `GAME_RULES.md`, `UX_PRINCIPLES.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `ROADMAP.md`, `DECISIONS.md` (este). `KNOWLEDGE_MODEL.md`, `AI_ENGINE.md` e `SECURITY.md` **não foram alterados** — nenhum deles tem impacto real do Audio Engine que justifique edição (áudio não gera conteúdo via IA nem introduz regra de segurança nova além das já existentes no projeto).
**Status**: discovery completo, nenhuma implementação autorizada. Próximo passo depende de aprovação explícita do Ronaldo por etapa (ver `AUDIO_ENGINE.md` §Roadmap).

## 2026-08-15 — KnowRa Pro: item #3 da sustentabilidade financeira, via Mercado Pago

**Contexto**: depois de cache (#1) e limite diário de IA (#2), o Ronaldo aprovou avançar pro item #3 — plano pago. Escopo combinado: mais interações de IA por dia, acesso ampliado a Concursos, flag "sem anúncios" reservada pro item #6 (nenhum anúncio existe ainda). Provedor: Mercado Pago (mesmo padrão do MenuFlex). Modelo: assinatura recorrente (Preapproval API), não cobrança avulsa.

**Gating de Concursos — decisão de design**: em vez de curadoria manual (marcar concurso por concurso como "Pro", o que exigiria trabalho contínuo do admin a cada concurso novo), o teto é por **quantidade de questões por concurso** — free vê até 10 questões (por ordem de geração, via coluna nova `questoes.ordem`), Pro vê todas. Prática por disciplina (`disciplinas_com_pratica`) continua sem teto pra todo mundo — é a porta de entrada gratuita do produto. Mesmo princípio já usado no limite diário de IA: quantidade, nunca conteúdo diferente por trás de um catálogo curado à parte.

**Anti-bypass**: `responder_questao()` também aplica o teto (não só `listar_questoes()`) — sem isso, um usuário free poderia responder uma questão fora do teto chamando a RPC direto com um id não listado pra ele (IDOR de conteúdo). Testado em transação com rollback: free bloqueado na 11ª questão de um concurso de teste com 15, liberado depois de virar `pro`.

**`catalogo_concursos()` passa a expor `questoes_gratis` junto de `total_questoes`** — sem isso a tela mostraria "37 questões disponíveis" pra quem só consegue responder 10, o que seria dado enganoso (proibido pelo `CLAUDE.md`).

**`DATABASE_URL` usado em runtime pela primeira vez (não só offline)**: o webhook do Mercado Pago (`POST /api/assinatura/webhook`) é chamado pelo próprio Mercado Pago, sem token de usuário — não há como autenticar via `auth.uid()`/RLS normal. Única forma de gravar `profiles.plano`/`assinaturas.status` sem introduzir uma chave `service_role` (que a decisão de 2026-08-15 "RPC com security definer" já descartou) é reaproveitar a mesma credencial `DATABASE_URL` já usada em `gerar_questoes.ts`, agora também dentro de `backend/src/lib/dbAdmin.ts` chamada em runtime. **Motivo**: mantém a garantia de "nenhuma chave que bypassa RLS circulando via API key do Supabase" — o webhook nunca confia no corpo da notificação, sempre confirma o status buscando na API do Mercado Pago antes de gravar (mesmo princípio já usado no `mp-webhook.js` do MenuFlex).

**Preço provisório**: R$ 19,90/mês, mesmo espírito do "5/dia" provisório do limite de IA — número inicial pra existir o produto, ajustável quando houver dado real de conversão/custo.

**Bug encontrado e corrigido durante o teste**: a primeira versão de `listar_questoes()` tinha `select plano from public.profiles where id = auth.uid()` ambíguo — a função tem `id` como coluna de retorno (`returns table`), então o PL/pgSQL interpretou `id` como a variável de saída, não `profiles.id`. Corrigido qualificando `profiles.id = auth.uid()` em todas as funções novas que fazem essa checagem. Pego em teste real (`SET LOCAL ROLE authenticated` + simulação de `auth.uid()`), não em produção.

**Status**: implementado (migration `0026_knowra_pro.sql`, backend `assinatura.ts`/`mercadoPago.ts`/`dbAdmin.ts`, frontend em `Perfil.tsx`/`Concursos.tsx`/`ResolverQuestoes.tsx`), testado via `psql` com RLS simulada, build limpo (`tsc` + `vite build` no frontend, `tsc` no backend). **Pendente**: `MP_ACCESS_TOKEN` real ainda não configurado no ambiente — checkout de verdade não foi testado ponta a ponta contra a API do Mercado Pago, só a lógica de banco/gating.

## 2026-08-15 — Correção de achado CRÍTICO: avaliar_desafio/criar_desafio aceitavam nota/enunciado do cliente

**Contexto**: auditoria de segurança workspace-wide (todos os produtos RhoneyInc) encontrou que `avaliar_desafio()`, `criar_desafio()`, `registrar_pergunta()` e `salvar_resposta_canonica()` — todas `security definer`, liberadas via PostgREST pra `authenticated` — aceitavam `p_nota`/`p_feedback_ia`/`p_enunciado`/`p_dificuldade`/`p_resposta_ia` diretamente como parâmetro do cliente, sem nenhuma verificação de que o conteúdo veio de uma chamada real à Anthropic. Um usuário autenticado podia chamar `supabase.rpc('avaliar_desafio', {p_nota:100,...})` direto no console do navegador e gerar XP/Nível/Rating/Badges ilimitados sem nunca usar IA de verdade. Achado adicional durante a correção: a versão de 6 parâmetros de `registrar_pergunta()` (a que o backend realmente usa desde `0014_verificacao_resposta.sql`) nunca tinha recebido o `revoke all from public, anon` que a versão antiga de 4 parâmetros tinha — estava liberada pro Postgres role `PUBLIC` inteiro, **inclusive `anon`**, não só `authenticated`. `create or replace function` com uma lista de parâmetros diferente cria uma função nova (overload), não substitui os grants da anterior — lição a levar pra qualquer redefinição futura de RPC com assinatura diferente.

**Decisão**: o Postgres não tem como verificar que uma chamada de IA aconteceu de verdade antes de uma RPC — a correção move o trust boundary. As 4 funções tiveram `EXECUTE` revogado de `authenticated`/`anon` (migration `0027_fecha_bypass_avaliacao_ia.sql`) e passaram a ser chamadas só pelo backend, via uma conexão privilegiada usando `DATABASE_URL` (nunca `service_role` — mesma decisão já registrada pro webhook do Mercado Pago). O corpo das funções continua idêntico (ainda usa `auth.uid()`) — o backend simula a sessão do usuário já validado pelo JWT real (`select set_config('request.jwt.claim.sub', usuarioId, true)`, função nova `rpcComoUsuario()` em `backend/src/lib/dbAdmin.ts`), mesma técnica já usada nos testes de RLS via `psql` deste projeto.

**Erro cometido e corrigido durante a implementação**: a primeira versão de `rpcComoUsuario()` também fazia `set local role authenticated` antes de `set_config` — isso reintroduzia o mesmo bloqueio que a migration acabara de aplicar, já que `authenticated` teve `EXECUTE` revogado. `auth.uid()` só lê a configuração de sessão (`request.jwt.claim.sub`), não depende do role do Postgres — remover o `set local role` resolveu, mantendo a conexão como o role de `DATABASE_URL` (dono das funções, sempre implicitamente autorizado a executá-las).

**Risco de deploy identificado e corrigido antes de publicar**: `DATABASE_URL` não estava configurado no ambiente de produção da Vercel do backend (`knowra-api`) — só existia localmente. Publicar a correção sem isso quebraria Perguntas/Desafios inteiros (não só o webhook do Mercado Pago, que já estava silenciosamente quebrado em produção por esse motivo desde a Fase de monetização). Adicionado via `vercel env add DATABASE_URL production` antes do deploy.

**Testado**: exploit exato simulado via `psql` com `SET LOCAL ROLE authenticated` + `auth.uid()` real — bloqueado (`permission denied for function avaliar_desafio`). Caminho legítimo (via `rpcComoUsuario`, sem troca de role) testado ponta a ponta: `criar_desafio` e `avaliar_desafio` funcionando normalmente, só a regra de negócio pré-existente (anti-cheat de 3s) intacta.

**Status**: ✅ corrigido, testado, publicado em produção.

## 2026-08-15 — KNOWRA_AI: discovery aprovado, Fase 1/2 da auditoria concluídas

**Contexto**: recebido `APIsFree.txt` — proposta do Ronaldo pra transformar o KnowRa de "app que consulta IA externa" em "plataforma com memória e inteligência própria" (Knowledge Memory, RAG interno, Ollama como IA local). Pedido explícito: interpretar antes de codar.

**Entendimento apresentado e confirmado pelo Ronaldo**: identifiquei três pontos antes de qualquer código — (1) Ollama exige processo de vida longa com modelo em memória, incompatível com o backend serverless atual (Vercel Functions), (2) tensão real com o KnowRa Pro recém-lançado (um dos 3 pilares depende de custo de IA), (3) magnitude da mudança (comparável a várias Fases somadas). O Ronaldo concordou e adicionou uma correção importante: **não decidir Ollama-obrigatório agora** — a arquitetura final deve ser consequência da auditoria, não uma decisão prévia. Aprovou só Fase 1 (auditoria) + Fase 2 (mapeamento), com regras explícitas: não implementar nada, não remover Anthropic, não alterar KnowRa Pro/Mercado Pago/limites de IA, não criar infraestrutura Ollama, não criar tabela de produção, não migrar dado.

**Decisão**: auditoria completa executada e documentada em [AI_COST_ZERO.md](AI_COST_ZERO.md) (inventário de dependências, matriz de custo, matriz de criticidade, riscos) e projeto de arquitetura em [KNOWRA_AI.md](KNOWRA_AI.md) (Knowledge Memory via `pgvector` — viabilidade alta, sem infra nova; Ollama em runtime — viabilidade baixa sem servidor dedicado, decisão de infraestrutura separada). `AI_ENGINE.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `SECURITY.md`, `ROADMAP.md` atualizados com referências cruzadas (Fase 5 do pedido original).

**Achado lateral relevante**: a auditoria (não relacionada ao objetivo principal) reconfirmou que `ip-api.com` (geolocalização de sessão) tem tier gratuito que proíbe uso comercial — já documentado como "revisar antes de monetizar" antes do KnowRa Pro existir. Agora que a monetização existe, isso é pendência ativa, não risco futuro. Não corrigido nesta auditoria (fora do escopo), só reconfirmado em `SECURITY.md`.

**Status**: Fases 1 e 2 concluídas e apresentadas. Próximo passo depende da resposta do Ronaldo às 3 perguntas em aberto (`KNOWRA_AI.md` §11) — nenhuma Fase 3+ (código/tabela/infraestrutura) autorizada ainda.

## 2026-08-15 — KNOWRA_AI Etapa A: schema da Knowledge Memory aplicado

**Decisão**: "pode seguir" do Ronaldo interpretado como aprovação pra iniciar a Etapa A do roadmap em `KNOWRA_AI.md` §9 (a única sem dependência de infraestrutura e sem exigir resposta prévia às 3 perguntas em aberto — nenhuma delas trava especificamente essa etapa). Migration `0028_knowledge_memory_schema.sql` aplicada: extensão `pgvector`, tabelas `knowledge_record`/`knowledge_relation`, RLS habilitado, **sem nenhum grant pra `anon`/`authenticated`** — schema puro, nenhum endpoint lê/escreve ainda.

**Detalhe técnico**: coluna `embedding` criada como `vector` sem dimensão fixa, de propósito — a dimensão depende do provedor de embeddings, decisão ainda não tomada (pergunta 1 de `KNOWRA_AI.md` §11 continua em aberto). Índice de busca por similaridade (ivfflat/hnsw, que exige dimensão fixa) fica pra quando essa escolha existir.

**Testado**: migration validada em transação com rollback antes de aplicar; confirmado via `psql` que `authenticated`/`anon` não têm nenhum privilégio (`select`/`insert`/`update`/`delete`) nas duas tabelas novas.

**Status**: Etapa A concluída. Etapas B em diante (semantic cache em runtime, `AIProvider`, Confidence Engine, Knowledge Graph populado, avaliação de Ollama offline) continuam exigindo aprovação separada cada uma — nenhuma delas foi iniciada.

## 2026-08-15 — KNOWRA_AI: embeddings locais validados em deploy real (Vercel)

**Contexto**: "siga" do Ronaldo pra continuar depois da Etapa A. A Etapa B (cache semântico) precisava de uma escolha de provedor de embeddings, que não existia ainda — Anthropic não oferece embeddings. Perguntei antes de decidir sozinho; o Ronaldo escolheu local via `transformers.js`, mesmo com o próprio risco de cold-start já sinalizado na pergunta.

**Processo de validação** (não só teórico — testado de verdade):
1. Instalei `@xenova/transformers` (pacote original) → achado: descontinuado, 5 vulnerabilidades (1 crítica) em dependências transitivas. Troquei pro sucessor mantido, `@huggingface/transformers` → 0 vulnerabilidades diretas, mas 2 altas sem correção em deps transitivas (`adm-zip`, `sharp`) — superfície de ataque baixa pro nosso uso (só texto, nunca ZIP/imagem de usuário), Ronaldo aceitou.
2. Rodei localmente: funcionou (384 dimensões, ~45ms de inferência), mas achei um problema sério de deploy: o build "node" da lib faz `require("onnxruntime-node")` incondicional — 513MB, sendo 240MB só de um provider CUDA que a Vercel nunca usa (sem GPU em serverless).
3. Tentei o build "web" (mais leve, sem `onnxruntime-node`) — não roda em Node puro, só em navegador de verdade (tenta `fetch` relativo à página). Seria preciso simular ambiente de navegador — descartado por não ser engenharia sólida.
4. Investiguei outra lib (`fastembed`) — mesmo problema raiz (`onnxruntime-node`), confirmando que não é bug de uma lib específica.
5. **Achado que resolveu**: dentro do `onnxruntime-node`, 240MB dos 513MB totais é `libonnxruntime_providers_cuda.so` — sozinho, sem uso nenhum pra nós. Excluindo ele (+ o de TensorRT, GPU também) via `vercel.json` → `functions[...].excludeFiles`, o runtime real cai pra ~38MB. Total do pacote com modelo (87MB) fica ~130-150MB, dentro do limite da Vercel.
6. Deploy de teste real (preview, rota temporária `_teste-embedding`, removida depois) confirmou: erro adicional de cache tentando gravar em `node_modules/` (read-only em produção) → corrigido com `env.cacheDir = "/tmp/..."`. Depois disso, funcionou de ponta a ponta: **cold start ~2.2s, chamada quente 0ms carregamento + ~20-30ms inferência**.

**Decisão**: `@huggingface/transformers` (`Xenova/all-MiniLM-L6-v2`, 384 dim) é o provedor de embeddings pra Etapa B, validado tecnicamente em produção — não precisa de VPS, roda dentro da função serverless que já existe. Dependência e `vercel.json` já commitados no repositório; rota de teste removida. **Nenhum fluxo real foi alterado ainda** — Etapa B (wiring em `askQuestion.ts`) continua exigindo aprovação separada.

**Lição pra próximas decisões de dependência nativa**: pacotes que envolvem binários nativos (ONNX, TensorFlow, etc.) frequentemente empacotam suporte a hardware que o ambiente de deploy nunca vai ter (GPU numa função serverless) — vale sempre inspecionar o tamanho real por arquivo antes de descartar uma opção como "grande demais", em vez de confiar só no tamanho total do pacote.

## 2026-08-15 — KNOWRA_AI Etapa B: cache semântico ligado em `askQuestion.ts`

**Decisão**: "siga para a Etapa B" do Ronaldo, depois da Etapa A (schema) e da validação de embeddings locais em deploy real. Migration `0029_knowledge_memory_semantic_cache.sql`: coluna `embedding` fixada em `vector(384)` (dimensão do modelo já decidido), `buscar_conhecimento_semantico()` (busca por cosseno, limiar provisório 0.90 — conservador de propósito, calibração fina fica pra quando houver volume real), `salvar_conhecimento()`, `registrar_uso_conhecimento()` — nenhuma grantada pra `anon`/`authenticated`, só chamadas pelo backend via `DATABASE_URL`, mesmo padrão de `salvar_resposta_canonica()`.

**Fluxo em `askQuestion.ts`**: cache exato (já existia) → em miss, cache semântico (novo) → em miss dos dois, Anthropic (como antes) e grava nos DOIS caches (exato + semântico), não só num — "complementa, não substitui", como já registrado em `KNOWRA_AI.md`.

**Testado**: funções da migration testadas em transação com rollback (vetor idêntico acha com similaridade 1.0, vetor oposto não acha nada). Formato do literal que o código de fato produz (`embeddingParaLiteral()`, ex: `"[0.1,0.2,...]"` com 384 valores) testado à parte, replicando exatamente a chamada `dbAdmin().query(...)` do TypeScript — confirmado que o cast implícito texto→`vector(384)` funciona igual em produção.

**Status**: ✅ implementado, testado, publicado em produção. Etapa C (AIProvider) em diante continua exigindo aprovação separada.

## 2026-08-15 — KNOWRA_AI Etapa C: Provider Abstraction implementada

**Decisão**: "pode seguir" do Ronaldo depois da Etapa B. Introduzida a interface `AIProvider` (`responder`/`gerarDesafio`/`avaliar`) já prevista em `AI_ENGINE.md` desde a Fase 2 — `askQuestion.ts`, `gerarDesafio.ts` e `avaliarDesafio.ts` passam a chamar essa abstração em vez da Anthropic diretamente. Único adapter hoje é `AnthropicProvider`, com os três prompts/tool schemas/modelo movidos **exatamente como estavam** — refatoração pura, sem nenhuma mudança de comportamento, prompt ou modelo.

**Motivo**: abre a porta pra trocar/adicionar provedor (Ollama, outro) no futuro sem reescrever os três serviços de novo — só trocar o adapter. Não introduz seleção/roteamento entre múltiplos providers agora (over-engineering pro estágio atual, só 1 provider existe).

**Status**: ✅ implementado, build limpo, publicado em produção. Etapa D (Confidence Engine) em diante continua exigindo aprovação separada.

## 2026-08-15 — KNOWRA_AI Etapa D: Confidence Engine (parte estrutural)

**Contexto**: "pode segui" depois da Etapa C. Sinalizei antes de implementar: calibrar os limiares de confiança (0.90/0.70) exige dado real de uso que ainda não existe (`knowledge_record` praticamente vazia em produção, Etapa B acabou de ir ao ar). O Ronaldo escolheu implementar só a parte estrutural com os números provisórios já documentados, sem inventar regra de expiração automática por tempo.

**Decisão**: migration `0030_knowledge_memory_confidence_engine.sql` — `buscar_conhecimento_semantico()` passa a devolver `confidence` e `requer_verificacao` calculado (`confidence < 0.90 ou status = 'requer_revalidacao'`); entradas com `confidence < 0.70` nunca são servidas da memória, mesmo com similaridade alta. `revisar_conhecimento(id, status)` — admin-only, security definer, mesmo padrão de `revisar_questao()` (Concursos) — permite marcar uma entrada como `requer_revalidacao`/`invalidado` manualmente. `askQuestion.ts` repassa `requer_verificacao` pro mesmo mecanismo de sinalização já usado desde a Fase 4 (`observacao_verificacao`).

**Escopo explicitamente fora**: nenhuma UI no Painel ADM pra usar `revisar_conhecimento()` ainda — só o backend/RPC existe. Nenhuma decadência automática de confiança por tempo (`last_verified_at` antigo não muda nada sozinho).

**Testado**: em transação com rollback — entrada com confiança alta (0.95) não sinaliza verificação; a mesma entrada, depois de marcada `requer_revalidacao` via `revisar_conhecimento()`, passa a sinalizar `requer_verificacao: true` mesmo com a confiança inalterada.

**Status**: ✅ implementado, testado, publicado em produção. Etapa E (Knowledge Graph) em diante continua exigindo aprovação separada.

## 2026-08-15 — KNOWRA_AI Etapa E: Knowledge Graph (parte estrutural)

**Decisão**: "siga" depois da Etapa D. Mesmo raciocínio aplicado de novo: inferir relações entre conhecimentos automaticamente exigiria dado de uso real (ainda inexistente) ou uma chamada de IA nova (contradiria o objetivo de custo-zero da própria iniciativa). Implementado só o CRUD administrado manualmente — `criar_relacao_conhecimento()`/`remover_relacao_conhecimento()` (admin-only, mesmo padrão de `revisar_conhecimento()`) e `buscar_relacionados()` (leitura, não exposta a `authenticated` ainda — nenhuma decisão de produto de como "conhecimento relacionado" apareceria pro usuário, então fica pronta mas não conectada em nada).

**Testado**: em transação com rollback — admin cria relação entre dois registros, `buscar_relacionados()` devolve corretamente, usuário comum tentando criar relação é bloqueado (`Acesso negado`).

**Status**: ✅ implementado, testado, publicado. Nenhum código de aplicação alterado (só migration). Etapas F (Ollama offline) e G (Ollama runtime, exige VPS) restantes no roadmap.

## 2026-08-15 — KNOWRA_AI Etapa F: Ollama offline avaliado, resultado desfavorável

**Contexto**: "pode seguir" do Ronaldo pra avaliar Ollama offline (roadmap `KNOWRA_AI.md` §9, Etapa F) — comparar `llama3.1:8b` local contra o Opus que `gerar_questoes.ts` usa hoje, gerando o mesmo lote de questões com os dois, sem gravar nada no banco (script `backend/scripts/comparar_ollama_etapaF.ts`, não integrado a nenhum fluxo real).

**Resultado real medido** (máquina de desenvolvimento, CPU, sem GPU dedicada): Anthropic (Opus) gerou 3 questões válidas em ~22s. `llama3.1:8b` levou **8min01s** pra gerar o mesmo lote — ~22x mais lento — e o resultado **não seguiu o schema exigido pela tool call**: só 2 alternativas por questão (o schema pede exatamente 4), campo `enunciado` grafado errado (`enunciato`), gabarito com letras fora do range esperado (`E`/`F` em vez de A-D). Teria falhado a validação que `gerar_questoes.ts` já aplica (`alternativas.length !== 4 || !["A","B","C","D"].includes(gabarito)`).

**Decisão**: não trocar Opus por `llama3.1:8b` em `gerar_questoes.ts` — nem como opção, nem como default. Nesta configuração de hardware (CPU, sem GPU), o modelo local não é competitivo nem em velocidade nem em confiabilidade de formato pra geração de questões estruturadas. Responde com dado real a uma das perguntas do §11 do `KNOWRA_AI.md`: não há indício de que valha a pena avançar pra Etapa G (VPS dedicado) com este modelo — geração de questões continua via Anthropic.

**Ressalva**: o teste usou um único modelo (`llama3.1:8b`, quantização Q4) numa única máquina sem GPU. Não descarta Ollama pra sempre — descarta essa combinação específica agora. Um modelo maior/melhor com GPU dedicada poderia ter resultado diferente, mas isso já seria a decisão de infraestrutura da Etapa G, fora do escopo deste teste offline.

**Status**: ✅ Etapa F concluída (avaliação, não implementação). Script de comparação existe em `backend/scripts/comparar_ollama_etapaF.ts`, não chamado por nenhum fluxo de produção. Etapa G segue sem justificativa pra avançar.

## 2026-08-15 — Bug real em produção: "Não foi possível processar sua pergunta" (DATABASE_URL IPv6-only)

**Contexto**: Ronaldo reportou que nenhuma pergunta em `knowra.rhoneyinc.com` completava — sempre voltava "Não foi possível processar sua pergunta agora. Tente novamente." (500 genérico de `/api/ask`, `backend/src/api/ask.ts`). Logs de produção (`vercel logs`) mostraram a causa real: `Error: getaddrinfo ENOTFOUND db.kgymvpxzbuojxxjpjmos.supabase.co` em toda chamada que passava por `dbAdmin()` (cache semântico, `registrar_pergunta()`, etc.).

**Causa raiz**: `db.<project-ref>.supabase.co` (Direct Connection) hoje só tem registro DNS `AAAA` (IPv6) — confirmado via `getent hosts`, sem `A` record. Funções serverless da Vercel não têm saída IPv6 disponível, então toda conexão falhava na resolução de DNS, não só sob carga. `DATABASE_URL` de produção (`backend/.env`/Vercel env) ainda apontava pro host antigo, provavelmente configurado antes dessa mudança de infraestrutura do Supabase.

**Correção**: trocada `DATABASE_URL` de produção (`vercel env`, projeto `knowra-api`) pro **Supavisor Connection Pooler** — `postgresql://postgres.kgymvpxzbuojxxjpjmos:<senha>@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true` (IPv4, modo transaction). A região do pooler (`us-east-1`) teve que ser descoberta por tentativa — não existe forma direta de consultar a região do projeto sem acessar o dashboard; testei contra as regiões mais comuns até a autenticação do tenant funcionar. Validado com uma conexão `pg` real antes de aplicar (não só suposição). Redeploy de produção feito (`vercel --prod`) pra env var nova entrar em vigor.

**Por que o pool/transação continua compatível**: `dbAdmin()` usa `pg.Pool` com `max: 3`, e `rpcComoUsuario()` abre uma conexão, roda `begin`/`set_config`/query/`commit` e libera — nenhum estado de sessão precisa sobreviver além de uma transação, então o modo transaction do pooler (porta 6543) não quebra esse padrão.

**⚠️ Atenção pra outros produtos RhoneyInc**: qualquer produto usando `DATABASE_URL` com host `db.<ref>.supabase.co` direto (mesmo padrão usado no MeuPet, MontaMovel, VagaLume) está com o mesmo risco se rodar em ambiente sem IPv6 (Vercel serverless é o caso mais comum no ecossistema) — vale auditar os outros produtos que usam `DATABASE_URL` em runtime, não só localmente.

**Status**: ✅ corrigido, testado (conexão real validada antes do redeploy), publicado em produção.

## 2026-08-15 — i18n: fundação PT/EN/ES, rollout por etapas

**Contexto**: Ronaldo pediu multi-idioma (Português padrão, Inglês, Espanhol) com seletor por bandeira ao lado do nome do usuário. Achado ao investigar: o nome do usuário **não aparecia** na barra de navegação até então (só em `/perfil`) — sinalizado antes de implementar, não assumido silenciosamente. Escopo (app inteiro de uma vez vs. fundação primeiro) perguntado explicitamente — Ronaldo escolheu fundação + piloto primeiro.

**Decisão**: `react-i18next` (biblioteca padrão de fato pra i18n em React, sem custo, sem infraestrutura nova). 3 locales em `frontend/src/i18n/locales/*.json` (pt default, en, es), preferência persistida em `localStorage` (`knowra_idioma`) — não em `profiles`, porque não depende de estar logado pra funcionar e evita migration só pra isso por ora. `SeletorIdioma` usa emoji de bandeira (🇧🇷🇺🇸🇪🇸), sem asset novo. Colocado na `Navigation.tsx` (desktop e mobile), ao lado do nome do usuário — que passou a aparecer ali pela primeira vez.

**Rollout por etapas, decisão explícita**: só `Navigation.tsx` e `Home.tsx` traduzidas nesta etapa (piloto). Demais páginas (`Perfil`, `Concursos`, `Admin`, `Temporadas`, `Ranking`, `Mapa`, componentes como `DesafioCard`/`MissoesDiarias`/`HistoricoPerguntas`) continuam com string fixa em português — pendente, não esquecido. Traduzir tudo de uma vez foi avaliado e descartado por risco de string esquecida/layout quebrado com texto mais longo (inglês/espanhol tendem a ser mais longos que o rótulo em português em botão/badge).

**Testado**: `tsc --noEmit` limpo, `vite build` de produção limpo. Não foi possível verificar visualmente no navegador nesta sessão (sem ferramenta de browser disponível) — Ronaldo avisado pra conferir manualmente após o deploy.

**Status**: ✅ fundação + piloto implementados e publicados em produção. Próximo passo: traduzir o restante das páginas, uma de cada vez.

## 2026-08-15 — RAG elevado a componente arquitetural oficial do KNOWRA_AI (documentação, sem código)

**Contexto**: Ronaldo trouxe uma recomendação detalhada de arquitetura — RAG não deve ser tratado como "uma busca vetorial a mais", e sim como infraestrutura de conhecimento central do KNOWRA_AI, com uma distinção importante: o sistema deve construir uma **memória de conhecimento validada e recuperável**, não simplesmente acumular tudo que recebe. A instrução explícita foi: incluir RAG oficialmente na Foundation, projetar (não implementar) usando PostgreSQL + pgvector, cobrindo Knowledge Memory, embeddings, retrieval, hybrid search, confidence score, source provenance, versionamento, expiração/atualização e regras anti-contaminação.

**O que já existia antes desta revisão** (verificado contra o código real antes de escrever, não assumido): Etapas A-F do roadmap já tinham implementado boa parte disso — `pgvector`, `knowledge_record`/`knowledge_relation`, cache semântico em `askQuestion.ts`, `AIProvider`, Confidence Engine (`confidence`/`status`/`requer_revalidacao`), Knowledge Graph estrutural (CRUD admin, não populado). O que faltava, exatamente os pontos que a proposta do Ronaldo endereça: busca é só vetorial top-1 (sem full-text, sem filtro de metadado, sem reranking — "RAG híbrido"); `source` mistura origem com confiabilidade (sem taxonomia de proveniência tipo VERIFIED/COMMUNITY/AI_GENERATED/UNVERIFIED/OUTDATED); e o modelo é "registro por pergunta-resposta", sem um conceito de entidade de conhecimento deduplicada (o problema real que o Ronaldo descreveu: "Constituição Federal" acaba espalhada em múltiplos registros quase-redundantes em vez de um conceito central com facetas).

**Decisão**: `docs/foundation/KNOWRA_AI.md` reescrito — RAG declarado peça central no §1 (Objetivo) e §3 (Princípios, nova regra de anti-contaminação: conhecimento não verificado nunca é servido com a mesma autoridade de fonte oficial). Três seções novas de projeto, todas design-only: §9 RAG Retrieval Engine híbrido (vector + full-text nativo do Postgres + metadata filter + reranking por combinação de score, top-K em vez de top-1); §10 Source Provenance (taxonomia de confiança ortogonal ao `status` que já existe); §11 Knowledge Entity (evolução conceitual de deduplicação via `knowledge_relation`, sem data agendada — decisão de modelagem em aberto); §12 RAG alimentando o Core Loop (mesmo `AIProvider.gerarDesafio()` já implementado, recebendo mais contexto). Roadmap (§13) ganhou Etapas H (RAG híbrido), I (Source Provenance), J (Knowledge Entity) — todas **sem aprovação de implementação**, mesma régua de aprovação por etapa já usada em A-G.

**Por que Etapa J não entra com data**: diferente de H/I (extensão aditiva do schema existente, mesmo perfil de risco de A-E), decidir a granularidade de uma "Knowledge Entity" (um artigo de lei? um tema? um documento?) sem dado real de uso seria desenhar uma taxonomia arbitrária — registrado como direção arquitetural aprovada, não como etapa agendada.

**Status**: ✅ Foundation atualizada (`KNOWRA_AI.md` reescrito, `AI_ENGINE.md` com referência cruzada nova). Nenhum código, migration ou dependência nova — conforme pedido explícito do Ronaldo ("não implementar ainda"). Próximo passo depende de aprovação etapa por etapa (H, I ou J) e resposta às perguntas em aberto no `KNOWRA_AI.md` §15.

## 2026-08-15 — KNOWRA_AI Etapa H: RAG Retrieval Engine híbrido implementado

**Contexto**: "faça a implantação do RAG" do Ronaldo, depois da revisão que elevou RAG a componente arquitetural oficial (`KNOWRA_AI.md` §9, entrada anterior). Escopo: só Etapa H (Retrieval Engine híbrido) — Etapas I (Source Provenance) e J (Knowledge Entity) continuam sem data, não implementadas, por decisão já registrada (dependem de decisão de modelagem/dado real de uso).

**Diferença real em relação ao que já existia**: até aqui, "RAG" no KnowRa era só cache semântico (`buscar_conhecimento_semantico()`, Etapa B/D) — serve uma resposta pronta direto da memória, ou nada. Isso não é retrieval-augmented generation de verdade, é cache. A implementação desta etapa adiciona `buscar_contexto_rag()`: busca **top-K** (default 5) registros relacionados, combinando score vetorial (peso 0.7) e full text search nativo do Postgres (`to_tsvector`/`ts_rank`, peso 0.3, config `portuguese` — sem extensão nova), e passa esse contexto pra a IA **gerar uma resposta nova**, não repetir uma pronta. `AIProvider.responder()` ganhou parâmetro opcional `contexto: string[]`; `AnthropicProvider` inclui no system prompt com instrução explícita de nunca copiar literalmente, só usar como apoio.

**Anti-contaminação respeitada**: `buscar_contexto_rag()` usa o mesmo piso do Confidence Engine (`status='valido'`, `confidence >= 0.70`) — conteúdo não verificado nunca vira contexto de geração, mesma regra já aplicada a "servir direto da memória".

**Migration 0033**: `search_vector` (coluna gerada, `tsvector`, índice GIN) em `knowledge_record`; `buscar_contexto_rag()` sem grant pra `anon`/`authenticated` (mesma postura de segurança de toda função sensível do KNOWRA_AI — só backend via `DATABASE_URL`). Índice de similaridade vetorial (ivfflat/hnsw) propositalmente não criado ainda — tabela pequena, mesma decisão já registrada na Etapa A/B.

**Eficiência**: embedding da pergunta calculado uma única vez em `responderComAnthropic()` (antes gerado duas vezes — uma implícita pro cache semântico anterior no fluxo, outra pra salvar em `knowledge_record` no final), reaproveitado pra buscar contexto RAG e pra gravar o conhecimento novo.

**Testado**: migration validada em transação com rollback antes de aplicar. Teste funcional real (script ad-hoc, também em transação com rollback): inserido um registro sobre "fotossíntese", buscado com uma pergunta sem sobreposição textual ("Como as plantas produzem energia a partir da luz?") — encontrado via similaridade semântica pura, score 0.5624. Grants confirmados vazios pra `anon`/`authenticated` depois de aplicar de verdade.

**Status**: ✅ implementado, testado, publicado em produção (`vercel --prod` no backend). Etapas I e J do roadmap seguem sem data.

## 2026-08-16 — KNOWRA_AI Etapa I: Source Provenance implementado

**Contexto**: seguindo direto da Etapa H (RAG Retrieval Engine), Ronaldo pediu pra seguir pra Etapa I do roadmap já documentado — a taxonomia de confiança (`KNOWRA_AI.md` §10) proposta na revisão anterior.

**Decisão**: coluna `provenance` (`verified`/`community`/`ai_generated`/`unverified`/`outdated`) em `knowledge_record`, ortogonal a `status` (ciclo de vida/validação, já existia) e a `confidence` (score numérico, já existia). Regra de classificação centralizada em `salvar_conhecimento()` — computada a partir de `source`/`source_url` já recebidos, sem exigir parâmetro novo do backend (`source in (wikimedia/wikidata/dados_gov_br/ibge) + source_url preenchida` → `verified`; `source='anthropic'` → `ai_generated`; `source='manual'` → `community`; resto → `unverified`). `buscar_conhecimento_semantico()` e `buscar_contexto_rag()` passam a expor `provenance` no resultado (drop+create, não `replace`, porque muda `returns table` — mesmo cuidado do achado de 0027).

**Anti-contaminação**: `promover_provenance()` é o único jeito de mudar a proveniência de um registro depois de criado — admin-only (`security definer` + `is_admin()`), nunca automático por volume de uso, mesmo padrão de `revisar_conhecimento()` (Etapa D). Nenhuma das funções de leitura/gravação ficou acessível a `authenticated`/`anon` além dessa (grants conferidos depois de aplicar).

**Backfill real**: as 3 linhas já existentes em produção (geradas nas Etapas B/D) foram reclassificadas — todas como `ai_generated`, corretamente, porque vieram da Anthropic sem fonte externa confirmada.

**Testado**: migration validada em transação com rollback antes de aplicar. Nenhuma mudança de código TypeScript (a regra vive só no banco) — sem necessidade de redeploy do backend.

**Status**: ✅ implementado, testado, publicado. Etapa J (Knowledge Entity) segue sem data, dependente de decisão de modelagem (`KNOWRA_AI.md` §11/§15).

## 2026-08-16 — KNOWRA_AI Etapa J: Knowledge Entity implementado (roadmap do RAG concluído)

**Contexto**: Ronaldo confirmou querer seguir pra Etapa J. Pergunta em aberto (`KNOWRA_AI.md` §15.4, granularidade de entidade) respondida: **por tema/conceito**.

**Decisão**: em vez de criar uma tabela nova de "Knowledge Entity", reaproveitado `areas` — a árvore de conhecimento da Fase 2 já é exatamente esse conceito (dedup por `slug`, "reaproveita área existente" desde `KNOWLEDGE_MODEL.md`). `knowledge_record` ganhou `area_id` (FK pra `areas`), resolvida por uma função nova `upsert_area()` extraída da lógica que já vivia inline em `registrar_pergunta()` — agora reutilizada por `salvar_conhecimento()` também, garantindo que os dois caminhos (a pergunta do usuário E o conhecimento gravado na memória RAG) resolvem pra **exatamente a mesma linha** de `areas` quando a classificação da IA é a mesma. Isso é a deduplicação real que o Ronaldo descreveu na proposta original — perguntas diferentes sobre "Constituição Federal" convergem pro mesmo `area_id`, em vez de ficarem só soltas em `knowledge_record.topic` (texto livre, sem garantia de dedup).

**Mudança de assinatura**: `salvar_conhecimento()` ganhou parâmetro `p_area_slug` (drop+create, mesmo cuidado de sempre). `askQuestion.ts` passa `resultado.area_slug` (já calculado pela classificação da IA) nessa chamada.

**Escopo deliberadamente contido**: `buscar_contexto_rag()` passou a expor `area_id` no resultado, mas **não foi conectado** a nenhum filtro/boost de retrieval ainda — a área da pergunta atual só é conhecida depois da IA responder, não antes de buscar contexto (mesma ordem de execução já existente). Fica pronto pra um consumidor futuro (ex: página de área mostrando todo conhecimento relacionado), sem forçar wiring precoce.

**Backfill real**: as 3 linhas de `knowledge_record` já em produção foram casadas com sua área real (correspondência por nome, mesma classificação que a IA já tinha feito originalmente).

**Testado**: migration validada em transação com rollback antes de aplicar. `tsc --noEmit` limpo. Grants confirmados vazios pra `anon`/`authenticated` depois de aplicar. Backend redeployado em produção.

**Status**: ✅ implementado, testado, publicado. **Roadmap completo do RAG concluído** (Etapas A-F, H, I, J) — só resta a Etapa G (Ollama em runtime), que segue travada numa decisão de infraestrutura (VPS) ainda não tomada.

## Como registrar novas decisões

Formato: data, decisão, motivo, impacto, status. Toda mudança de framework, banco, arquitetura, estrutura de pastas, estratégia de integração, autenticação ou infraestrutura passa por aqui antes de virar código — decisão final é sempre do Ronaldo, o Claude Code propõe e justifica, nunca decide e aplica silenciosamente (ver `CLAUDE.md` §2).
