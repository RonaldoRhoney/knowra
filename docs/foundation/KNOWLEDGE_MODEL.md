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
