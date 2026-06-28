# Aonde Tem — Registro de Riscos

> Lista viva de riscos, lacunas e melhorias a acompanhar. Complementa os docs de produto e specs.
> 🇬🇧 English version: [`RISKS.md`](./RISKS.md).
> **Legenda de status:** `prevenir-agora` (resolver no MVP) · `mitigando` (especificado/rastreado) · `aceito` (conhecido, mantido como aposta em aberto) · `observar` (monitorar pós-lançamento).

Vamos lançar deliberadamente com algumas **apostas estratégicas em aberto** (início a frio, incentivos).
Mas tudo que for **problema evitável de usabilidade ou qualidade de dados** — nomes bagunçados de itens,
preços errados, erros honestos — fechamos o máximo possível *agora*, porque define se o app é útil.

---

## 1. Qualidade de dados & usabilidade — **prevenir agora** (prioridade máxima)

Riscos do tipo "tornar realmente útil e amigável". Cada um está sendo desenhado nas specs.

| # | Risco / lacuna | Impacto | Mitigação (preventiva) | Rastreado em |
|---|---|---|---|---|
| R-01 | **Nomes bagunçados de itens** — "coca 2l" vs "Coca-Cola 2L" vs "refri" geram produtos duplicados e fazem a busca não achar dados reais. | Alto — mata a liquidez percebida | **Autocomplete a partir de produtos existentes** ao relatar e buscar (escolher, não redigitar); normalização agressiva (minúsculas, remover acentos/pontuação, unificar unidades); **busca fuzzy** (`pg_trgm`). "Você quis dizer…". | `product-moderation.spec`, `seek-map-search.spec` |
| R-02 | **Preços errados / absurdos** — erros de digitação ("R$0,01"), unidade errada, trolls. | Alto — destrói confiança na hora | **Entrada numérica validada** (máscara BRL, limites min/máx sensatos, > 0); **aviso suave de outlier** vs relatos recentes do mesmo produto; rotular como "preço relatado". | `report-discovery.spec` |
| R-03 | **Erros honestos / info errada** — qtd errada, lugar errado, percebeu depois. | Alto | **Passo de confirmação/resumo** antes de enviar; **editar/excluir o próprio relato recente**; autocorreção da comunidade **"ainda tem? / acabou?"**; frescura/expiração. | `report-discovery.spec`, `feedback-flags.spec` |
| R-04 | **Fragmentação de lugar** — mesma loja marcada 2x a 20 m → divide os dados. | Médio-Alto | **Sugerir e reutilizar lugares próximos existentes** (dentro de N m) antes de criar novo; confirmar precisão do pino/GPS. | `report-discovery.spec` |
| R-05 | **Busca não acha dados existentes** — só correspondência exata. | Alto — parece vazio sem estar | Busca fuzzy/trigram + sinônimos; "você quis dizer"; sugerir relatar quando realmente vazio. | `seek-map-search.spec` |
| R-06 | **Contribuição perdida com sinal ruim** — usuário na loja sem sinal. | Médio-Alto (público central!) | **Fila de escrita offline**: rascunhar um relato offline, sincronizar ao reconectar. | `report-discovery.spec`, `PERFORMANCE.md` |
| R-07 | **Precisão de quantidade é falsa** — usuários chutam contagens exatas. | Médio | Oferecer opção de **disponibilidade qualitativa** (muito / pouco / acabando) junto/no lugar de número exato. | `report-discovery.spec` |

## 2. Marketplace & liquidez — **apostas aceitas** (manter, monitorar, planejar à parte)

| # | Risco | Impacto | Postura / próximo passo | Status |
|---|---|---|---|---|
| R-10 | **Início a frio** — buscadores não têm valor até haver relatos suficientes. | Existencial | Precisa de **estratégia de seeding/go-to-market** (não é feature): um bairro, seeding manual, importar de encartes/dados abertos. Teste mais barato: rodar o ciclo num grupo de WhatsApp por 2 semanas antes de construir mais. | `aceito` |
| R-11 | **Motivação do lado da oferta** — por que alguém relataria (trabalho não pago)? | Existencial | Desenhar o **JTBD/incentivo do contribuidor** (reconhecimento "você ajudou N pessoas", reputação, sequências, 1 toque). | `aceito` |
| R-12 | **Retenção** — sem motivo para voltar entre necessidades. | Alto | Reavaliar **notificações/lista de interesse** ("avise quando X aparecer") como gancho central, não P2. | `observar` |

## 3. Confiança & abuso

| # | Risco | Impacto | Mitigação | Status |
|---|---|---|---|---|
| R-20 | **Manipulação de preço/disponibilidade** — loja forja preços baixos ou "esgotado" de rival. | Alto | Rate-limit por usuário/IP; checagem de outlier de preço (R-02); reputação depois; denúncias. | `mitigando` |
| R-21 | **Abuso de denúncia** — denúncia usada como arma. | Médio | Revisão do admin antes de remover; limiares ajustados; medir acurácia do denunciante depois. | `mitigando` |
| R-22 | **Carga operacional de moderação** — SLA de remoção em 24h exige humano. | Médio-Alto | Definir quem é admin; auto-ocultar por limiar; manter blocklist forte para reduzir entrada. | `observar` |

## 4. Segurança & jurídico

| # | Risco | Impacto | Mitigação | Status |
|---|---|---|---|---|
| R-30 | **PII em fotos** — rostos, placas, interiores de casas. | Alto | Remover EXIF/GPS; (depois) borrar/detectar; orientação no fluxo de foto; permitir denunciar fotos. | `mitigando` |
| R-31 | **Responsabilidade por preços atribuídos a usuários** — loja contesta preço errado. | Médio | Enquadrar como "preço relatado por usuário" + horário; **ToS / aviso**; correção fácil (R-03). | `aberto` |
| R-32 | **LGPD** — tratamento de e-mail + localização precisa. | Alto | Aviso de privacidade mínimo; guardar só o necessário; consentimento de localização; caminho de exclusão de dados. | `aberto` |

## 5. Operacional & medição

| # | Risco | Impacto | Mitigação | Status |
|---|---|---|---|---|
| R-40 | **Voando às cegas** — sem medir liquidez não dá para saber se o MVP funciona. | Alto | **Instrumentar desde o dia 1**: registrar toda busca + se retornou resultado recente; eventos do funil central. Antecipar analytics (antes de P2). | `prevenir-agora` |
| R-41 | **Sem controle de spam/rate no lançamento** — abuso inunda os dados. | Médio | Rate limiting básico + endurecimento de input nos endpoints de escrita. | `mitigando` |

---

## Como usamos isto

- Itens **prevenir-agora / qualidade de dados** viram **requisitos** nas specs e **itens de backlog** (cluster Salvaguardas de qualidade & UX).
- **apostas aceitas** ficam aqui e são revisitadas; não bloqueiam o build, mas guiam a estratégia.
- Revisar este registro a cada fronteira de fase; promover/rebaixar riscos conforme aprendemos. IDs são estáveis.
