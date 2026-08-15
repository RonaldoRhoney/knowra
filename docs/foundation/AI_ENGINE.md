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
