# GAME_RULES.md — KnowRa

## Regra de ouro

**`pergunta = XP` está proibido.** Isso quebraria o sistema — incentivaria spam de perguntas triviais em vez de aprendizado real. XP só é concedido com base em **conhecimento demonstrado** na etapa de avaliação do desafio (ver [CORE_LOOP.md](CORE_LOOP.md)).

## Fórmula de XP

```text
XP = dificuldade × qualidade da resposta × conhecimento demonstrado × bônus contextual
```

### Multiplicadores por dificuldade (base de 25 XP)

| Dificuldade | Multiplicador | XP base |
|---|---|---|
| Fácil | 0.5x | 12 XP |
| Normal | 1x | 25 XP |
| Difícil | 2x | 50 XP |
| Avançado | 3x | 75 XP |
| Mestre | 5x | 125 XP |

### Bônus contextuais

| Bônus | Efeito |
|---|---|
| Streak diário | +10% a +50% (escala com dias consecutivos) |
| Nova área explorada | +20% |
| Missão concluída | +50% |
| Desafio perfeito (100%) | +20% |

### Exemplo de cálculo

```text
Pergunta fácil → 25 XP base
Usuário demonstra 90% de domínio → 22,5 XP
Bônus de sequência (+10%) → 24,75 XP → arredonda para 25 XP
```

> A fórmula exata dos multiplicadores acima é o ponto de partida (v0.1) — pode ser sofisticada depois de dados reais de uso, mas a estrutura (dificuldade × qualidade × contexto, nunca volume puro) é fixa.

## Níveis

| Nível | Título | XP necessário |
|---|---|---|
| 1 | Curioso | 0 |
| 2 | Explorador | 500 |
| 3 | Aprendiz | 1.200 |
| 4 | Investigador | 2.500 |
| 5 | Conhecedor | 4.500 |
| 6 | Especialista | 7.500 |
| 7 | Mestre | 12.000 |
| 8 | Mentor | 18.000 |
| 9 | Sábio | 26.000 |
| 10 | Lenda | 40.000+ |

Progressão intencionalmente não-linear (curva crescente) — níveis iniciais vêm rápido para engajar cedo, níveis altos exigem consistência real.

## Badges — precisam ter significado

**Proibido**: badges que só contam volume ("Você fez 10 perguntas"). **Obrigatório**: badges que representam comportamento ou domínio real.

Exemplos (v0.1):

* **Primeira Curiosidade** — fez sua primeira pergunta.
* **Mente Curiosa** — explorou 5 áreas diferentes.
* **Sequência de Conhecimento** — aprendeu 7 dias seguidos.
* **Explorador de Áreas** — atingiu nível 5 em 3 áreas.
* **Mestre da Tecnologia** — completou um desafio de domínio em uma área.
* **Polímata** — atingiu nível 10 em 5 áreas.
* **Aprendi com o Erro** — melhorou a nota em um desafio repetido após errar.
* **Incansável** — 30 dias de sequência.
* **Pensamento Crítico** — resolveu 20 desafios difíceis.

Toda badge nova proposta deve responder: **que comportamento ou domínio ela celebra?** Se a resposta for "nenhum, só um contador", a badge não deve ser criada.

## Dificuldade dos desafios

Cinco níveis: Fácil, Normal, Difícil, Avançado, Mestre. A dificuldade inicial de um desafio é escolhida pela IA com base no nível do usuário na área e no conteúdo da resposta que originou o desafio — não é fixa nem aleatória.

## Sem penalidade por errar

Não há perda de XP, nível ou streak por errar um desafio. O único efeito de uma nota baixa é **menos XP** naquele ciclo (proporcional à fórmula) — nunca XP negativo, nunca dano ao progresso acumulado. Isso é intencional: o medo de errar mata a curiosidade, que é o recurso mais valioso do produto (ver [PRODUCT.md](PRODUCT.md) §Comportamentos que queremos evitar).

## Streak

Contagem de dias consecutivos com pelo menos um desafio avaliado (não basta perguntar — precisa fechar o loop). Quebra a sequência não perder XP acumulado, só zera o contador de streak e o bônus associado.
