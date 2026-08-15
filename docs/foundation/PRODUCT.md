# PRODUCT.md — KnowRa

## O que é

KnowRa é uma **plataforma de conhecimento interativo orientada por IA**, na qual a curiosidade do usuário se transforma em aprendizado, desafios e progressão.

KnowRa **não é**:
* um chatbot com uma camada de pontos por cima;
* um curso estruturado com trilhas fixas;
* um quiz genérico.

KnowRa **é**:
* um espaço onde qualquer pergunta vira o início de uma jornada de aprendizado mensurável;
* um sistema que sabe **o que o usuário demonstrou saber**, não só o que perguntou.

## Problema que resolve

Aprender por curiosidade hoje é fragmentado: a pessoa pergunta algo a um chatbot, recebe uma resposta, e nada acontece depois — não há verificação de compreensão, não há memória de progresso, não há incentivo para voltar. O conhecimento adquirido se perde porque não é testado, medido nem celebrado.

KnowRa fecha esse ciclo: cada curiosidade satisfeita é testada, avaliada e registrada como progresso real.

## Quem é o usuário

Pessoa curiosa que gosta de aprender por conta própria — não necessariamente um estudante formal. Pode ser alguém que quer aprender por prazer, se preparar para algo, ou simplesmente manter o hábito de aprender coisas novas. Não deve precisar entender termos técnicos para usar o produto.

## Diferencial

1. **Fecha o ciclo pergunta → prova de aprendizado**, algo que nenhum chatbot genérico faz.
2. **XP e progressão têm significado real** — não é gamificação vazia (ver [GAME_RULES.md](GAME_RULES.md)).
3. **A IA tem contexto do que o usuário já sabe** — não trata cada pergunta isoladamente (ver [AI_ENGINE.md](AI_ENGINE.md)).
4. **Mapa de conhecimento visual** — o usuário enxerga sua evolução por área, não só um número de XP solto.
5. **Um único produto com dois contextos de experiência** (ver seção seguinte) — a mesma infraestrutura de conhecimento serve tanto quem só quer aprender por curiosidade quanto quem quer treinar pra competir de verdade.

## Dois contextos de experiência

> Atualização de escopo registrada em 2026-08-15 (`KnowRaV0.1/KNOWRA ATUALIZAÇÃO OFICIAL.md`) — ainda não implementado, só planejado desde a Foundation pra não exigir reconstrução de arquitetura depois. Ver [DECISIONS.md](DECISIONS.md).

KnowRa passa a ter dois grandes contextos, compartilhando a mesma base de usuários, conhecimento, desafios, avaliação, progressão, badges, XP e perfil:

### Knowledge Mode (o que já existe e está em produção)

Experiência livre de conhecimento — perguntar qualquer coisa, aprender, explorar áreas, transformar conhecimento em desafio, acompanhar evolução. É o núcleo do produto hoje (Fases 0-4 do [ROADMAP.md](ROADMAP.md)).

### Competitive Mode (planejado, não implementado)

Experiência estruturada de competição e desempenho: resolver desafios estruturados, participar de concursos, competir em rankings, evoluir em ligas, comparar desempenho com outros usuários. Depende de um conceito novo e obrigatoriamente separado de XP — **Rating** (ver [GAME_RULES.md](GAME_RULES.md) §Rating).

## Domínio futuro: Concursos Públicos

KnowRa terá futuramente uma área especializada de **Concursos Públicos** (cargo, banca, disciplina, assunto, questões oficiais com controle de origem/licença) — tratada como um **domínio plugável** do Competitive Mode, não como o produto inteiro. A arquitetura deve permitir adicionar outros domínios no mesmo molde no futuro (ENEM, vestibulares, certificações, idiomas, entrevistas técnicas) sem reescrever o núcleo — ver [ARCHITECTURE.md](ARCHITECTURE.md) §Provider Layer e [KNOWLEDGE_MODEL.md](KNOWLEDGE_MODEL.md) §Questões.

KnowRa continua **não sendo** uma "plataforma de concursos" — concursos é um domínio dentro do produto, o produto em si é maior que isso (ver seção "O que é" acima).

## Camada futura: Audio Engine (discovery, 2026-08-15 — não implementado)

KnowRa terá futuramente uma identidade sonora própria (música ambiente + efeitos de gamificação), documentada em [AUDIO_ENGINE.md](AUDIO_ENGINE.md). Áudio é uma camada de **imersão**, sempre opcional e nunca condição pra usar o produto — nunca vira "app de música" nem gera XP/Rating/progresso por si só (ver [GAME_RULES.md](GAME_RULES.md) §Audio Feedback).

## Comportamentos que queremos incentivar

* Curiosidade genuína (perguntar sobre qualquer assunto, sem medo de "pergunta boba").
* Aceitar o desafio depois da resposta (fechar o loop).
* Voltar com frequência (streak/consistência).
* Explorar áreas novas, não só aprofundar uma só.
* Responder com as próprias palavras, não colar a resposta da IA de volta.

## Comportamentos que queremos evitar

* Perguntar só para acumular XP (spam de perguntas triviais).
* Repetir a mesma pergunta/desafio pra farmar pontos.
* Sensação de "prova escolar" — o desafio deve parecer parte natural da curiosidade, não uma obrigação.
* Ansiedade por errar — não há penalidade por errar, só menor recompensa (ver [GAME_RULES.md](GAME_RULES.md)).

## Quem é o usuário (expandido)

Além da pessoa curiosa descrita acima, o Competitive Mode/Concursos amplia o público-alvo futuro para quem estuda **com objetivo definido** (concurseiro, vestibulando, candidato a certificação) — mas a régua de UX é a mesma: "não deve precisar entender tecnologia para usar o produto", e a régua de produto é a mesma: **conhecimento real demonstrado, nunca volume**, mesmo em modo competitivo (ver [GAME_RULES.md](GAME_RULES.md) §Ranking justo).

## Fora de escopo (v0.1 / MVP)

> Atualizado 2026-08-15 — a lista abaixo estava desatualizada (dizia que nada disso existia ainda).

**Já implementado** (deixou de ser "fora de escopo"): ranking entre usuários, ligas, temporadas, módulo de Concursos Públicos, mapa de conhecimento — ver [ROADMAP.md](ROADMAP.md) Fases 4-8 pro detalhe de cada um.

**Ainda fora de escopo**: rede social (amigos, desafios entre usuários, eventos — levantamento técnico feito, não implementado, ver ROADMAP.md §Fase 9), missões diárias/semanais elaboradas (hoje são só 3 missões informativas fixas, sem bônus de XP conectado), app mobile nativo, monetização (freemium/planos pagos — estratégia em desenho, ver [AI_ENGINE.md](AI_ENGINE.md) §Custo de IA e sustentabilidade financeira e [DECISIONS.md](DECISIONS.md)).
