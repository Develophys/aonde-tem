# Spec — Lista de Interesse & Notificações

> Status: **Rascunho v0.1** · Responsável: Mauricio · Última atualização: 2026-06-27
> Spec de feature / PRD do **Épico E11**, derivada de [`PRODUTO.pt.md`](../PRODUTO.pt.md) (§8 histórias, §9
> P1 *"Avise-me quando X aparecer por perto"*) e [`ROADMAP.md`](../ROADMAP.md) (Fase 2–3, E11).
> Apoia-se no modelo de dados compartilhado do MVP em [`MVP-OVERVIEW.md`](./MVP-OVERVIEW.md) §5 (a entidade
> `Watchlist` lá adiada) e **depende fortemente** do evento de criar/confirmar `Discovery` de
> [`report-discovery.spec.md`](./report-discovery.spec.md) e do login de [`auth.spec.md`](./auth.spec.md).
> A versão em inglês está em [`NOTIFICATIONS.en.md`](./NOTIFICATIONS.en.md) e deve ser mantida em sincronia.
>
> **Terminologia:** o conceito de produto é o "Relato"; a entidade do modelo de dados do MVP é
> **`Discovery`** (`MVP-OVERVIEW.md` §5 — linhagem: Report → Sighting → Discovery). As seções técnicas
> abaixo referenciam `Discovery`.

---

## 1. Resumo

Permitir que um usuário logado **monitore um item específico** e seja **avisado** quando a comunidade
publicar um Relato recente que corresponda — seja porque o item acabou de aparecer **por perto**, seja
porque alguém o relatou **a um preço igual ou abaixo do que o usuário definiu**. Os avisos chegam por
**Web Push** (funciona no PWA instalado, mesmo com o app fechado) e ficam em uma **caixa de avisos dentro
do app**. Monitorar e ser avisado são totalmente **opcionais e reversíveis** — o usuário pode pausar ou
excluir qualquer monitoramento, desligar o canal de push e revogar a permissão de push a qualquer momento.
Todos os dados de localização e contato são tratados sob a **LGPD**.

Isso fecha o ciclo para a persona do Buscador: em vez de reabrir o app repetidamente para checar se um
item apareceu, o item encontra *ele*.

---

## 2. O problema

Hoje, um Buscador que não encontra um item tem só uma opção: voltar depois e pesquisar de novo. O valor
central do produto — *"não perca a viagem"* — quebra para itens que não estão disponíveis **agora**, porque
não há como ser avisado **quando** eles ficarem disponíveis. Relatos são sensíveis ao tempo e perdem a
validade, então a janela para agir sobre um avistamento recente é curta; um Buscador que não está olhando o
mapa nessa janela perde tudo. O conhecimento ("tem em estoque a R$X perto de você") existe por algumas horas
e depois evapora sem ser visto. Sem um mecanismo de "avise-me", perdemos o reengajamento que transforma uma
busca isolada em um hábito recorrente, e deixamos demanda real sem atendimento.

---

## 3. Objetivos

- **O1 — Reengajamento:** um monitoramento traz o usuário de volta de forma confiável. Meta: ≥ 35% das
  notificações push enviadas resultam no usuário abrindo o app em até 24h (taxa de notificação → abertura).
- **O2 — Utilidade da correspondência:** os avisos representam avistamentos reais e acionáveis. Meta: ≥ 70%
  dos avisos entregues são de Relatos ainda considerados *recentes* (não expirados) no momento da entrega.
- **O3 — Adoção do ciclo:** monitorar vira comportamento normal do Buscador. Meta: ≥ 20% dos usuários logados
  criam pelo menos um monitoramento no primeiro mês.
- **O4 — Confiança / pouca irritação:** notificações ajudam em vez de incomodar. Meta: exclusão de
  monitoramento por excesso de avisos e revogação de permissão de push ficam, cada uma, abaixo de 10% dos
  criadores de monitoramento por mês.
- **O5 — Latência:** um Relato correspondente chega ao usuário rápido o suficiente para agir. Meta: tempo
  mediano entre a criação do Relato e a entrega da notificação abaixo de 60 segundos.

---

