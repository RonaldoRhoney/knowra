# AUDIO_ENGINE.md — KnowRa

> **Status: Discovery only (extensão da Fase 0), 2026-08-15.** Nada neste documento está implementado. Nenhuma biblioteca instalada, nenhuma tabela criada, nenhum arquivo de áudio baixado, nenhum player construído. Este documento existe pra a implementação futura (se/quando aprovada) não precisar redesenhar do zero — mesmo princípio já aplicado a Concursos/Rankings/Seasons na Fase 0 original. Implementação só começa com aprovação explícita do Ronaldo, feature por feature (ver §20 Roadmap).

## 1. Objetivo

O KnowRa terá uma camada sonora própria — o **Audio Engine** — que reforça a experiência de conhecimento, gamificação e progressão sem se tornar um produto à parte. Ele existe pra responder uma pergunta específica: *como o som pode aumentar a imersão do Core Loop sem competir com ele?*

Regra central, citada em quase todo o resto deste documento porque é o que mais protege o produto de virar outra coisa:

> **O áudio deve aumentar a imersão sem prejudicar o aprendizado. Conhecimento é o produto. IA é a inteligência. Gamificação é a motivação. Áudio é a imersão.**

## 2. Escopo

**Dentro do escopo conceitual** (nem tudo vira MVP — ver §20): música ambiente de fundo, efeitos sonoros curtos ligados a eventos de gamificação, controle de volume por canal, persistência de reprodução entre páginas, preferências do usuário, camada de abstração de fornecedor de áudio, metadados de licenciamento por asset.

**Fora de escopo, mesmo conceitualmente** (não é "áudio do KnowRa"): streaming musical genérico, biblioteca de música pra ouvir fora do contexto do app, qualquer funcionalidade que faça o áudio virar o produto principal de uma sessão de uso.

## 3. Princípios

1. **Áudio é opcional, sempre.** Nenhuma informação crítica do produto é comunicada só por som — tudo que um som comunica tem equivalente visual/textual (ver §12).
2. **O usuário controla, o sistema nunca assume.** Sem autoplay com som antes da primeira interação explícita (ver §10). Volume começa desligado ou em nível baixo, nunca "ligado e alto" por padrão.
3. **Dois canais independentes.** Música (contínua, ambiente) e SFX (eventos curtos) têm comportamento, volume e prioridade próprios — nunca um único controle de "som" genérico (ver §5 e §7).
4. **Áudio nunca decide regra de negócio.** XP, Rating, ranking, progressão — nenhum deles é gerado, alterado ou influenciado pelo Audio Engine. O Progression Engine dispara um evento que o áudio *escuta*; a recíproca nunca é verdadeira (ver §39 equivalente em GAME_RULES.md).
5. **Áudio nunca é ponto único de falha.** Provider fora do ar, arquivo ausente, browser bloqueando reprodução, usuário offline — o resto do KnowRa continua funcionando normalmente (ver §17 Fallback).
6. **Identidade sonora, não trilha sonora genérica.** Inteligente, moderno, imersivo, elegante — nunca infantil, arcade, ou "cassino mobile". Consistente com a identidade visual dark/roxo/ciano já estabelecida (ver `UX_PRINCIPLES.md`).
7. **Provider-agnóstico desde o desenho.** Nenhuma integração futura pode acoplar o KnowRa inteiro a um único fornecedor de áudio — mesmo princípio já aplicado à IA (`AI_ENGINE.md` §Provider Abstraction) e a Questões (`ARCHITECTURE.md` §Provider Layer).

## 4. Arquitetura (conceitual)

```text
Application
    │
    ▼
Audio Context / Provider (React Context, global, um único ponto de montagem)
    │
    ▼
Audio Engine
    ├── Music Manager       — reprodução contínua, fila, categoria/faixa atual
    ├── SFX Manager         — disparo de efeitos curtos, sem estado de "faixa atual"
    ├── Volume Manager       — MUSIC_VOLUME, SFX_VOLUME, MASTER_MUTE independentes
    ├── Track Manager        — catálogo carregado, metadados, estado de carregamento
    ├── Preference Manager   — lê/grava preferências do usuário (ver §10)
    └── Provider Layer       — abstrai a origem do áudio (ver §7)
```

Music Manager e SFX Manager **nunca compartilham estado** — cada um tem seu próprio player interno (dois `HTMLAudioElement`/instâncias de player, não um só reconfigurado a cada evento). Isso é o que permite um SFX tocar por cima da música sem interrompê-la (ver §7 Prioridade).

