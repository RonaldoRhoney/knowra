# AI_ENGINE.md — KnowRa

## Princípio central

A IA do KnowRa não pode receber apenas "responda essa pergunta." Ela deve se comportar como um **mentor adaptativo**, não como um chatbot genérico — e isso só é possível se ela receber contexto suficiente em toda chamada relevante.

## Contexto mínimo esperado

```text
Usuário
↓
Nível global
↓
Nível da área
↓
Histórico
↓
Conhecimentos demonstrados
↓
Pontos fracos
↓
Pergunta atual
↓
Objetivo da interação
```

Isso vale tanto para a **resposta à pergunta** quanto para a **geração do desafio** e a **avaliação da resposta do usuário** — os três principais pontos de contato com IA no Core Loop.

## Três funções da IA no MVP

1. **Responder** — dado a pergunta + contexto, gerar uma resposta clara, contextualizada e correta. Deve classificar a pergunta em Área/Subárea/Tópico/Conceito (ver [KNOWLEDGE_MODEL.md](KNOWLEDGE_MODEL.md)) como parte do mesmo ciclo, sem chamada extra sempre que possível.
2. **Desafiar** — gerar uma pergunta de verificação sobre o que acabou de ser respondido, calibrada por dificuldade (ver [GAME_RULES.md](GAME_RULES.md)) considerando o nível do usuário naquela área.
3. **Avaliar** — dado a resposta livre do usuário ao desafio, pontuar (0-100) considerando precisão, compreensão, completude e conceitos fundamentais, e devolver feedback construtivo — nunca só a nota.

## Knowledge Engine

Camada responsável por manter e consultar "o que o usuário sabe" (ver [KNOWLEDGE_MODEL.md](KNOWLEDGE_MODEL.md)) — é o que alimenta o contexto acima. Na Fase 2/3 pode começar simples (agregação de notas por área); sofisticação (ex.: decaimento de domínio ao longo do tempo, detecção de pontos fracos mais granular) é evolução, não requisito do MVP.

## Escolha de modelo/provedor

Seguir o padrão RhoneyInc: usar modelos Claude da Anthropic como provedor principal de IA — consistente com o restante do ecossistema (VagaLume já usa Claude) e com o princípio de "IA" citado no blueprint (`OpenAI/Claude API`, com preferência por Claude dado o alinhamento com o resto do ecossistema RhoneyInc). Antes de integrar de fato, avaliar: custo por interação (3 pontos de contato IA por ciclo completo — responder, desafiar, avaliar), latência aceitável para não quebrar o ritmo do Core Loop, e necessidade de function calling/structured output para a avaliação (nota numérica + classificação de área).

## O que NÃO fazer

* Não tratar cada chamada de IA como isolada — sempre que o contexto acima estiver disponível, ele deve ser passado.
* Não deixar a avaliação (etapa mais sensível a XP) sem *structured output* — nota solta em texto livre é frágil para calcular XP de forma confiável.
* Não expor prompts de sistema ou chaves de API no frontend — chamadas de IA são sempre server-side (ver [SECURITY.md](SECURITY.md) e [ARCHITECTURE.md](ARCHITECTURE.md)).
* Não prometer "resposta perfeita sempre" — tratar erro/indisponibilidade da IA com mensagem humana (ver `CLAUDE.md` §Tratamento de erros no padrão dos produtos irmãos).

---

## Funções futuras da IA no Competitive Mode/Concursos (planejado)

> Atualização 2026-08-15 — não implementar agora, só considerar na arquitetura. Ver [DECISIONS.md](DECISIONS.md).

Além das três funções do MVP (responder, desafiar, avaliar), a IA poderá futuramente: explicar respostas e alternativas de Questões estruturadas, gerar Questões originais (identificadas como conteúdo gerado, nunca confundidas com Questão oficial de fonte externa — ver [KNOWLEDGE_MODEL.md](KNOWLEDGE_MODEL.md)), adaptar dificuldade dinamicamente, identificar assuntos fracos do usuário, criar simulados, gerar desafios personalizados, recomendar conteúdo, analisar desempenho, criar planos de estudo.

