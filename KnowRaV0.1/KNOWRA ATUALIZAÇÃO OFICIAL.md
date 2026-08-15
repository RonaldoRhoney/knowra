# KNOWRA — ATUALIZAÇÃO OFICIAL DA FOUNDATION v0.1

## 1. CONTEXTO

O projeto KNOWRA está atualmente na etapa anterior à implementação.

A FASE 0 — DISCOVERY — deve ser concluída antes de qualquer desenvolvimento de código.

O objetivo desta instrução é atualizar o briefing original do KNOWRA com duas novas capacidades estratégicas:

1. **Módulo de Concursos Públicos**
2. **Sistema de Ranking e Competição**

Essas funcionalidades fazem parte da visão futura do produto e devem ser consideradas desde a Foundation para que a arquitetura não precise ser reconstruída posteriormente.

IMPORTANTE:

**Não implementar essas funcionalidades agora.**

Nesta etapa, você deve apenas analisar, modelar, documentar e preparar a arquitetura para suportá-las.

---

# 2. PAPÉIS DO PROJETO

Manter os papéis estabelecidos anteriormente:

## Product Owner / Founder

Ronaldo

Responsável por:

* visão do produto;
* objetivos;
* prioridades;
* decisões de negócio;
* aprovação de mudanças.

## Principal Engineer

Claude Code

Responsável por:

* análise técnica;
* arquitetura;
* engenharia;
* implementação futura;
* testes;
* segurança;
* infraestrutura;
* documentação técnica;
* identificação de riscos;
* propostas de melhoria.

Você não deve apenas obedecer instruções mecanicamente.

Caso identifique uma decisão tecnicamente inadequada, apresente:

* problema;
* impacto;
* alternativas;
* recomendação;
* justificativa.

## Mentor de Produto / Architecture Advisor

Responsável por atuar como segunda camada de análise sobre:

* produto;
* UX;
* arquitetura;
* gamificação;
* IA;
* escalabilidade;
* segurança;
* decisões estratégicas.

---

# 3. IDENTIDADE DO PRODUTO

O nome oficial é:

# KNOWRA

O KNOWRA NÃO deve ser tratado como:

* chatbot;
* aplicativo de quiz;
* aplicativo de perguntas e respostas;
* plataforma de concursos.

Ele é:

> Uma plataforma de conhecimento interativo orientada por IA, na qual a curiosidade do usuário se transforma em aprendizado, desafios, demonstração de conhecimento e evolução.

O Core Loop permanece:

PERGUNTA
→ RESPOSTA DA IA
→ APRENDIZADO
→ DESAFIO
→ AVALIAÇÃO
→ XP / BADGE
→ EVOLUÇÃO

Esse Core Loop NÃO deve ser alterado sem justificativa explícita.

---

# 4. NOVA DIMENSÃO DO PRODUTO

O KNOWRA passa a possuir dois grandes contextos de experiência:

## KNOWLEDGE MODE

Experiência livre de conhecimento.

O usuário pode:

* perguntar qualquer coisa;
* aprender;
* explorar áreas;
* receber explicações;
* transformar conhecimento em desafios;
* acompanhar sua evolução.

## COMPETITIVE MODE

Experiência estruturada de competição e desempenho.

O usuário poderá:

* resolver desafios;
* participar de concursos;
* competir em rankings;
* participar de temporadas;
* evoluir em ligas;
* comparar desempenho com outros usuários.

Esses dois modos devem compartilhar a mesma infraestrutura de:

* usuários;
* conhecimento;
* desafios;
* avaliação;
* progressão;
* badges;
* XP;
* perfil.

---

# 5. NOVO MÓDULO — CONCURSOS PÚBLICOS

O KNOWRA deverá possuir futuramente uma área específica:

# 🎓 Concursos Públicos

Essa área deve ser tratada como um domínio especializado do KNOWRA.

Ela NÃO deve contaminar ou tornar rígido o núcleo geral do sistema.

A arquitetura deve permitir adicionar futuramente outros domínios, como:

* ENEM;
* vestibulares;
* certificações;
* entrevistas técnicas;
* programação;
* idiomas;
* certificações profissionais;
* preparação acadêmica.

Portanto, não criar uma arquitetura chamada exclusivamente de "ConcursoEngine".

Pensar em algo mais genérico, como:

Question Engine
Assessment Engine
Competition Engine
Content Provider Layer

O domínio de concursos será um consumidor dessas capacidades.

---

# 6. ESTRUTURA DO MÓDULO CONCURSOS

Planejar suporte futuro para:

## Concurso

Exemplos conceituais:

* concursos federais;
* estaduais;
* municipais;
* órgãos públicos;
* carreiras específicas.

## Cargo

Exemplo:

* Analista;
* Técnico;
* Auditor;
* Policial;
* Professor;
* etc.

## Banca

Exemplos:

* Cebraspe;
* FGV;
* FCC;
* Vunesp;
* Cesgranrio;
* etc.

## Disciplina

Exemplos:

* Língua Portuguesa;
* Direito Constitucional;
* Direito Administrativo;
* Raciocínio Lógico;
* Informática;
* Administração Pública;
* etc.

## Assunto

Exemplo:

Direito Constitucional
→ Direitos Fundamentais
→ Direitos Individuais

## Dificuldade

* Fácil;
* Normal;
* Difícil;
* Avançado;
* Mestre.

---

# 7. QUESTÕES OFICIAIS E QUESTÕES GERADAS

A arquitetura deve distinguir conceitualmente:

## Questões provenientes de fontes externas

Questões cuja utilização seja legalmente permitida através de:

* APIs licenciadas;
* bases autorizadas;
* conteúdo próprio;
* fontes públicas com licença compatível;
* outras fontes cuja utilização tenha sido validada.

Registrar metadados como:

* origem;
* fornecedor;
* licença;
* concurso;
* cargo;
* ano;
* banca;
* disciplina;
* assunto;
* dificuldade;
* resposta;
* explicação;
* identificador externo.

## Questões originais KNOWRA

Questões criadas pelo próprio KNOWRA ou geradas por IA.

Essas questões devem ser identificadas como conteúdo original/gerado.

IMPORTANTE:

Não assumir que uma questão encontrada publicamente na internet pode ser copiada, armazenada ou redistribuída.

O sistema deve prever controle de origem e licenciamento.

---

# 8. QUESTION PROVIDER LAYER

A arquitetura deve considerar uma camada de abstração para fornecedores de questões.

Conceitualmente:

KNOWRA
→ Question Engine
→ Provider Layer

Provider Layer poderá futuramente conectar:

* Provider A;
* Provider B;
* Provider C;
* banco próprio KNOWRA;
* geração por IA.

Cada provider deverá poder possuir:

* configuração;
* autenticação;
* limite de requisições;
* custo;
* origem;
* licença;
* status;
* estratégia de sincronização;
* tratamento de erros.

Não implementar integrações reais nesta FASE 0.

Apenas documentar a arquitetura necessária.

---

# 9. IA NO MÓDULO DE CONCURSOS

A IA poderá futuramente:

* explicar respostas;
* explicar alternativas;
* gerar questões originais;
* adaptar dificuldade;
* identificar assuntos fracos;
* criar simulados;
* gerar desafios personalizados;
* recomendar conteúdos;
* analisar desempenho;
* criar planos de estudo.

Mas existe uma regra:

> A IA não deve ser considerada automaticamente como fonte absoluta de verdade.

Para conteúdos educacionais e especialmente conteúdos relacionados a legislação, concursos e assuntos técnicos, prever mecanismos de validação, versionamento e origem.

---

# 10. NOVO SISTEMA — RANKING

O KNOWRA deverá possuir um sistema de ranking global e por categorias.

O ranking deve permitir comparar usuários em diferentes dimensões.

Exemplos:

## Ranking Geral

Compara o desempenho global dos usuários.

## Ranking por área

Exemplo:

* Tecnologia;
* Ciência;
* História;
* Geografia;
* Finanças;
* etc.

## Ranking por domínio

Exemplo:

Tecnologia
→ Programação
→ Python

## Ranking de Concursos

Possibilitar:

* geral;
* por concurso;
* por área;
* por disciplina;
* por banca;
* por período;
* por temporada.

---

# 11. XP NÃO É RATING

Essa separação é OBRIGATÓRIA.

## XP

Representa progressão dentro do KNOWRA.

XP pode ser obtido através de:

* aprendizado;
* desafios;
* missões;
* consistência;
* conquistas;
* evolução.

XP determina principalmente:

* nível;
* progressão;
* desbloqueios;
* conquistas.

## Rating

Representa desempenho competitivo.

Rating deve ser utilizado para:

* rankings;
* ligas;
* competição;
* comparação de desempenho.

Não usar XP como único critério de ranking competitivo.

---

# 12. RANKING JUSTO

O ranking não deve premiar simplesmente quem respondeu mais perguntas.

Evitar situações como:

Usuário A:
1000 questões fáceis.

Usuário B:
300 questões difíceis com excelente desempenho.

O sistema deve considerar futuramente fatores como:

* precisão;
* dificuldade;
* consistência;
* desempenho recente;
* quantidade mínima de avaliações;
* qualidade das respostas;
* nível do desafio;
* eventualmente tempo de resposta;
* eventualmente força dos adversários.

Não implementar algoritmo definitivo de rating nesta fase.

Porém, documentar alternativas e recomendar uma estratégia.

---

# 13. SISTEMA DE TEMPORADAS

Planejar suporte futuro a temporadas competitivas.

Exemplo:

KNOWRA — Temporada 01

Período:

01/08/2026
→
31/08/2026

Ao final da temporada:

* ranking congelado;
* recompensas;
* badges;
* posição percentual;
* histórico.

Possibilitar posteriormente:

* temporadas globais;
* temporadas de concursos;
* temporadas por categoria;
* eventos especiais.

---

# 14. SISTEMA DE LIGAS

Planejar futuramente uma progressão competitiva baseada em ligas.

Exemplo conceitual:

Bronze
↓
Prata
↓
Ouro
↓
Platina
↓
Diamante
↓
Mestre
↓
Lenda

Não implementar ainda.

O objetivo nesta fase é garantir que o modelo de dados e o Competition Engine possam suportar essa evolução.

---

# 15. COMPARATIVO DO USUÁRIO

O perfil futuro deve permitir que o usuário visualize:

## Minha posição

Exemplo:

# 1.247

## Percentual

> Você está entre os 8% melhores usuários.

## Comparação global

Meu desempenho vs média geral.

## Comparação por área

Tecnologia:
78%

Média da plataforma:
61%

## Comparação em concursos

Português:
84%

Média:
69%

Direito Constitucional:
71%

Média:
63%

Essa comparação deve ser apresentada de maneira motivadora.

Nunca transformar o ranking em uma experiência humilhante ou excessivamente negativa.

---

# 16. PRIVACIDADE DO RANKING

Prever desde a arquitetura:

* nome público;
* nickname;
* avatar;
* opção de aparecer ou não em rankings;
* perfil público;
* perfil privado;
* controle de visibilidade.

O usuário não deve ser obrigado a expor dados pessoais.

---

# 17. NOVOS CONCEITOS DE DOMÍNIO

Durante a FASE 0, analisar a necessidade dos seguintes conceitos:

* User;
* Profile;
* KnowledgeArea;
* KnowledgeTopic;
* Question;
* QuestionProvider;
* QuestionSource;
* Challenge;
* ChallengeAttempt;
* Answer;
* Evaluation;
* XPTransaction;
* Level;
* Badge;
* Achievement;
* Streak;
* Mission;
* Competition;
* Rating;
* Leaderboard;
* Ranking;
* Season;
* League;
* Contest;
* Exam;
* Subject;
* QuestionBank;
* AIInteraction.

Não assumir que todos deverão virar tabelas.

Avaliar corretamente agregados, entidades, value objects e relacionamentos.

---

# 18. ARQUITETURA

A arquitetura deve ser projetada para permitir:

KNOWLEDGE MODE

*

COMPETITIVE MODE

sem duplicar lógica.

Pensar em uma estrutura conceitual próxima de:

User
↓
Knowledge
↓
Question / Challenge
↓
Evaluation
↓
Progression
↓
Competition

O Competition Engine deve consumir resultados confiáveis do Assessment/Progression Engine.

Não permitir que o usuário manipule diretamente:

* XP;
* Rating;
* posição no ranking;
* badges;
* resultados.

Toda progressão deve ser calculada e registrada pelo backend.

---

# 19. ANTI-CHEAT

Como haverá ranking, a segurança passa a ser uma preocupação ainda maior.

A Foundation deve analisar:

* manipulação de requisições;
* alteração de XP no cliente;
* replay de respostas;
* automação;
* bots;
* múltiplas contas;
* abuso de APIs;
* respostas compartilhadas;
* exploração de falhas de rating;
* comportamento anormal.

Regra:

> Nenhuma informação crítica de competição deve ser considerada confiável simplesmente porque veio do cliente.

---

# 20. OBSERVABILIDADE

Planejar métricas futuras para:

* perguntas realizadas;
* desafios iniciados;
* desafios concluídos;
* taxa de acerto;
* dificuldade;
* XP distribuído;
* Rating;
* evolução;
* retenção;
* streak;
* ranking;
* custo de IA;
* custo por usuário;
* chamadas aos providers;
* erros;
* latência.

---

# 21. ARQUITETURA DE IA

O AI Engine deve ser pensado como camada independente.

Conceitualmente:

User
↓
Application
↓
AI Orchestrator
↓
Provider Abstraction
↓
OpenAI / Claude / outro provider

Não acoplar toda a aplicação a um único fornecedor.

Prever futuramente:

* fallback;
* seleção de modelo;
* controle de custos;
* cache;
* observabilidade;
* versionamento de prompts;
* limites;
* segurança;
* avaliação de respostas.

---

# 22. LGPD E PRIVACIDADE

A Foundation deve considerar desde o início:

* dados pessoais;
* histórico de perguntas;
* respostas;
* perfil de conhecimento;
* desempenho;
* ranking;
* histórico competitivo;
* retenção;
* exclusão;
* anonimização;
* consentimento;
* privacidade.

O perfil de conhecimento do usuário deve ser tratado como dado importante do sistema.

---

# 23. CUSTO DE IA

A arquitetura não deve assumir que toda interação utilizará o modelo mais caro.

Avaliar futuramente:

* classificação com modelos menores;
* cache;
* reutilização de respostas;
* roteamento de modelos;
* processamento assíncrono;
* limites;
* quotas;
* controle de custo.

O custo por usuário deve ser uma métrica do produto.

---

# 24. RHONEYINC DESIGN STANDARD

O KNOWRA deve seguir os padrões de qualidade estabelecidos nos produtos da RhoneyInc.

Princípios:

* premium;
* moderno;
* elegante;
* intuitivo;
* responsivo;
* acessível;
* mobile-first;
* desktop consistente;
* animações com propósito;
* microinterações;
* excelente hierarquia visual;
* feedback imediato;
* estados de loading;
* estados vazios;
* estados de erro;
* experiência fluida.

Princípio:

> Sofisticação interna, simplicidade externa.

A interface deve ser simples para o usuário mesmo que a engenharia por trás seja sofisticada.

A imagem `KnowRa.png` deve ser utilizada como referência visual e conceitual, mas NÃO como especificação rígida.

Se você identificar uma solução visual ou de UX superior, proponha a melhoria e documente a decisão.

---

# 25. O QUE NÃO FAZER AGORA

Durante a FASE 0:

NÃO:

* criar aplicação funcional;
* criar telas definitivas;
* criar banco funcional;
* implementar autenticação;
* integrar OpenAI;
* integrar Claude;
* integrar API de questões;
* implementar ranking;
* implementar ligas;
* implementar temporadas;
* implementar pagamentos;
* criar marketplace;
* criar sistema social.

A missão atual é:

# ANALISAR → MODELAR → DOCUMENTAR → VALIDAR

Somente depois:

# IMPLEMENTAR.

---

# 26. FASE 0 — DOCUMENTAÇÃO

Criar ou atualizar:

```text
/docs/foundation/
```

Com:

```text
PRODUCT.md
VISION.md
CORE_LOOP.md
GAME_RULES.md
KNOWLEDGE_MODEL.md
AI_ENGINE.md
UX_PRINCIPLES.md
ARCHITECTURE.md
DATA_MODEL.md
SECURITY.md
ROADMAP.md
DECISIONS.md
```

Além desses documentos, caso você identifique necessidade real de documentos adicionais, poderá propor sua criação.

Não criar documentos apenas por excesso de formalidade.

---

# 27. NOVOS REQUISITOS QUE DEVEM APARECER NA FOUNDATION

Garantir que os documentos abordem explicitamente:

### PRODUCT.md

* visão do produto;
* Knowledge Mode;
* Competitive Mode;
* Concursos Públicos;
* público-alvo;
* diferenciais.