## 4. Não-objetivos (explicitamente fora do escopo da v1)

- **Sem canal de e-mail ou SMS.** A v1 é só Web Push + caixa de avisos no app. E-mail é um provável próximo
  passo (P2), mas adiciona entregabilidade, templates e superfície de consentimento que não precisamos para
  provar o conceito. *(Adiado, não rejeitado.)*
- **Sem monitoramentos anônimos / só por dispositivo.** Monitorar exige conta (ver §6). Relatar de forma
  anônima continua igual; só *monitorar* precisa de identidade. *(Mantém o modelo de consentimento e
  armazenamento limpo para a LGPD.)*
- **Sem gatilhos de "qualquer relato em qualquer lugar" ou "voltou a ter" na v1.** Apenas *por perto* e
  *preço igual ou abaixo da meta*. Outros gatilhos foram considerados e adiados. *(Evita sobrecarga de avisos
  antes de calibrar a qualidade do sinal.)*
- **Sem resumos ricos/agendados ou "resumo diário" por e-mail.** Os avisos são orientados a eventos, quase em
  tempo real. *(Resumo é uma iniciativa separada.)*
- **Sem monitoramentos por categoria** (ex.: "qualquer item de farmácia"). Monitoramentos são de um item.
  *(A modelagem de categorias está imatura; revisar com E7.)*
- **Sem ações dentro da notificação** além de "abrir" (sem responder, sem "reservar" em um toque). *(Manter o
  payload e a superfície mínimos primeiro.)*

---

## 5. Personas & histórias de usuário

Persona principal: **o Buscador** (logado). Secundária: **o Relator**, cujo post *dispara* os avisos dos
outros (sem exigir comportamento novo dele).

### Criar & gerenciar um monitoramento
- Como Buscador, quero tocar em "Avise-me" em um item que pesquisei para ser avisado quando ele aparecer, em
  vez de ficar checando o app.
- Como Buscador, quero definir a **área** do monitoramento (usar minha localização atual + um raio) para só
  ouvir sobre avistamentos que eu realmente consiga alcançar.
- Como Buscador, quero definir um **preço máximo** para só ser avisado quando valer a viagem.
- Como Buscador, quero combinar os dois ("até 3 km **e** por até R$ 5,00") para que os avisos correspondam ao
  que de fato me importa.
- Como Buscador, quero ver todos os meus monitoramentos ativos em um só lugar para gerenciá-los.
- Como Buscador, quero **pausar** ou **excluir** um monitoramento para parar os avisos sem perder minha conta.

### Receber um aviso
- Como Buscador, quero uma notificação push quando um Relato correspondente for publicado para ficar sabendo
  mesmo com o app fechado.
- Como Buscador, quero que tocar na notificação abra o Relato correspondente no mapa para eu agir em um passo.
- Como Buscador, quero que todo aviso também apareça na caixa de avisos do app para encontrá-lo de novo caso
  eu tenha dispensado o push.
- Como Buscador, quero ver quais avisos já li para fazer a triagem.

### Consentimento & controle (LGPD)
- Como usuário, quero conceder explicitamente a permissão de notificação, com uma explicação clara do porquê,
  para entender com o que estou concordando.
- Como usuário, quero um único **interruptor de push (liga/desliga)** para silenciar todas as interrupções de
  uma vez, mantendo ainda o registro dos avistamentos na caixa de avisos do app.
- Como usuário, quero revogar a permissão de push e que o app respeite isso, para nunca mais ser avisado
  depois de optar por sair.
- Como usuário, quero que minhas áreas de monitoramento (que carregam minha localização) sejam excluíveis para
  controlar minha pegada de localização.

### Estados de borda / vazio / erro
- Como usuário com notificações bloqueadas no nível do SO/navegador, quero que o app me avise com clareza e
  ainda mantenha meus avisos na caixa do app, para a feature degradar com elegância.
- Como Buscador, quero ser avisado se já tenho um monitoramento para esse item, para não criar duplicatas.
- Como Buscador que criou um monitoramento mas ainda não teve correspondência, quero que a lista mostre um
  estado claro de "monitorando — nenhum avistamento ainda", para eu saber que está funcionando.

