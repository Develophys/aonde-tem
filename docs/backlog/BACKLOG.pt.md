# Aonde Tem — Backlog

> Status: **Rascunho v0.1** · Última atualização: 2026-06-27
> Fonte da verdade sobre *o que precisamos construir e qual o tamanho*. Derivado de
> [`PRODUTO.pt.md`](../PRODUTO.pt.md) e [`ROADMAP.md`](../../ROADMAP.md).
> Entidade central do produto = **Relato** (item / onde / quanto / quantos / frescura).
> 🇬🇧 English version: [`BACKLOG.en.md`](./BACKLOG.en.md).

---

## Como ler este backlog

**Status:** `Feito` · `Pronto` (refinado, pode começar) · `A fazer` (precisa refinar) · `Bloqueado` · `Em andamento`

**Prioridade:** `P0` essencial para o MVP · `P1` próximo passo · `P2` depois / projetar para

**Estimativa** — pontos de história (Fibonacci), com tamanho de camiseta e esforço aproximado para um
dev solo. Pontos são *tamanho relativo*, não prazo; calibre com a velocidade real após um ou dois sprints.

| Pontos | Tamanho | Esforço aprox. | Significado |
|---|---|---|---|
| 1 | XS | ~½ dia | Trivial, bem compreendido |
| 2 | S | ~1 dia | Pequeno, claro |
| 3 | M | ~1–2 dias | Moderado |
| 5 | L | ~3–4 dias | Grande; considere dividir |
| 8 | XL | ~1 semana | Muito grande; geralmente dividir |
| 13 | XXL | 1 semana+ | Grande demais — **precisa** ser quebrado antes de começar |

> As estimativas incluem implementação + testes + revisão básica, não spikes de pesquisa (esses são itens próprios).

---

## Resumo por fase (esforço restante)

| Fase | Foco | Pontos abertos (P0) | Pontos abertos (P0+P1) |
|---|---|---|---|
| **Fase 0 — Fundação** | Repositório roda de ponta a ponta | 4 | 11 |
| **Fase 1 — MVP** | ciclo relatar ↔ buscar | 31 | 49 |
| **Fase 2 — Utilizável** | contas, busca, confiança | 0 | 34 |
| **Fase 3 — Crescimento** | qualidade, lançamento, base de monetização | 0 | 29 |

> **Caminho crítico do MVP ≈ 35 pontos P0 abertos** (Fase 0 + Fase 1). A uma velocidade inicial de
> ~8–12 pontos/semana solo, são cerca de **4–6 semanas até um MVP funcional** — ajuste quando tiver
> a velocidade real.

---

## Visão geral dos épicos

| Épico | Nome | Fase |
|---|---|---|
| E0 | Fundação & DevEx | 0 |
| E1 | Domínio & Dados (modelo Relato + PostGIS) | 0–1 |
| E2 | API Backend (Relatos) | 1 |
| E3 | Mapas & Geolocalização | 1 |
| E4 | Frontend & PWA (UI relatar↔buscar) | 1 |
| E5 | Contas (login opcional) | 2 |
| E6 | Validação & confiança da comunidade | 2 |
| E7 | Busca & notificações | 2 |
| E8 | Qualidade (testes, CI, observabilidade) | 3 |
| E9 | Lançamento & crescimento | 3 |

---

## E0 — Fundação & DevEx

| ID | Item | Tipo | Pri | Est | Tam | Status | Depende |
|---|---|---|---|---|---|---|---|
| AT-001 | Iniciar monorepo pnpm + Turborepo | chore | P0 | 3 | M | ✅ Feito | — |
| AT-002 | `tsconfig.base.json` compartilhado + configs por pacote | chore | P0 | 1 | XS | ✅ Feito | — |
| AT-003 | Docker Compose: PostGIS + API + web | chore | P0 | 3 | M | ✅ Feito | — |
| AT-004 | `.env.example` + docs de setup local | chore | P0 | 1 | XS | ✅ Feito | — |
| AT-005 | Gerar `pnpm-lock.yaml`; verificar `pnpm install` limpo | chore | P0 | 2 | S | 🔜 Pronto | AT-001 |
| AT-006 | ESLint + Prettier + regra de fronteira de import (domínio não importa para fora) | chore | P1 | 3 | M | ✅ Feito | AT-002 |
| AT-007 | Husky + lint-staged + commitlint (Conventional Commits) | chore | P1 | 2 | S | A fazer | AT-006 |
| AT-008 | Repositório GitHub + proteção de branch + template de PR | chore | P1 | 2 | S | A fazer | — |
| AT-009 | Pipeline de CI: `turbo run lint typecheck test build` | chore | P1 | 3 | M | A fazer | AT-008 |