**Regra**: a IA **não é fonte absoluta de verdade**, principalmente para legislação, concursos e assuntos técnicos. Toda Questão gerada por IA precisa de mecanismo de validação, versionamento e marcação clara de origem — nunca apresentada com a mesma autoridade de uma Questão oficial de banca sem essa marcação.

## KNOWRA_AI — discovery de arquitetura cost-zero/local-first (2026-08-15)

> Ver [AI_COST_ZERO.md](AI_COST_ZERO.md) (auditoria completa de dependências externas) e [KNOWRA_AI.md](KNOWRA_AI.md) (projeto de Knowledge Memory + RAG interno + AI Engine local opcional via Ollama). Discovery aprovado, nenhuma implementação ainda — cada etapa do roadmap proposto exige aprovação separada. Não altera nada do que está descrito abaixo nesta seção até uma etapa específica ser aprovada.

## Provider Abstraction (planejado)

Hoje o AI Engine chama a Anthropic diretamente (`backend/src/lib/anthropic.ts`) — aceitável para o MVP, mas a arquitetura de longo prazo não deve ficar acoplada a um único fornecedor:

```text
Usuário → Aplicação → AI Orchestrator → Provider Abstraction → Claude / OpenAI / outro provider
```

Quando isso importar de verdade (custo, disponibilidade, ou necessidade de um modelo diferente por tarefa), introduzir uma camada `AIProvider` com uma interface única (`responder`, `avaliar`, `gerarDesafio`) implementada por adapters por fornecedor — sem reescrever `askQuestion.ts` e futuros serviços, só trocar o adapter por trás. Não implementar essa abstração agora (over-engineering pro estágio atual), só não fechar a porta pra ela.

## Custo de IA e sustentabilidade financeira

> Atualização 2026-08-15 — ver [DECISIONS.md](DECISIONS.md). Princípio: IA gera valor (responder, classificar, gerar conteúdo original), banco/código executam regra determinística sempre que possível — nunca o contrário.

**Cache de respostas canônicas — implementado.** Pergunta com o mesmo texto normalizado (acento/caixa/pontuação/espaço ignorados) reaproveita a resposta e classificação de área já geradas, sem nova chamada à Anthropic (`respostas_canonicas`, `buscar_resposta_canonica()`/`salvar_resposta_canonica()`, integrado em `askQuestion.ts`). É cache **exato**, não semântico — duas perguntas com o mesmo sentido mas fraseado diferente ("o que é fotossíntese" vs. "explica fotossíntese pra mim") não batem ainda. Cache semântico (embeddings + busca por similaridade) é a evolução natural quando o volume de perguntas justificar o investimento — não implementado agora. Métrica de reaproveitamento visível no Painel ADM (`admin_cache_stats()`).

**Já em prática desde o MVP**: correção de Questões objetivas (Concursos, Fase 7) é 100% determinística no banco — comparação de string contra gabarito, zero IA por tentativa, mesmo que o banco de questões tenha sido gerado por IA (uma vez, offline, reutilizado por todos). Cálculo de XP/nível/rating/liga/streak/badges nunca usa IA — sempre código/banco.

**Limite diário de interações de IA — implementado.** 5/dia no plano gratuito, 30/dia no KnowRa Pro (`verificar_limite_ia()`), admin isento. Ver DECISIONS.md 2026-08-15.

**KnowRa Pro — implementado.** Assinatura recorrente via Mercado Pago (`profiles.plano`, `assinaturas`, `backend/src/api/assinatura.ts`). Além do limite de IA maior, desbloqueia acesso completo a Concursos (free vê só as 10 primeiras questões de cada concurso, por ordem de geração — `questoes.ordem`). Ver DECISIONS.md 2026-08-15 e DATA_MODEL.md.

**Ainda não implementado, priorizado nesta ordem quando for a hora**: roteamento de modelo por complexidade da tarefa (modelo mais barato pra classificação/tarefas simples, mais caro só onde a qualidade importa); AI Router multi-provider (ver §Provider Abstraction abaixo).

**Custo por usuário deve virar métrica de produto** (ver [SECURITY.md](SECURITY.md) §Observabilidade).