---

## 6. Requisitos

### Essenciais — P0 (o ciclo monitorar ↔ avisar)

**P0-1 · Criar um monitoramento (conta obrigatória).**
Um usuário logado pode criar um monitoramento de um item específico com: o item, uma **área** (centro +
raio) e um **preço máximo** opcional. A área está sempre definida — o raio **tem padrão de 2 km** (a pé /
trajeto curto, combinando com o espírito hiperlocal de "não perca a viagem") e é ajustável por um controle
deslizante. O preço máximo é opcional: um monitoramento é uma declaração de *intenção*, então um usuário que
só quer saber se um item está por perto "a qualquer preço" (ex.: um medicamento escasso) não pode ser
obrigado a inventar um número. O volume de avisos **não** é controlado restringindo o monitoramento — é
tratado na camada de entrega (ver P0-8, agrupamento).
- *Dado* que estou logado e vendo um item, *quando* salvo com o raio padrão (ou ajustado) e um preço máximo
  opcional, *então* um monitoramento é criado e aparece na minha lista como "ativo".
- *Dado* que não mexo no campo de preço, *então* o monitoramento é criado como "por perto" agnóstico a preço
  (sem erro de validação).
- *Dado* que já tenho um monitoramento para esse item, *quando* tento criar outro, *então* sou direcionado a
  editar o existente em vez de duplicar.

**P0-2 · Motor de correspondência.**
Quando um Relato é criado (ou confirmado como "ainda tem"), o sistema avalia os monitoramentos ativos e gera
uma correspondência quando **todas as condições definidas valem**: a localização do Relato está dentro do raio
do monitoramento em relação ao seu centro **E** o preço do Relato ≤ preço máximo do monitoramento (preço só é
checado se definido). Apenas Relatos **recentes** (não expirados) podem gerar correspondência. Uma
correspondência é candidata à entrega, que então é agrupada (ver P0-8) — o motor não envia direto. Observação:
como os monitoramentos são por item e o P0-1 proíbe um segundo monitoramento do mesmo item, um único Relato
pode corresponder a **no máximo um** dos monitoramentos de um usuário na v1 (a deduplicação entre
monitoramentos é, portanto, um não-problema; ver §10).
- *Dado* um monitoramento ativo (raio 2 km, preço máx. R$ 5,00), *quando* um Relato recente desse item é
  publicado a 1,5 km por R$ 4,50, *então* exatamente uma correspondência é gerada.
- *Dado* o mesmo monitoramento, *quando* um Relato é publicado a R$ 6,00 (acima do orçamento) ou a 6 km (fora
  da área), *então* nenhuma correspondência é gerada.
- *Dado* um Relato correspondente, *quando* o mesmo Relato é depois confirmado como "ainda tem", *então* o
  usuário **não** é avisado de novo pelo mesmo Relato (deduplicação por monitoramento + relato).

**P0-3 · Entrega por Web Push.**
Um monitoramento correspondido envia uma notificação Web Push aos dispositivos inscritos do usuário. A
notificação mostra o item, o preço e a distância/área aproximada; tocar nela leva direto ao Relato
correspondente no mapa.
- *Dado* que tenho push ativo e ocorre uma correspondência, *quando* o aviso dispara, *então* recebo um push
  dentro da meta de latência O5, mesmo com o app fechado.
- *Dado* que toco na notificação, *então* o app abre focado nesse Relato.

**P0-4 · Caixa de avisos no app.**
Todo aviso também é persistido em uma caixa de avisos no app, mostrando item, preço, localização/distância, a
condição que disparou, horário e estado lido/não lido. Essa é a fonte da verdade mesmo se o push falhar ou
estiver bloqueado.
- *Dado* que um aviso foi gerado, *quando* abro a caixa, *então* o vejo com estilo de não lido; *quando* o
  abro, *então* ele leva ao Relato e é marcado como lido.