**Abertos: P0 = 2 · P1 = 7**

---

## E1 — Domínio & Dados (modelo Relato + PostGIS)

> O scaffold modelou um `Place` genérico. Evoluir para a entidade real do produto: **Relato (Report)**.

| ID | Item | Tipo | Pri | Est | Tam | Status | Depende |
|---|---|---|---|---|---|---|---|
| AT-010 | VO `Coordinates` + hierarquia de erros de domínio | feature | P0 | 3 | M | ✅ Feito | — |
| AT-011 | Ports: repositório / geocoding / logger | feature | P0 | 2 | S | ✅ Feito | — |
| AT-012 | Scaffold de migração Prisma + PostGIS (índice GiST) | chore | P0 | 3 | M | ✅ Feito | AT-003 |
| AT-013 | **Evoluir `Place` → entidade `Report`** (item, preço, quantidade, relator, createdAt) + invariantes | feature | P0 | 3 | M | 🔜 Pronto | AT-010 |
| AT-014 | Schema PostGIS de `Report` + migração (location, preço, qtd, expiresAt, GiST) | feature | P0 | 3 | M | A fazer | AT-012, AT-013 |
| AT-015 | Conectar `pnpm db:migrate` ao banco Docker; confirmar aplicação | chore | P0 | 2 | S | 🔜 Pronto | AT-003 |
| AT-016 | Regra de frescura/expiração no domínio (TTL por item, configurável) | feature | P0 | 2 | S | A fazer | AT-013 |
| AT-017 | Script de seed: Relatos de exemplo numa área de teste | chore | P1 | 2 | S | A fazer | AT-014 |
| AT-018 | Modelo de categoria de item (texto livre + categoria opcional) | feature | P1 | 2 | S | A fazer | AT-013 |

**Abertos: P0 = 10 · P1 = 4**

---

## E2 — API Backend (Relatos)

| ID | Item | Tipo | Pri | Est | Tam | Status | Depende |
|---|---|---|---|---|---|---|---|
| AT-020 | Contratos Zod do Relato (criar / resposta / consulta por perto) | feature | P0 | 2 | S | 🔶 Parcial | AT-013 |
| AT-021 | `POST /reports` — criar (sem login) + validação | feature | P0 | 3 | M | A fazer | AT-014, AT-020 |
| AT-022 | `GET /reports/nearby` — consulta por raio no PostGIS, ordenada por distância | feature | P0 | 3 | M | A fazer | AT-014, AT-020 |
| AT-023 | Busca/filtro por item nos resultados próximos (texto/categoria) | feature | P0 | 3 | M | A fazer | AT-022 |
| AT-024 | Excluir/rebaixar Relatos expirados nas consultas | feature | P0 | 2 | S | A fazer | AT-016, AT-022 |
| AT-025 | Filtro global de exceções → envelope de erro | chore | P0 | 2 | S | ✅ Feito | — |
| AT-026 | Logging com pino + IDs de correlação de requisição | chore | P0 | 2 | S | ✅ Feito | — |
| AT-027 | `GET /reports/:id` detalhe | feature | P1 | 1 | XS | A fazer | AT-022 |
| AT-028 | Paginação/limite + distância na resposta | feature | P1 | 2 | S | A fazer | AT-022 |
| AT-029 | Rate limiting + endurecimento de input (anti-spam) | chore | P1 | 3 | M | A fazer | AT-021 |
| AT-030 | Endpoint `/health` | chore | P1 | 1 | XS | A fazer | — |

**Abertos: P0 = 13 · P1 = 7**

---

## E3 — Mapas & Geolocalização

| ID | Item | Tipo | Pri | Est | Tam | Status | Depende |
|---|---|---|---|---|---|---|---|
| AT-040 | Conta MapTiler + `VITE_MAP_KEY`; mapa renderiza | chore | P0 | 1 | XS | A fazer | AT-004 |
| AT-041 | `MapView` MapLibre com marcador do usuário | feature | P0 | 3 | M | 🔶 Parcial | AT-040 |
| AT-042 | Hook de geolocalização + tratamento de permissão negada | feature | P0 | 2 | S | 🔶 Parcial | — |
| AT-043 | Renderizar marcadores de Relatos próximos da API | feature | P0 | 3 | M | A fazer | AT-022, AT-041 |
| AT-044 | Recentralizar + modo seguir-usuário | feature | P1 | 2 | S | A fazer | AT-042 |
| AT-045 | Controle de raio (slider) ligado à consulta | feature | P1 | 2 | S | A fazer | AT-043 |
| AT-046 | Agrupamento de marcadores (clustering) em áreas densas | feature | P1 | 3 | M | A fazer | AT-043 |
| AT-047 | Spike: plano de migração para Protomaps/PMTiles auto-hospedado | spike | P2 | 2 | S | A fazer | — |