### GAME_RULES.md

* XP;
* Level;
* Badge;
* Rating;
* Ranking;
* Seasons;
* Leagues;
* regras anti-farming.

### KNOWLEDGE_MODEL.md

* áreas;
* tópicos;
* conceitos;
* conhecimento demonstrado;
* questões;
* desafios.

### AI_ENGINE.md

* respostas;
* geração de desafios;
* avaliação;
* explicações;
* personalização;
* segurança;
* providers.

### ARCHITECTURE.md

* Knowledge Engine;
* Question Engine;
* Assessment Engine;
* Progression Engine;
* Competition Engine;
* AI Engine;
* Provider Layer.

### DATA_MODEL.md

Modelar conceitualmente:

* usuário;
* conhecimento;
* questão;
* desafio;
* tentativa;
* avaliação;
* XP;
* rating;
* ranking;
* temporada;
* liga;
* concurso;
* disciplina;
* provider.

### SECURITY.md

Adicionar:

* anti-cheat;
* proteção de XP;
* proteção de Rating;
* proteção de ranking;
* abuso de IA;
* rate limiting;
* LGPD.

### ROADMAP.md

Separar claramente:

MVP
→ Knowledge
→ Gamification
→ Competitive
→ Concursos
→ Rankings
→ Social
→ expansão futura.

---

# 28. DECISIONS.md

Registrar decisões arquiteturais relevantes.

Formato recomendado:

## DEC-001 — Separação entre XP e Rating

### Contexto

XP representa progressão, enquanto Rating representa desempenho competitivo.

### Decisão

Manter os dois sistemas independentes.

### Motivo

Evitar que volume de atividade determine diretamente competência competitiva.

### Consequência

O sistema precisa de mecanismos independentes para progressão e competição.

---

Registrar outras decisões seguindo o mesmo padrão.

---

# 29. CRITÉRIO DE SUCESSO DA FASE 0

A FASE 0 será considerada concluída somente quando:

* o conceito do KNOWRA estiver claramente documentado;
* o Core Loop estiver definido;
* Knowledge Mode estiver definido;
* Competitive Mode estiver definido;
* módulo de Concursos estiver arquiteturalmente previsto;
* Question Provider Layer estiver definida conceitualmente;
* XP e Rating estiverem separados;
* Ranking estiver modelado;
* Seasons estiverem previstas;
* Leagues estiverem previstas;
* anti-cheat estiver previsto;
* IA estiver desacoplada de um único provider;
* privacidade estiver considerada;
* custos de IA estiverem considerados;
* padrões RhoneyInc estiverem documentados;
* arquitetura estiver justificada;
* modelo de dados estiver documentado;
* roadmap estiver definido;
* decisões arquiteturais estiverem registradas.

---

# 30. REGRA FINAL

Não implemente código nesta fase.

Não avance automaticamente para a FASE 1.

Quando concluir a Discovery:

1. informe quais documentos foram criados;
2. informe quais documentos foram atualizados;
3. apresente as principais decisões;
4. apresente riscos encontrados;
5. apresente dúvidas que exigem decisão do Product Owner;
6. apresente melhorias que você recomenda;
7. apresente qualquer conflito encontrado entre o briefing e uma solução tecnicamente superior.

Aguarde aprovação antes de iniciar qualquer implementação.

---

# OBJETIVO

O objetivo desta etapa não é produzir rapidamente código.

O objetivo é construir uma base suficientemente sólida para que, quando a implementação começar, o KNOWRA tenha:

* arquitetura coerente;
* domínio bem definido;
* gamificação consistente;
* IA preparada para evolução;
* suporte futuro a concursos;
* competição justa;
* rankings confiáveis;
* segurança;
* escalabilidade;
* excelente UX;
* identidade RhoneyInc.

A prioridade é:

**QUALIDADE > VELOCIDADE**

**ARQUITETURA > REMENDO**

**EXPERIÊNCIA DO USUÁRIO > COMPLEXIDADE TÉCNICA**

**CONHECIMENTO REAL > FARM DE XP**

**EVOLUÇÃO SUSTENTÁVEL > QUANTIDADE DE FUNCIONALIDADES**

O KNOWRA deve ser construído como um produto de longo prazo, não como um protótipo descartável.

