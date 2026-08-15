# CORE_LOOP.md — KnowRa

Este é o conceito mais importante do produto — mais importante do que qualquer tela individual. É tratado como **regra arquitetural**, não como um fluxo de UX qualquer.

```text
              ┌───────────────┐
              │   CURIOSIDADE │
              └───────┬───────┘
                      ↓
              ┌───────────────┐
              │    PERGUNTA   │
              └───────┬───────┘
                      ↓
              ┌───────────────┐
              │    RESPOSTA   │
              │      IA       │
              └───────┬───────┘
                      ↓
              ┌───────────────┐
              │   APRENDIZADO │
              └───────┬───────┘
                      ↓
              ┌───────────────┐
              │    DESAFIO    │
              └───────┬───────┘
                      ↓
              ┌───────────────┐
              │   AVALIAÇÃO   │
              └───────┬───────┘
                      ↓
              ┌───────────────┐
              │   XP + BADGE  │
              └───────┬───────┘
                      ↓
              ┌───────────────┐
              │    EVOLUÇÃO   │
              └───────┬───────┘
                      │
                      └──────→ NOVA CURIOSIDADE
```

## Os 5 verbos do produto

`PERGUNTAR → APRENDER → DESAFIAR → DEMONSTRAR → EVOLUIR`

## Cada etapa em detalhe

1. **Curiosidade** — o gatilho. Não é modelado como dado, é o estado mental do usuário ao abrir o app.
2. **Pergunta** — o usuário digita "qualquer coisa" no campo de exploração. Sem categorias obrigatórias, sem fricção.
3. **Resposta IA** — clara, contextualizada (ver [AI_ENGINE.md](AI_ENGINE.md)), curta o suficiente pra não parecer aula, longa o suficiente pra ensinar de verdade.
4. **Aprendizado** — o momento em que o sistema oferece: "Você acabou de aprender algo novo. Quer testar seu conhecimento?" — convite, não obrigação.
5. **Desafio** — se aceito, a IA gera uma pergunta sobre o que acabou de ser explicado, calibrada por dificuldade.
6. **Avaliação** — usuário responde em texto livre; a IA avalia precisão, compreensão, completude e conceitos fundamentais, devolvendo uma nota (0-100) e feedback.
7. **XP + Badge** — calculado a partir da avaliação (ver [GAME_RULES.md](GAME_RULES.md)), nunca da simples ação de perguntar.
8. **Evolução** — nível, progresso na área de conhecimento, streak e conquistas são atualizados; o sistema convida a uma nova curiosidade, fechando o loop.

## Regra arquitetural derivada

Toda funcionalidade nova do produto deve ser avaliada perguntando: **em qual ponto do Core Loop ela entra, e o que ela faz para manter o ciclo girando?** Uma feature que não se conecta claramente ao loop é candidata a ficar fora do escopo do MVP — registrar como "melhoria futura identificada" (ver `CLAUDE.md` §11) em vez de implementar de imediato.

O desafio (etapa 3) é **opcional** para o usuário — recusar não deve gerar penalidade, só significa que aquele ciclo não gera XP. Isso preserva a curiosidade como algo leve, não obrigatório.

## Áudio como consequência do loop, nunca condição dele (discovery, ver [AUDIO_ENGINE.md](AUDIO_ENGINE.md))

Quando a camada sonora existir, ela reage a etapas do loop (ex: Avaliação → XP ganho → feedback sonoro) — nunca o contrário. O loop inteiro continua funcionando de forma idêntica com áudio desligado; nenhuma etapa depende de som pra ser compreendida ou completada.