**Abertos: P0 = 9 · P1 = 7**

---

## E4 — Frontend & PWA (UI relatar ↔ buscar)

| ID | Item | Tipo | Pri | Est | Tam | Status | Depende |
|---|---|---|---|---|---|---|---|
| AT-050 | Setup React + Vite + Tailwind v4 | chore | P0 | 2 | S | ✅ Feito | — |
| AT-051 | TanStack Query + wrapper tipado `http`/`ApiError` | chore | P0 | 2 | S | ✅ Feito | — |
| AT-052 | Store Zustand com slices (UI + estado do mapa) | chore | P0 | 2 | S | ✅ Feito | — |
| AT-053 | **Fluxo de busca**: pesquisar item → lista/mapa de Relatos próximos com preço, qtd, idade | feature | P0 | 5 | L | A fazer | AT-023, AT-043 |
| AT-054 | **Fluxo de relato**: formulário rápido (item, preço, qtd, local) → enviar | feature | P0 | 5 | L | A fazer | AT-021, AT-042 |
| AT-055 | Detalhe/popup do Relato (handoff para app de mapas) | feature | P0 | 3 | M | A fazer | AT-027 |
| AT-056 | Manifest PWA + service worker (instalável, shell offline) | chore | P0 | 2 | S | 🔶 Parcial | AT-050 |
| AT-057 | Ícones PWA reais (192/512/maskable) | chore | P0 | 1 | XS | A fazer | AT-056 |
| AT-058 | Shell do app: estados de carregando / erro / vazio | feature | P1 | 3 | M | A fazer | AT-053 |
| AT-059 | Cache de tiles no service worker (offline + menos requisições cobradas) | chore | P1 | 2 | S | A fazer | AT-056 |
| AT-060 | Auditoria Lighthouse PWA passando | chore | P1 | 2 | S | A fazer | AT-056 |

**Abertos: P0 = 16 · P1 = 7**

---

## E5 — Contas (login opcional)  ·  *Fase 2*

| ID | Item | Tipo | Pri | Est | Tam | Status | Depende |
|---|---|---|---|---|---|---|---|
| AT-070 | Spike: abordagem de auth econômica (auto-hospedar vs free tier) | spike | P1 | 2 | S | A fazer | — |
| AT-071 | Entidade `User` + regras de domínio | feature | P1 | 2 | S | A fazer | AT-070 |
| AT-072 | Cadastro / login / logout | feature | P1 | 5 | L | A fazer | AT-071 |
| AT-073 | Atribuir Relatos à conta opcional (anônimo ainda permitido) | feature | P1 | 3 | M | A fazer | AT-021, AT-072 |
| AT-074 | Perfil + itens salvos/favoritos | feature | P2 | 3 | M | A fazer | AT-072 |

**Abertos: P1 = 12 · P2 = 3**

---

## E6 — Validação & confiança da comunidade  ·  *Fase 2–3*

| ID | Item | Tipo | Pri | Est | Tam | Status | Depende |
|---|---|---|---|---|---|---|---|
| AT-080 | Confirmar "ainda tem" / marcar "acabou" num Relato | feature | P1 | 3 | M | A fazer | AT-022 |
| AT-081 | Decaimento de frescura na UI (apagar Relatos antigos) | feature | P1 | 2 | S | A fazer | AT-016, AT-053 |
| AT-082 | Denunciar abuso + fila básica de moderação | feature | P1 | 3 | M | A fazer | AT-021 |
| AT-083 | Reputação / score de confiança do relator | feature | P2 | 5 | L | A fazer | AT-073, AT-080 |
| AT-084 | Avaliações/comentários num Relato ou local | feature | P2 | 5 | L | A fazer | AT-072 |

**Abertos: P1 = 8 · P2 = 10**

---

## E7 — Busca & notificações  ·  *Fase 2*

| ID | Item | Tipo | Pri | Est | Tam | Status | Depende |
|---|---|---|---|---|---|---|---|
| AT-090 | Conta LocationIQ free tier / plano Nominatim | spike | P1 | 1 | XS | A fazer | — |
| AT-091 | Adaptador `GeocodingService` (busca + reversa) | feature | P1 | 3 | M | A fazer | AT-090, AT-011 |
| AT-092 | Busca de endereço/item com autocomplete debounced | feature | P1 | 3 | M | A fazer | AT-023 |
| AT-093 | Cache de geocoding no PostGIS (economiza cota) | chore | P1 | 2 | S | A fazer | AT-091 |
| AT-094 | Lista de interesse: "avise quando X aparecer por perto" + push | feature | P2 | 5 | L | A fazer | AT-073 |
| AT-095 | "Buscar nesta área" ao mover o mapa | feature | P2 | 2 | S | A fazer | AT-043 |

