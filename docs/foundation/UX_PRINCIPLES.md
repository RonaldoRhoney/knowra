# UX_PRINCIPLES.md — KnowRa

## Princípio central

O usuário não deve precisar entender tecnologia para usar o KnowRa. Nada de termos técnicos desnecessários ("embedding", "prompt", "modelo" nunca aparecem na interface). A experiência deve parecer: **simples por fora, sofisticada por dentro.**

## Padrão RhoneyInc (obrigatório)

Design: premium, moderno, elegante, responsivo, mobile-first, desktop bem adaptado, hierarquia visual clara, microinterações com propósito, animações com propósito (nunca decorativas sem função), feedback visual em toda ação, estados de loading, estados vazios, estados de erro, acessibilidade.

## Fluxo principal do MVP

```text
Login → Onboarding → Interesses → Home → Perguntar → Resposta da IA → Desafio → Avaliação → XP & Conquista → Próximo desafio
```

Cada etapa deve ter transição visual suave para a próxima — o usuário nunca deve sentir que "terminou uma tela", e sim que está no meio de um ciclo contínuo (reforça o Core Loop, ver [CORE_LOOP.md](CORE_LOOP.md)).

## Telas do MVP (referência conceitual, `KnowRa.png`)

1. **Login / Criar conta** — e-mail/senha + "Continuar com Google" (login social padrão RhoneyInc, ver [ARCHITECTURE.md](ARCHITECTURE.md)).
2. **Home** — saudação, nível atual, barra de XP, streak, progresso por área, campo "Faça qualquer pergunta", atalho para nova pergunta.
3. **Pergunta/Resposta** — campo de pergunta, resposta da IA clara, CTA "Transformar em desafio".
4. **Desafio** — pergunta gerada pela IA, campo de resposta livre.
5. **Avaliação/Recompensa** — nota de conhecimento demonstrado, breakdown do XP ganho (base + bônus), badge desbloqueada se houver, CTA para continuar.
6. **Perfil** — nível, XP total, perguntas feitas, desafios respondidos, taxa de acerto, áreas em destaque.
7. **Mapa de Conhecimento** (visualização radar/áreas) — evolução visual por área, comparando com média global quando fizer sentido.
8. **Missões/Streak** — não é MVP crítico (Fase 4), mas a estrutura visual de streak (sequência de dias) já aparece desde o início por ser simples e altamente motivadora.

## Estados obrigatórios em cada tela relevante

* **Loading** — nunca tela em branco; usar skeleton ou indicador consistente com a identidade visual.
* **Vazio** — ex.: usuário novo sem histórico ainda — mensagem convidando à primeira pergunta, nunca uma tabela vazia sem contexto.
* **Erro** — mensagem humana, nunca técnica crua (`Internal Server Error`, stack trace). Detalhe técnico fica em log, não na tela do usuário.

## Onboarding

Deve coletar **interesses iniciais** (áreas de curiosidade) de forma leve — não um formulário longo. O objetivo é dar à IA um primeiro contexto, não fazer o usuário "configurar" o produto antes de usá-lo. Onboarding não pode ser bloqueante: pular deve ser possível, o sistema aprende com o uso real de qualquer forma.

## Identidade RhoneyInc

* Marca RhoneyInc aparece de forma elegante (ex.: rodapé, tela de login), sem competir visualmente com a identidade própria do KnowRa.
* Rodapé (quando a web app existir) segue o esqueleto fixo — skill `footer-padrao`, ver `CLAUDE.md` §7.
