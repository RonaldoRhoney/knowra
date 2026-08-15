# KNOWLEDGE_MODEL.md — KnowRa

## A pergunta que o sistema precisa responder

> "O que esse usuário **sabe**?" — não apenas "o que esse usuário **perguntou**?"

Essa diferença é o núcleo do Knowledge Engine (ver [AI_ENGINE.md](AI_ENGINE.md) §Knowledge Engine) e é o que separa o KnowRa de um histórico de chat comum.

## Hierarquia de áreas de conhecimento

A árvore de áreas **não deve ser uma lista rígida e fechada** — precisa crescer organicamente conforme os usuários perguntam sobre assuntos novos.

```text
Área
 └── Subárea
      └── Tópico
           └── Conceitos
```

Exemplo:

```text
Tecnologia
 └── Programação
      └── Python
           ├── Variáveis
           ├── Funções
           ├── Classes
           └── APIs
```

### Como a árvore cresce (v0.1)

1. A IA classifica cada pergunta em Área → Subárea → Tópico → Conceito(s), reaproveitando nós existentes sempre que possível (evitar duplicar "Python" e "python" como nós diferentes).
2. Se não existir um nó adequado, a IA propõe um novo — a classificação nunca bloqueia o fluxo do usuário esperando curadoria manual.
3. Curadoria/normalização manual (mesclar nós duplicados, por exemplo) é tarefa de administração, não faz parte do MVP.

## Domínio por área

Para cada `(usuário, área)` o sistema mantém um nível de domínio (0-100%), calculado a partir do histórico de desafios avaliados naquela área — não é um número declarado pelo usuário, é inferido do desempenho real.

```text
Ronaldo
Tecnologia   ████████░░ 82%
IA           ███████░░░ 71%
Python       ████████░░ 84%
História     █████░░░░░ 52%
Geografia    ████░░░░░░ 41%
```

Esse painel é a base do futuro **Mapa de Conhecimento** (Fase 4, ver [ROADMAP.md](ROADMAP.md)) — no MVP, existe como dado calculado mesmo antes da visualização completa existir.

## Pontos fracos

Conceito dentro de uma área/tópico onde o usuário teve desempenho consistentemente baixo em desafios — usado como insumo de contexto pela IA (ver [AI_ENGINE.md](AI_ENGINE.md)) para calibrar desafios futuros e, eventualmente, sugerir a próxima pergunta.

## Relação com o modelo de dados

Este documento descreve o **conceito**; a materialização em tabelas (áreas, tópicos, domínio por usuário, etc.) está em [DATA_MODEL.md](DATA_MODEL.md).

---

## Pergunta vs. Questão vs. Desafio (atualização 2026-08-15)

> Ver [DECISIONS.md](DECISIONS.md) — distinção introduzida pela atualização oficial da Foundation, necessária pra suportar Concursos Públicos sem quebrar o que já existe em produção.

Três conceitos que parecem sinônimos mas não são, e a partir de agora precisam ficar bem separados:

* **Pergunta** — o que o usuário digita livremente no Knowledge Mode ("Pergunte qualquer coisa"). Sempre gerada pelo próprio usuário, sempre única, sem banco de reuso. **Já implementado** (`perguntas`).
* **Desafio** — hoje, um par pergunta→enunciado gerado ad-hoc pela IA a partir de UMA pergunta específica do usuário, respondido uma vez, avaliado uma vez. **Já implementado** (`desafios`, Fase 3, código escrito mas deploy pausado por esta atualização).
* **Questão** *(planejado, Competitive Mode/Concursos)* — um item **reutilizável e estruturado** (enunciado, alternativas quando aplicável, gabarito, explicação, dificuldade, metadados de origem), que não nasce de uma pergunta específica de um usuário — pode vir de um `QuestionProvider` (fonte externa licenciada) ou ser gerada pela IA como conteúdo original do KnowRa. Uma Questão pode ser respondida por muitos usuários, muitas vezes; um Desafio de Knowledge Mode é pessoal e efêmero.

### Caminho de evolução do schema (sem quebrar o que já existe)

`desafios` (Fase 3) continua servindo o Knowledge Mode exatamente como está — `pergunta_id` obrigatório, sempre gerado ad-hoc. Quando o Competitive Mode for implementado, a tabela de tentativas desse modo (`ChallengeAttempt` conceitual) referencia `questao_id` em vez de `pergunta_id`. Ou seja: **não modificar `desafios` para caber os dois casos** — criar uma tabela nova (`tentativas_questao` ou nome equivalente) quando chegar a hora, mantendo os dois fluxos conceitualmente distintos mesmo compartilhando Avaliação/XP/Rating por baixo. Ver [ARCHITECTURE.md](ARCHITECTURE.md) §Assessment Engine e [DATA_MODEL.md](DATA_MODEL.md).

### Origem e licenciamento de Questões (planejado)

Nunca assumir que uma questão encontrada publicamente pode ser copiada/armazenada/redistribuída. Toda Questão de fonte externa precisa registrar metadados de origem: fornecedor, licença, concurso, cargo, ano, banca, disciplina, assunto, identificador externo — ver [DATA_MODEL.md](DATA_MODEL.md) §Question/QuestionProvider.