**P0-5 · Fluxo de permissão & consentimento.**
O app pede a permissão de Web Push **no contexto** (no momento em que o usuário cria o primeiro monitoramento
ou ativa o push explicitamente), com uma justificativa em linguagem simples, nunca no primeiro carregamento.
Recusar é respeitado e recuperável depois.
- *Dado* que crio meu primeiro monitoramento, *quando* o app precisa da permissão de push, *então* vejo uma
  tela de justificativa antes do prompt do navegador, e recusar ainda cria o monitoramento (os avisos vão só
  para a caixa no app).

**P0-6 · Controles de ligar/desligar.**
Em vez de um único interruptor ambíguo de "notificações", o controle é dividido nos dois conceitos distintos —
*interrupção* vs. *correspondência* — dando uma hierarquia limpa e honesta que espelha como a permissão do
navegador já funciona:
- um **interruptor do canal de push** (governa só o canal interruptivo de push — não os dados, não a caixa);
- **pausar/retomar** por monitoramento (governa se um monitoramento corresponde ou não);
- **excluir** por monitoramento (remove o monitoramento e seus dados).

A caixa de avisos sempre reflete os monitoramentos ativos; é um registro passivo, nunca uma interrupção, então
não é gated pelo interruptor de push. Isso dissolve a ambiguidade do "desligado mas ainda coletando meus
dados", porque a coleta está atrelada a um monitoramento que o usuário controla explicitamente.
- *Dado* que desligo o interruptor de push, *quando* ocorre uma correspondência, *então* nenhum push é
  enviado, mas o monitoramento ainda corresponde e o aviso ainda aparece na minha caixa; religar o push retoma
  os pushes futuros com meu histórico intacto.
- *Dado* que pauso um monitoramento, *quando* um Relato correspondente é publicado, *então* nenhuma
  correspondência, push ou entrada na caixa é gerada; retomar faz voltar a corresponder a Relatos futuros.
- *Dado* que excluo um monitoramento, *então* ele para de corresponder na hora e some da minha lista.

> Risco de UX: o usuário precisa entender que caixa ≠ push. Isso é um problema de copy/onboarding — o rótulo
> do interruptor e a justificativa de primeiro uso devem deixar claro que desligar o push ainda mantém um
> registro no app.

**P0-7 · Conformidade com a LGPD para dados de monitoramento & inscrição.**
Monitoramentos armazenam localização (centro da área) e as inscrições de push armazenam endpoints de
dispositivo — ambos são dados pessoais. A feature deve: captar consentimento explícito para notificações,
guardar a base legal e o horário, permitir ao usuário **ver e excluir** seus monitoramentos e dispositivos de
push registrados, e expurgar as inscrições de push na revogação da permissão ou no logout. A retenção de dados
e o texto da justificativa alinham-se ao risco R3 de privacidade de localização / LGPD em
[`PRODUTO.pt.md`](../PRODUTO.pt.md) §12.
- *Dado* que revogo a permissão de push (no app ou no navegador), *então* a inscrição correspondente é
  excluída no servidor e nenhum push é mais tentado para ela.
- *Dado* que excluo minha conta, *então* meus monitoramentos e inscrições de push são excluídos.

**P0-8 · Entrega agrupada (a primitiva central de entrega).**
O volume de avisos é resolvido em **um** lugar — a camada de entrega — não restringindo as definições do
monitoramento nem aparafusando um limitador depois. Quando correspondências de um monitoramento chegam, a
entrega segura uma curta **janela de agrupamento** (padrão ~10–15 min) e colapsa tudo nela em um **único** push
por monitoramento (ex.: *"3 avistamentos de arroz perto de você, a partir de R$ 4,50"*), escrevendo ainda cada
avistamento individual na caixa. Esse único mecanismo absorve a enxurrada dentro de um monitoramento (muitos
Relatos recentes do mesmo item num intervalo curto), torna desnecessários um teto de preço obrigatório e um
raio apertado, e é uma UX estritamente melhor do que várias vibrações em sequência.
- *Dado* um monitoramento e 4 Relatos recentes correspondentes publicados dentro da janela, *quando* a janela
  fecha, *então* recebo **um** push resumindo-os, e a caixa contém **4** entradas individuais.
- *Dado* uma única correspondência numa janela, *então* a entrega é um push normal de item único (sem atraso
  artificial além do fechamento natural da janela / descarga imediata da primeira correspondência — ver P6).
