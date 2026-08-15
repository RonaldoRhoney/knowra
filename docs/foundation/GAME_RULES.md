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

---

## Rating (planejado — Competitive Mode, não implementado)

> Atualização de escopo 2026-08-15 — ver [DECISIONS.md](DECISIONS.md) DEC-001. Regra **obrigatória**: XP e Rating são sistemas independentes, nunca confundir um com o outro.

**XP** representa progressão dentro do KnowRa — quanto o usuário evoluiu, cumulativo, nunca diminui. Determina nível, desbloqueios e conquistas (Knowledge Mode).

**Rating** representa desempenho competitivo — quão bem o usuário se sai *em comparação com outros*, pode subir e descer, usado só em rankings/ligas/competição (Competitive Mode). Nunca usar XP como critério de ranking competitivo — um usuário com muito XP acumulado ao longo de meses não é necessariamente melhor competidor do que alguém mais recente com poucas tentativas, mas altíssima precisão.

Ambos derivam do mesmo dado bruto (desafios avaliados), mas por fórmulas diferentes: XP recompensa volume-com-qualidade ao longo do tempo (nunca decresce); Rating recompensa desempenho relativo recente (pode subir e descer, tipicamente algo no estilo Elo/Glicko, a definir com uma amostra mínima de tentativas pra evitar rating inflado por poucas questões fáceis).

## Ranking justo (planejado)

O ranking **não pode** premiar simplesmente quem respondeu mais perguntas — mesmo princípio de "conhecimento real > farm" já aplicado ao XP, mas com critérios próprios de competição justa:

* precisão, não só volume;
* dificuldade das questões respondidas;
* consistência ao longo do tempo;
* desempenho recente pesa mais que desempenho antigo;
* quantidade mínima de avaliações antes de aparecer no ranking (evita 1 acerto sorte = topo);
* qualidade das respostas (não só certo/errado, quando aplicável);
* eventualmente: tempo de resposta, força relativa dos "adversários"/questões enfrentadas.

Algoritmo definitivo de rating **não é decidido nesta fase** — só a regra de que farm por volume não pode ganhar de desempenho consistente e difícil.

**Dimensões de ranking previstas**: geral, por área (Tecnologia, Ciência, História...), por domínio dentro de área (Tecnologia → Programação → Python), e de concursos (geral, por concurso, por área/disciplina, por banca, por período/temporada).

## Seasons — temporadas (implementado — Fase 8, 2026-08-15)

Períodos competitivos com início/fim definidos (ex: "KnowRa — Temporada 01"). Encerramento é **ação explícita do admin**, não automática por data (sem infraestrutura de cron no projeto) — ao encerrar, o ranking geral congela em `temporada_resultados` (posição, percentual, rating e liga no momento do encerramento), badges de liga são distribuídas, e o histórico fica registrado e visível pro próprio usuário mesmo sem opt-in de ranking público (é um registro pessoal, não uma vitrine). Ver [DECISIONS.md](DECISIONS.md).

## Leagues — ligas (implementado — Fase 8, 2026-08-15)

Progressão competitiva em camadas: Bronze → Prata → Ouro → Platina → Diamante → Mestre → Lenda. **Liga é sempre derivada do rating atual** (tabela `ligas`, faixas de rating por camada), nunca um estado promovido/rebaixado à parte — mesmo princípio já usado em `nivel_global`/`niveis`. Limiares de rating são provisórios (mesma ressalva do algoritmo de Rating em si, ver §Rating acima); recompensa por liga é uma badge (uma por camada, concedida na primeira vez que o usuário termina qualquer temporada naquela liga — não é por temporada individual).

## Regras anti-farming (Competitive Mode)

Além de "pergunta = XP está proibido" (já vale pro Knowledge Mode), no Competitive Mode a régua é ainda mais estrita porque envolve comparação entre pessoas: nenhuma métrica de ranking pode ser inflada por repetição de questões fáceis, múltiplas contas, ou automação — ver [SECURITY.md](SECURITY.md) §Anti-cheat.

## Comparativo do usuário (planejado)

O perfil deve poder mostrar, de forma motivadora e nunca humilhante: posição no ranking, percentual ("você está entre os 8% melhores"), comparação global e por área/concurso (meu desempenho vs. média da plataforma). Nunca transformar isso numa experiência negativa — reforça o princípio de UX "simples por fora, sofisticada por dentro" (ver [UX_PRINCIPLES.md](UX_PRINCIPLES.md)).

## Privacidade do ranking (planejado)

Desde a arquitetura: nome público vs. nickname vs. avatar, opção de aparecer ou não em rankings, perfil público vs. privado. O usuário nunca é obrigado a expor dados pessoais pra participar do Competitive Mode — ver [SECURITY.md](SECURITY.md) §LGPD.