O Audio Context vive **acima do roteamento** (nível de `App.tsx`, ao lado de `AuthProvider`), não dentro de cada página — é assim que a música sobrevive à navegação entre Home/Mapa/Desafio/Ranking sem reiniciar (ver §7).

## 5. Music Engine

Reprodução contínua de fundo. Categorias conceituais (não é uma lista fechada, é o tipo de conteúdo que faz sentido pro produto): Deep Focus, Study Ambient, Lo-fi, Minimal Piano, Ambient, Nature, Relax, Motivation.

Comportamento esperado (não implementado): play, pause, próxima, anterior, seleção de faixa/categoria, loop, estado atual (tocando/pausado/carregando), progresso/duração. Volume e mute são responsabilidade do Volume Manager (§_Controle de volume_ abaixo), não do Music Manager.

**Troca de faixa por navegação não é automática por padrão** — ver §8 Áudio Contextual. O usuário que escolheu "Deep Focus" não deve ter a música trocada sem avisar só porque foi da Home pro Mapa.

## 6. SFX Engine

Efeitos curtos, disparados por evento, sem conceito de "fila" ou "faixa atual". Eventos candidatos (ligados ao Progression Engine, nunca geradores dele — ver §Áudio e Gamificação abaixo): resposta correta, resposta incorreta, XP recebido, badge desbloqueada, level up, missão concluída, streak mantido, desafio iniciado/concluído, entrada em ranking, evento especial de temporada.

SFX tem prioridade sobre música quando os dois competem por atenção no mesmo instante (ver §7) — mas nunca deve ser longo ou "gritado" a ponto de a experiência parecer um jogo de cassino (ver §3.6).

## 7. Sistema de prioridade e persistência

**Hierarquia conceitual**, do que nunca pode ser cortado até o que pode:

```text
MASTER (mute geral do usuário)
   ↓
MUSIC (canal ambiente)
   ↓
SFX (eventos de gamificação)
   ↓
SPECIAL EVENT (raro — ex: fim de temporada, badge de liga)
```

Um SFX relevante deve conseguir tocar claramente por cima da música sem destruí-la — mecanismos a avaliar quando a implementação começar (nenhum decidido agora): *ducking* (abaixar música temporariamente), fade in/out, crossfade entre faixas. Nenhum desses é trivial de acertar bem e nenhum entra no MVP (ver §20).

**Persistência entre páginas**: o Audio Context (nível de app, acima do router — §4) é o que garante que navegar Home → Mapa → Desafio → Ranking não pare e reinicie a música. Isso é uma decisão de posicionamento de componente, não uma feature nova a construir.

## 8. Audio Provider Layer

```text
KnowRa → Audio Engine → Provider Abstraction → Provider A / Provider B / Catálogo próprio KnowRa
```

Mesmo princípio já usado em `AI_ENGINE.md` §Provider Abstraction e `ARCHITECTURE.md` §Question Provider Layer: uma interface única (`search()`, `getTrack()`, `getLicense()`, `getMetadata()`, conceituais) implementada por adapters — troca de fornecedor não deve exigir reescrever o Music/SFX Manager. **Nenhuma integração real agora** — a camada existe pra não fechar a porta, não pra ser usada imediatamente.

## 9. Audio Catalog e Licenciamento

**Regra dura, não negociável**: "está disponível publicamente na internet" **não é** o mesmo que "podemos usar", e "é Creative Commons" **não é** o mesmo que "podemos usar comercialmente sem condições" — cada licença tem termos próprios (atribuição obrigatória, uso comercial permitido ou não, modificação permitida ou não, redistribuição permitida ou não). Antes de qualquer asset de áudio entrar no catálogo real, sua licença precisa ser lida e validada contra o uso pretendido pelo KnowRa — nunca assumida.

Categorias de origem a distinguir explicitamente (não são sinônimos entre si): domínio público, CC0, Creative Commons (com suas variantes — CC-BY, CC-BY-SA, CC-BY-NC etc., cada uma com regras diferentes), conteúdo licenciado comercialmente, conteúdo original produzido pelo/pro KnowRa.

Metadado conceitual por asset (`AudioAsset` — ver §19 Data Model pra decisão de quais viram coluna de fato): título, artista/criador, fonte, URL da fonte, licença, URL da licença, se exige atribuição, texto de atribuição, se permite uso comercial, se permite modificação, se permite redistribuição, provider de origem, status (ativo/inativo/em revisão).

## 10. User Preferences