- *Dado* que o interruptor de push está desligado, *então* o agrupamento ainda escreve as entradas na caixa,
  mas não envia push.

### Importantes — P1 (próximos passos)

- **Horário de silêncio:** janela definida pelo usuário durante a qual os pushes ficam retidos (e
  opcionalmente entregues como um resumo único quando a janela termina); a caixa no app continua atualizando
  em silêncio.
- **Atalho de "monitorar" no mapa/busca:** um botão de sino direto nos resultados de item, para criar um
  monitoramento em um toque a partir de uma busca.
- **Editar um monitoramento** (mudar raio/preço) sem excluir e recriar.
- **Badge de não lidos** no ícone de notificação do app, refletindo a contagem de não lidos da caixa.

### Desejáveis / futuro — P2 (projetar para, mas não construir ainda)

- **Canal de e-mail** como método de entrega adicional, com consentimento separado.
- **Gatilho "voltou a ter" / reconfirmação** de um Relato monitorado específico.
- **Monitoramentos por categoria ou palavra-chave** (depende da taxonomia de itens do E7).
- **Raio inteligente** ("perto da minha rota" / várias áreas salvas como casa + trabalho).
- **Modo resumo** (resumo diário/semanal em vez de tempo real).

> **Nota de "projetar para":** modelar canais como um conjunto extensível (push, no app, futuro e-mail) e
> gatilhos como condições tipadas (`nearby`, `price_below`, futuros `restock`, `any`) desde o dia um, para que
> as adições P2 não exijam remodelar o schema.

---

## 7. Fluxo da experiência (visão geral)

1. **Descobrir → monitorar.** O Buscador pesquisa um item, não encontra Relatos recentes suficientes, toca em
   **"Avise-me"**.
2. **Configurar.** Uma folha permite definir a **área** (localização atual + controle de raio, padrão 2 km) e,
   opcionalmente, um **preço máximo**. Salvar.
3. **Consentimento (primeira vez).** Justificativa → prompt de push do navegador. Recusar ainda salva o
   monitoramento (só caixa).
4. **Aguardar.** O monitoramento aparece na lista como "monitorando — nenhum avistamento ainda".
5. **Correspondência.** Um Relator publica um Relato recente, dentro do orçamento e da área → o motor dispara →
   a correspondência entra na janela de agrupamento.
6. **Aviso.** A janela fecha → **um** Web Push chega (app fechado ou aberto) resumindo o(s) avistamento(s) **e**
   cada um ganha uma entrada na caixa.
7. **Agir.** Tocar → o Relato abre no mapa → o Buscador decide ir (passando para o app de mapas dele, conforme
   o não-objetivo de "sem navegação" do produto).
8. **Gerenciar.** A qualquer momento: pausar, editar (P1), excluir um monitoramento, ou desligar o
   **interruptor de push** (a caixa continua registrando).

---

## 8. Métricas de sucesso

**Antecedentes (dias–semanas)**
- Monitoramentos criados por usuário logado; % de usuários logados com ≥ 1 monitoramento ativo (O3).
- Taxa de notificação → abertura do app em até 24h (O1).
- Latência de entrega p50/p95 (O5).
- Taxa de opt-in de push no prompt de consentimento; taxa de revogação da permissão de push.

**Consequentes (semanas–meses)**
- Retenção em 7 / 30 dias de criadores de monitoramento vs. não-criadores (monitorar eleva a retenção?).
- Fração de avisos entregues que estavam "recentes" na entrega (O2).
- Exclusões de monitoramento atribuídas ao volume de avisos; taxa de interruptor de push desligado (O4).
- Repetição de criação de monitoramento (quem recebe um aviso útil cria mais monitoramentos?).

> Medição: instrumentar criar/pausar/excluir monitoramento, conceder/recusar/revogar permissão,
> enviar/entregar/abrir push, e abrir/ler a caixa. Avaliar em 1 semana, 1 mês e 1 trimestre pós-lançamento
> (PostHog, conforme E9).

---

## 9. Considerações técnicas

São restrições e notas para o eventual ADR / desenho de sistema — não um desenho final.

