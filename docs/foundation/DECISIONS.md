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

## Como registrar novas decisões

Formato: data, decisão, motivo, impacto, status. Toda mudança de framework, banco, arquitetura, estrutura de pastas, estratégia de integração, autenticação ou infraestrutura passa por aqui antes de virar código — decisão final é sempre do Ronaldo, o Claude Code propõe e justifica, nunca decide e aplica silenciosamente (ver `CLAUDE.md` §2).