Preferências conceituais a suportar: áudio ligado/desligado (master), música ligada/desligada, SFX ligado/desligado, volume de música, volume de SFX, categoria/faixa preferida, preferência de autoplay, preferência de "menos estímulo sensorial" (ver §13).

**Não assumir que cada uma vira uma coluna própria** — algumas podem ser um único objeto de preferências (ex: `jsonb` em `profiles` ou tabela própria `preferencias_audio`), avaliar na hora da implementação real com o schema na frente (mesmo princípio já usado no resto do projeto — skill `verificar-premissas`).

**Autoplay**: browsers modernos bloqueiam áudio com som antes de uma interação explícita do usuário — o Audio Engine não pode depender de autoplay funcionar. A primeira experiência sonora precisa de uma ação clara do usuário ("Ativar ambiente sonoro" ou equivalente), nunca som tocando sozinho ao carregar a página.

## 11. UX do Player

Player **discreto**, nunca dominante — o dashboard não pode virar "um player de música com algumas funções de conhecimento" (ver §3, `UX_PRINCIPLES.md`). Conceitos a avaliar quando a implementação começar: mini-player compacto sempre visível (desktop: canto da tela, algo como `🎧 Deep Focus  ▶ ━━━━━  🔊`; mobile: ícone único que expande), painel expandido só sob demanda (bottom sheet no mobile, drawer/popover no desktop). Recomendação inicial: mini-player fixo discreto + expansão sob clique — não um player permanentemente grande na tela.

## 12. Acessibilidade

Nenhuma informação crítica pode depender só de som — "som de resposta correta" precisa **sempre** ter o equivalente visual/textual já existente ("Você acertou!", cor, ícone) como a fonte primária, nunca o áudio como único sinal. Controles de mute/volume acessíveis via teclado, com `aria-label`, navegáveis por leitor de tela. Avaliar respeito a preferências de acessibilidade do sistema operacional/navegador quando aplicável (ex: `prefers-reduced-motion` como sinal indireto de sensibilidade a estímulo, mesmo não sendo especificamente sobre áudio).

## 13. Experiência sensorial / "reduced audio"

Preferência dedicada (distinta de simplesmente "mute") pra reduzir a quantidade de estímulo — sons mais curtos, menos frequentes, sem efeitos sobrepostos — pensada pra usuários sensíveis a estímulo sensorial, não só pra quem quer silêncio total. Avaliar integração com sinais de acessibilidade do SO/navegador quando existir demanda real, não especular API específica agora.

## 14. Performance

Áudio não pode: bloquear o carregamento inicial da página, aumentar significativamente o bundle JS, causar travamento em dispositivos fracos. A avaliar na implementação (não decidido agora): lazy loading dos arquivos de áudio (nunca no bundle principal), preload seletivo só da faixa/categoria ativa, cache do navegador, formato comprimido adequado (provavelmente `.mp3`/`.ogg`/`.opus`, decisão técnica pra quando houver asset real).

## 15. Mobile e Web

**Mobile** (Android/iOS/web mobile — hoje o KnowRa não tem app nativo, só web responsivo): avaliar futuramente reprodução em segundo plano, interrupção por chamada telefônica, notificações, fones Bluetooth, controles do sistema operacional, ciclo de vida da aplicação (app minimizado). Nada disso é decidido agora — a arquitetura só precisa não impedir essa evolução depois.

**Web**: políticas de autoplay variam por navegador (já coberto em §10), compatibilidade de formato de áudio varia por navegador, Media Session API (integração com controles de mídia do SO) é candidata a avaliação futura, múltiplas abas abertas do KnowRa simultaneamente é um caso a decidir (tocar em todas? só na ativa?) — não decidido agora.

## 16. Segurança

A avaliar quando houver integração real (nada implementado agora): validação de MIME type e origem de qualquer arquivo de áudio antes de servir, proteção contra hotlinking/abuso de bandwidth se o KnowRa hospedar arquivos próprios, controle de acesso se houver upload futuro de áudio (hoje nem cogitado), URLs de CDN não manipuláveis pelo client. Mesma régua de segurança já aplicada a todo o resto do projeto (`SECURITY.md`) — nenhuma exceção especial pro áudio, nenhuma regra nova além das já existentes até virar implementação real.

## 17. Fallback

**Regra**: áudio nunca pode ser ponto único de falha do KnowRa. Se o áudio falhar (provider indisponível, arquivo removido, licença expirada, navegador bloqueia reprodução, usuário offline, conexão lenta), o resto da aplicação continua funcionando normalmente — o Progression Engine não sabe nem precisa saber que o áudio falhou.