- **Modelo de dados (novo):** uma entidade `Watch` (dono, **`productId`** → Product, `center`
  `geography(Point)` + `radiusM` (padrão 2 km), `maxPriceCents` opcional, status, timestamps) e uma entidade
  `PushSubscription` (dono, endpoint, chaves, userAgent, metadados de consentimento, createdAt). Um registro
  `Notification` (caixa) por correspondência (dono, ref. do monitoramento, **`discoveryId`**, canal, readAt).
  Ligar/desligar push é uma preferência por usuário, não por monitoramento. Isso concretiza a entidade
  `Watchlist` adiada em `MVP-OVERVIEW.md` §5. A entidade correspondida é o **`Discovery`** (productId → Product,
  placeId → Place, `price`, `quantity`, `expiresAt`) lá definido — esta spec **depende da existência de
  Discoveries** e de um evento de domínio quando um Discovery é criado/confirmado (de
  [`report-discovery.spec.md`](./report-discovery.spec.md)).
- **Correspondência:** reutilizar PostGIS (`ST_DWithin` em `geography`) como `find-nearby-places`, mas
  invertido — dado o ponto do Place de um novo Discovery e o `productId`, achar os monitoramentos daquele
  produto cujo `center` está dentro de `radiusM` e cujo `maxPriceCents` ≥ `price` do Discovery. Frescura = o
  Discovery não passou de `expiresAt`. Indexar os centros com GiST. Avaliar no evento de domínio de discovery
  criado/confirmado.
- **Encaixe na Clean Architecture:** a lógica de correspondência mora em `packages/domain` (pura: dado relato +
  monitoramentos → correspondências); a entrega de push e a persistência são adaptadores atrás de portas (ex.:
  `PushSender`, `WatchRepository`, `NotificationRepository`). Nada de SDK de web-push no domínio. Validar a
  entrada do monitoramento com Zod em `packages/contracts`.
- **Especificidades do Web Push:** chaves VAPID; handlers `push` + `notificationclick` no service worker em
  `apps/web` (o SW já existe para o shell do PWA, E4). Inscrições são por dispositivo — um usuário pode ter
  várias. Tratar endpoints `410 Gone` / expirados podando a inscrição.
- **Caminho de entrega:** evento de discovery criado → enfileirar job de correspondência → fan-out para os
  monitoramentos correspondidos → **escrever na caixa imediatamente** + enfileirar na **janela de agrupamento**
  do monitoramento (P0-8) → ao fechar a janela, colapsar em um push por monitoramento (se o interruptor de push
  do usuário estiver ligado). Manter assíncrono para que publicar um Discovery continue rápido (pilar de
  performance). Uma fila/worker leve com um timer/debounce por monitoramento basta; evitar bloquear a
  requisição `POST /discoveries`. A janela de agrupamento é o único gargalo do volume de avisos — desenhá-la
  primeiro.
- **Pilar de performance:** notificações não podem regredir a experiência no Moto G em 3G — payloads de push
  minúsculos, lógica de SW mínima, lista da caixa paginada e enxuta, respeitar `Save-Data`.
- **Abuso/custo:** correspondência e fan-out de push são superfície de ataque (alguém poderia spammar Relatos
  para disparar pushes em massa). Reutilizar o rate limiting da API (E2) e a janela de agrupamento (P0-8) como
  proteções.

---

## 10. Perguntas em aberto

| # | Pergunta | Responsável | Bloqueia? |
|---|---|---|---|
| P1 | A entidade `Discovery` existe no modelo do MVP, mas [`report-discovery.spec.md`](./report-discovery.spec.md) **emite um evento de domínio de "discovery criado/confirmado"** para o E11 consumir? Se não, esse gancho precisa ser adicionado lá primeiro. É a dependência dura. | Eng | **Sim** |
| P3 | Postura exata de LGPD: período de retenção das inscrições de push e do histórico da caixa; formato do registro de consentimento; é preciso um texto de consentimento específico de notificação, separado dos termos da conta? | Jurídico/Eng | Em parte |
| P6 | Duração da janela de agrupamento (padrão ~10–15 min) e se a *primeira* correspondência numa janela vazia descarrega na hora (menor latência) ou sempre espera o fechamento (melhor agrupamento). | Produto/Eng | Não |
| P7 | Suporte/limitações do Web Push em PWA no iOS para o público-alvo — expectativas de fallback em navegadores sem suporte. | Eng | Em parte |