**Abertos: P1 = 9 · P2 = 7**

---

## E8 — Qualidade (testes, CI, observabilidade)  ·  *começar cedo*

| ID | Item | Tipo | Pri | Est | Tam | Status | Depende |
|---|---|---|---|---|---|---|---|
| AT-100 | Testes unitários de domínio (Jest) | chore | P0 | 2 | S | 🔶 Parcial | AT-013 |
| AT-101 | Testes de integração da API (Supertest + PostGIS de teste) | chore | P1 | 3 | M | A fazer | AT-022 |
| AT-102 | Teste E2E de fumaça (Playwright): abrir → ver Relatos | chore | P1 | 3 | M | A fazer | AT-053 |
| AT-103 | Gate de CI bloqueia merge com checks falhando | chore | P1 | 1 | XS | A fazer | AT-009 |
| AT-117 | Detector de slop do Impeccable no CI (`npx impeccable detect apps/web/src/`) | chore | P1 | 2 | S | A fazer | AT-009 |
| AT-104 | Rastreamento de erros (Sentry free tier) web + API | chore | P2 | 2 | S | A fazer | — |
| AT-105 | Monitoramento de uptime na API publicada | chore | P2 | 1 | XS | A fazer | AT-110 |

**Abertos: P0 = 2 (parcial) · P1 = 9 · P2 = 3**

---

## E9 — Lançamento & crescimento  ·  *Fase 3*

| ID | Item | Tipo | Pri | Est | Tam | Status | Depende |
|---|---|---|---|---|---|---|---|
| AT-110 | Spike: hospedagem econômica (web / API / Postgres+PostGIS) | spike | P1 | 2 | S | A fazer | — |
| AT-111 | Pipeline de deploy de produção (build, migrar, publicar) | chore | P1 | 5 | L | A fazer | AT-110 |
| AT-112 | Domínio + HTTPS (obrigatório para PWA) | chore | P1 | 2 | S | A fazer | AT-111 |
| AT-113 | Política de privacidade + texto de permissão de localização (LGPD) | chore | P1 | 2 | S | A fazer | — |
| AT-114 | Analytics de produto (PostHog free tier) no funil central | chore | P2 | 3 | M | A fazer | AT-111 |
| AT-115 | Prompt de instalação do app + onboarding | feature | P2 | 3 | M | A fazer | AT-056 |
| AT-116 | Formulário de feedback no app | feature | P2 | 2 | S | A fazer | — |

**Abertos: P1 = 11 · P2 = 8**

---

## Candidato a Sprint 1 (fundação → primeira fatia vertical)

Um primeiro sprint focado em colocar de pé o **ciclo relatar↔buscar**. ~**18 pontos** — ajuste à sua capacidade real.

| ID | Item | Pri | Est |
|---|---|---|---|
| AT-005 | Lockfile + instalação limpa | P0 | 2 |
| AT-015 | `db:migrate` funciona no banco Docker | P0 | 2 |
| AT-013 | `Place` → entidade `Report` | P0 | 3 |
| AT-014 | Schema PostGIS + migração de Report | P0 | 3 |
| AT-021 | `POST /reports` | P0 | 3 |
| AT-022 | `GET /reports/nearby` | P0 | 3 |
| AT-040 | Chave MapTiler + mapa renderiza | P0 | 1 |
| AT-043 | Renderizar marcadores de Relato da API | P0 | 3 |

**Objetivo do sprint:** *"Um usuário consegue publicar um Relato e outro usuário o vê no mapa por
perto."* Essa única fatia prova toda a tese do produto de ponta a ponta.

---

## Usando & mantendo este backlog

- **Refinamento:** mova `A fazer` → `Pronto` quando o item tiver critérios de aceite claros e nenhuma incógnita bloqueante.
- **Divisão:** qualquer item ≥ 8 pontos deve ser quebrado em itens menores antes de um sprint.
- **Re-estime** após cada sprint — sua velocidade real substitui as estimativas aproximadas daqui.
- **A fonte da verdade flui de cima:** Documento de produto → épicos (ROADMAP) → itens do backlog (aqui) → sprint.
- IDs são estáveis; não renumere. Novos itens continuam a partir de AT-117+.

> Quer isto como planilha (ordenar/somar) ou enviado para um tracker? Veja as opções em
> [`ROADMAP.md` §5](../../ROADMAP.md). Também posso gerar um CSV a partir desta tabela.