## 18. Analytics

Métricas conceituais candidatas, todas **opcionais e agregadas**, nunca por-evento-identificável-por-pessoa sem necessidade: áudio ativado/desativado, música reproduzida, faixa selecionada, faixa concluída, música silenciada, SFX ativado/desativado, duração de sessão com áudio, categoria preferida, erros de reprodução. Regra: coletar só o necessário, respeitar LGPD — mesmo princípio já aplicado a `sessoes`/geolocalização (`SECURITY.md` §LGPD) — nenhuma métrica nova além do que já é preciso pra entender se a feature está sendo usada.

## 19. Custo (avaliação conceitual, sem número exato)

Fatores a considerar quando houver implementação real: storage (se catálogo próprio), bandwidth/CDN (proporcional a quantos usuários ouvem quanto tempo), custo de API se um provider externo for usado, cache reduz bandwidth repetido. Estimativa conceitual: um catálogo próprio pequeno (poucas faixas, poucos efeitos) tem custo de storage/CDN previsível e baixo comparado a qualquer provider de streaming por assinatura/uso — é por isso que a recomendação de MVP (§20) inclina pra catálogo próprio pequeno em vez de provider externo desde o dia 1.

## 20. Data Model (conceitual — nenhuma tabela criada)

| Conceito | Tipo provável | Notas |
|---|---|---|
| `AudioAsset` | tabela nova (futura) | Arquivo de áudio + metadados de origem/licença (ver §9). Provavelmente `musica` vs `sfx` como discriminador (coluna `tipo`, não tabelas separadas — mesmo item reaproveitável entre os dois catálogos é raro, mas o schema não precisa assumir isso agora). |
| `AudioCategory` | provavelmente enum/coluna, não tabela | "Deep Focus", "Lo-fi" etc. são poucas opções fixas — mesmo padrão já usado em `dificuldade` (`questoes`/`desafios`), não precisa de tabela própria a menos que o catálogo cresça muito. |
| `AudioProvider` | tabela nova (futura, só se/quando um provider externo real for integrado) | Mesmo papel de `QuestionProvider` (`DATA_MODEL.md`) — não criar antes de existir uma integração real. |
| `AudioLicense` | provavelmente colunas em `AudioAsset`, não tabela própria | Poucos campos, ligados 1:1 ao asset — value object, não entidade separada (mesmo raciocínio já usado pra `Answer`/`Evaluation` em `tentativas_questao`). |
| `AudioPlaylist` | avaliar se é necessário no MVP | Se as "categorias" já servem de agrupamento, uma playlist é redundante — só criar se houver curadoria manual real. |
| `UserAudioPreference` | provavelmente `jsonb` em `profiles` ou tabela `preferencias_audio` 1:1 com `profiles` | Ver §10 — decisão adiada pro momento da implementação. |
| `AudioEvent` | não é entidade de banco — é um evento em memória (Progression Engine → Audio Engine), não precisa de persistência própria a menos que analytics (§18) exija. | |

**Não assumir que todo conceito acima vira tabela** — mesmo princípio já registrado em `DATA_MODEL.md` pra Concursos/Rankings antes da Fase 7/8 existirem de verdade: a decisão real acontece com o schema na frente, não especulativamente aqui.

## 21. Provider Strategy — comparação

| | Catálogo próprio (Estratégia A) | Provider externo (Estratégia B) |
|---|---|---|
| **Vantagens** | Previsibilidade, controle total de licença, performance (sem dependência externa), independência de disponibilidade de terceiro | Catálogo maior sem esforço de curadoria, atualização de conteúdo sem trabalho do KnowRa |
| **Desvantagens** | Exige storage/CDN próprio, manutenção e curadoria de licenciamento manual | Dependência de disponibilidade externa, custo por uso/assinatura, mudanças de API do fornecedor fora do controle do KnowRa, licenciamento de terceiro exige a mesma validação rigorosa do §9 mesmo assim |

## 22. Recomendação de MVP

**Recomendo Estratégia A (catálogo próprio pequeno)** pro eventual MVP do Audio Engine, não um provider externo:

- Poucas faixas de música (o suficiente pra cobrir 2-3 categorias, não um catálogo extenso) e poucos SFX, todos com licença **verificada e documentada** antes de entrar (domínio público/CC0 checado manualmente, ou original produzido pro KnowRa — ver §21 Efeitos sonoros originais abaixo).
- Armazenamento simples (mesmo provider de storage já usado no projeto, se aplicável, ou CDN estático) — sem depender de API de terceiro pra funcionalidade básica funcionar.
- Justificativa técnica: um provider externo de música introduz exatamente o tipo de risco que o resto do projeto tem evitado deliberadamente (dependência de disponibilidade de terceiro, custo variável imprevisível, mudança de API fora do controle do KnowRa — mesmo raciocínio já aplicado à decisão de não integrar um `QuestionProvider` real na Fase 7 antes de precisar). Um catálogo pequeno e próprio é mais barato, mais previsível, e suficiente pro objetivo (imersão de fundo, não uma biblioteca musical).

**Efeitos sonoros originais** (não integração de terceiro) são a opção mais alinhada com identidade sonora própria (§3.6) e reduzem dependência de licenciamento de terceiros por completo pros SFX — candidato natural a produzir/encomendar em vez de buscar externamente.

## 23. Roadmap proposto (fora da numeração de Fases do produto — feature independente)

| Etapa | Conteúdo |
|---|---|
| **A — Foundation** | Este documento. Sem código. |
| **B — Audio Core** | Audio Context/Provider, Volume Manager, Preference Manager — infraestrutura mínima, sem catálogo de conteúdo real ainda. |
| **C — Music Catalog** | Catálogo próprio pequeno (§22), poucas categorias, licenciamento verificado. |
| **D — Gamification SFX** | Efeitos ligados a eventos de Progression Engine (§6). |
| **E — Contextual Audio** | Sugestão de faixa por contexto de tela (§_Áudio Contextual_ acima) — sempre configurável, nunca forçado. |
| **F — Mobile Audio** | Background audio, integração com controles do SO (§15). |
| **G — Advanced Personalization** | Preferências avançadas, possível recomendação de faixa por comportamento. |

Cada etapa exige aprovação explícita separada — nenhuma delas está aprovada pra implementação só por existir aqui (mesma regra de todo o roadmap do KnowRa, ver `ROADMAP.md`).

## 24. Riscos

- **Jurídico**: uso indevido de áudio sem licença compatível é o maior risco real deste domínio — mitigado pela regra dura do §9 (nunca assumir legalidade sem validar).
- **Técnico**: autoplay bloqueado, comportamento inconsistente entre navegadores/dispositivos, complexidade de *ducking*/crossfade se implementados mal.
- **Financeiro**: provider externo com custo variável e imprevisível — mitigado pela recomendação de catálogo próprio pequeno (§22).
- **UX**: áudio virar distração em vez de imersão, ou o player dominar a interface (§11) e desviar foco do Core Loop.
- **Performance**: aumento de bundle/bandwidth se assets não forem lazy-loaded corretamente (§14).
- **Dependência de terceiro**: se uma integração de provider externo for feita no futuro, disponibilidade e mudança de API ficam fora do controle do KnowRa — mitigado pela Provider Abstraction (§8).

## 25. Perguntas em aberto pro Product Owner

1. **Amizade/Social (Fase 9) e Audio Engine são prioridades concorrentes ou sequenciais?** Ambos estão em discovery, nenhum aprovado pra código ainda.
2. **Catálogo próprio vs. externo**: confirma a recomendação do §22, ou há preferência por integrar um provider desde já?
3. **Efeitos sonoros originais**: produzir/encomendar é uma opção real de orçamento, ou deve-se buscar apenas domínio público/CC0 verificado?
4. **Quando (se) a Etapa B (Audio Core) deve começar?** Este documento não recomenda início de implementação — só documenta pra quando for decidido.
5. **Existe uma identidade sonora de referência** (outro produto, artista, gênero) que ajude a calibrar "inteligente/moderno/imersivo/elegante" de forma mais concreta que a descrição textual?

## 26. Decisões

Decisões arquiteturais registradas em [DECISIONS.md](DECISIONS.md):

- **DEC-AUDIO-001** — Separação entre Music e SFX como canais independentes.
- **DEC-AUDIO-002** — Áudio é sempre opcional; nenhuma funcionalidade do KnowRa depende de reprodução de áudio.
- **DEC-AUDIO-003** — Provider Abstraction desde o desenho; nenhum acoplamento a um único fornecedor.
- **DEC-AUDIO-004** — Todo `AudioAsset` externo precisa de metadados de origem/licença validados antes de entrar no catálogo oficial.
- **DEC-AUDIO-005** — Recomendação de MVP: catálogo próprio pequeno, não provider externo (ver §22).