**Resolvidas (incorporadas aos requisitos):**

- ~~P2 — semântica do interruptor único~~ → **Resolvida:** sem interruptor "mestre" ambíguo. Dividido em um
  interruptor de canal de push (só interrupção; a caixa continua registrando) + pausa por monitoramento
  (correspondência). Ver P0-6.
- ~~P4 — raio padrão / preço obrigatório~~ → **Resolvida:** o raio tem padrão de **2 km** (ajustável); o preço
  máximo continua **opcional**. O volume é tratado por agrupamento (P0-8), não restringindo o monitoramento.
  Ver P0-1.
- ~~P5 — deduplicação entre monitoramentos~~ → **Resolvida (não-problema na v1):** monitoramentos são por item
  e duplicatas são bloqueadas (P0-1), então um Relato corresponde a no máximo um monitoramento de um usuário.
  Só reabre se monitoramentos por categoria/palavra-chave (P2) forem lançados. Ver P0-2.
- ~~Limitador de frequência~~ → **Promovido de P1 para P0** como a janela de agrupamento (P0-8), a única
  primitiva de entrega para o volume de avisos.

---

## 11. Cronograma & faseamento

Esta feature fica na **Fase 2 (Produto utilizável)** e **depende fortemente de**:
(a) **Contas/Auth** (Épico E5) — monitoramentos exigem login; e
(b) o evento de domínio de criar/confirmar **`Discovery`** de [`report-discovery.spec.md`](./report-discovery.spec.md)
— não há nada para corresponder sem isso.

Faseamento sugerido depois que esses chegarem:

- **Fase A — Fundações:** schema de `Watch` + `PushSubscription` + `Notification`, contratos Zod, lógica de
  correspondência no domínio + testes unitários, configuração de VAPID, handlers de push/click no SW.
- **Fase B — Ciclo:** UI de criar monitoramento (raio padrão 2 km, preço opcional), fluxo de consentimento,
  correspondência nos eventos de Relato, entrega **agrupada** por Web Push + caixa, controles de interruptor de
  push + pausar/excluir por monitoramento. *(É o entregável P0 — o agrupamento sai aqui, não depois.)*
- **Fase C — Robustez (P1):** horário de silêncio, editar monitoramento, badge de não lidos, atalho de sino no
  mapa.

Sem prazo externo duro; condicionar o lançamento a O2 (utilidade da correspondência) e O4 (pouca irritação)
estarem saudáveis em dogfooding antes de expor à cidade-piloto.

---

## 12. Glossário

- **Monitoramento (Watch):** o pedido permanente de um usuário para ser avisado sobre um item específico,
  delimitado por uma área (raio, padrão 2 km) e um preço máximo opcional.
- **Relato / Discovery:** usados de forma intercambiável aqui; `Discovery` é o nome da entidade no modelo de
  dados do MVP (`MVP-OVERVIEW.md` §5). Um avistamento, pela comunidade, de um Produto em um Local por um
  preço/quantidade.
- **Gatilho / condição:** o que faz um Discovery corresponder a um monitoramento — `nearby` (dentro do raio)
  e/ou `price_below` (≤ preço máximo) na v1.
- **Correspondência:** um Discovery recente que satisfaz as condições de um monitoramento; candidato à entrega.
- **Janela de agrupamento:** a curta espera (padrão ~10–15 min) durante a qual as correspondências de um
  monitoramento são colapsadas em um único push; o mecanismo central de controle do volume de avisos.
- **Interruptor de push:** o liga/desliga por usuário do canal interruptivo de push; não para a correspondência
  nem o registro na caixa.
- **Caixa de avisos:** a lista persistente, dentro do app, das correspondências de um usuário (lido/não lido);
  sempre registrando enquanto um monitoramento estiver ativo.
- **Inscrição de push (push subscription):** um endpoint de Web Push por dispositivo que o usuário consentiu;
  dado pessoal sob a LGPD.
