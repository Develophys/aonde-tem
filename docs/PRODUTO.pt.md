# Aonde Tem — Documento de Produto

> Status: **Rascunho v0.1** · Responsável: Mauricio · Última atualização: 2026-06-27
> Este documento explica *o que estamos construindo e por quê*. É a fonte da verdade da qual os
> [épicos do roadmap](../ROADMAP.md) são derivados. A estrutura de seções é reutilizável como
> **template** para futuros documentos de produto. A versão em inglês está em [`PRODUCT.en.md`](./PRODUCT.en.md).

---

## 1. A ideia principal (resumo em uma frase)

**Aonde Tem é um mapa colaborativo e em tempo real que ajuda as pessoas no Brasil a encontrar onde um item específico está disponível por perto — e por quanto custa.**

Em vez de procurar por *estabelecimentos*, as pessoas procuram por *coisas*. Qualquer um pode publicar
um relato — **o que** é o item, **onde** está, **quanto** custa e **quantos** há disponíveis — e todos
por perto veem na hora no mapa. Pense no **"Waze da disponibilidade e dos preços de produtos."**

> **Pitch de elevador:** "Você precisa de algo *agora* e não quer sair rodando no escuro.
> Abra o Aonde Tem, busque o item e veja onde acabaram de encontrá-lo perto de você — com o preço e
> quantos restam. Encontrou você mesmo? Marque no mapa para a próxima pessoa não perder a viagem."

---

## 2. O problema

Descobrir *onde um item específico está disponível agora* ainda é dolorosamente manual. Mapas e
buscadores dizem quais estabelecimentos *existem*, não o que eles realmente *têm em estoque hoje* nem
*por qual preço*. Então as pessoas ligam para vários lugares, vão de loja em loja ou perguntam em
grupos de WhatsApp — perdendo tempo, combustível e dinheiro, especialmente com itens em falta, em
promoção ou vendidos em pontos informais/locais.

O conhecimento de "onde achar X baratinho agora" já existe — só está preso na cabeça das pessoas e
espalhado em grupos de mensagem. **Ninguém transformou esse conhecimento local e em tempo real em um
mapa compartilhado e pesquisável.**

---

## 3. Público-alvo & personas

**Mercado principal:** consumidores em geral no Brasil. Português em primeiro lugar. Foco em mobile
(PWA instalável). Lançamento focado em **uma cidade/região primeiro**, para criar densidade de relatos
antes de expandir.

| Persona | Quem é | O que quer |
|---|---|---|
| **O Buscador** | Alguém que precisa de um item agora e quer evitar viagens à toa | Ver onde o item está disponível por perto, o preço e o quão recente é a informação — antes de sair de casa |
| **O Relator** | Alguém que acabou de ver um item (em loja, mercado, banca) | Compartilhar em segundos — item, local, preço, quantidade — e ajudar a comunidade |
| **O Frequentador** (futuro) | Usuário avançado que relata bastante e constrói reputação | Reconhecimento/confiança; talvez benefícios depois |
| **O Comércio Local** (futuro) | Dono de loja que quer demanda para o estoque | Reivindicar/confirmar registros, sinalizar disponibilidade e preço |

A maioria dos primeiros usuários será **Buscador e Relator ao mesmo tempo** — esse comportamento de mão dupla é o coração do produto.

---

## 4. Proposta de valor & diferencial

**Por que é melhor do que só usar o Google Maps:** o Google Maps responde *"quais estabelecimentos
estão perto de mim?"*. O Aonde Tem responde *"onde **este item** está disponível perto de mim agora,
e por quanto?"* — uma pergunta que nenhum diretório de empresas consegue responder, porque o dado só
existe na comunidade, em tempo real.

Nosso diferencial:

- **Disponibilidade em tempo real**, não listagens estáticas — relatos têm horário e perdem validade.
- **Busca pelo item**, não pelo estabelecimento — você procura a coisa, não a loja.
- **Transparência de preço** — todo relato tem preço, então dá para achar o *mais barato* por perto.
- **Hiperlocal e curado pela comunidade** — quem relata é quem acabou de estar lá.

---

## 5. Como funciona (o conceito central)

A unidade atômica do produto é um **Relato** — um único avistamento de um item pela comunidade:

| Campo | Significado | Obrigatório? |
|---|---|---|
| **O quê** | O item (nome / categoria) | Sim |
| **Onde** | Localização (pino no mapa ou GPS atual) | Sim |
| **Quanto** | Preço | Sim |
| **Quantos** | Quantidade / disponibilidade | Sim |
| Foto / observação | Contexto opcional | Não |
| Horário | Quando foi relatado (define a "frescura") | Automático |
| Relator | Quem publicou (anônimo ou com conta) | Automático |

**O ciclo:**
1. Um Relator vê um item e publica um Relato em segundos.
2. O Relato aparece no mapa ao vivo para os Buscadores por perto.
3. Um Buscador procura um item → vê Relatos recentes por perto com preço e quantidade.
4. A comunidade mantém os Relatos confiáveis (confirma "ainda tem" / "acabou"), e Relatos antigos expiram.

Esse ciclo — **relatar ↔ buscar** — é todo o MVP. Todo o resto vem por cima.

---

## 6. Objetivos (resultados mensuráveis)

São **hipóteses com metas**, a validar após o lançamento na cidade-piloto:

- **O1 — Liquidez:** ≥ 70% das buscas por itens na área-piloto retornam pelo menos um Relato *recente* (< 24h) em até 3 meses de lançamento.
- **O2 — Contribuição:** ≥ 25% dos usuários ativos publicam pelo menos um Relato por mês (proporção saudável de relatores por buscadores).
- **O3 — Utilidade:** tempo mediano de "abrir o app" até "achar um Relato útil" abaixo de 30 segundos.
- **O4 — Retenção:** ≥ 30% dos usuários que publicam ou usam um Relato voltam em até 7 dias.
- **O5 — Confiança:** ≥ 80% dos Relatos que recebem um sinal da comunidade são confirmados como corretos (não marcados como errado/acabou).

---

## 7. Não-objetivos (explicitamente fora do escopo da v1)

- **Sem transações / pagamentos / marketplace.** Indicamos onde as coisas estão; não vendemos nem processamos pedidos. *(Complexo demais; não é o valor central.)*
- **Sem navegação passo a passo.** Mostramos a localização e passamos para o app de mapas do usuário. *(Mapas já fazem isso bem.)*
- **Sem integração com estoque de lojas.** A v1 depende de relatos da comunidade, não de PDV/estoque. *(Sem oferta; prematuro.)*
- **Sem cobertura nacional no lançamento.** Começar em uma cidade para atingir densidade de relatos. *(Liquidez vence abrangência no início.)*
- **Sem sistema pesado de moderação/verificação na v1.** Apenas sinais leves da comunidade. *(Construir ferramentas de confiança quando houver volume.)*

---

## 8. Histórias de usuário

**Buscador**
- Como Buscador, quero pesquisar um item específico para ver onde está disponível perto de mim.
- Como Buscador, quero ver o preço, a quantidade e há quanto tempo cada Relato foi publicado para julgar se vale a viagem.
- Como Buscador, quero ver os resultados em um mapa centrado na minha localização para escolher a opção mais próxima.
- Como Buscador, quero abrir a localização no meu app de mapas para navegar até lá.

**Relator**
- Como Relator, quero publicar um avistamento em poucos toques (item, preço, quantidade, local) para que compartilhar seja fácil.
- Como Relator, quero que o app use minha localização atual para eu não precisar posicionar o pino manualmente.
- Como Relator, quero opcionalmente adicionar foto ou observação para deixar meu Relato mais confiável.

**Comunidade / confiança** *(P1)*
- Como usuário, quero confirmar que um Relato "ainda tem" ou marcar "acabou" para que outros confiem na informação recente.
- Como usuário, quero que Relatos antigos sumam/expirem para não ser enganado por dados velhos.

**Conta / usuário avançado** *(P1–P2)*
- Como Relator frequente, quero uma conta para que minhas contribuições e reputação sejam registradas.
- Como Buscador, quero ser notificado quando um item que procuro aparecer por perto para não precisar ficar verificando.

---

## 9. Requisitos

### Essenciais — P0 (o ciclo MVP relatar↔buscar)
- **Publicar um Relato (sem login obrigatório)**: item (nome/categoria), local (GPS ou pino), preço, quantidade; horário + relator automáticos. Contas são opcionais (P1) e só adicionam reputação/histórico.
  - *Dado* que estou no app (logado ou não), *quando* envio um item com preço, quantidade e local, *então* ele aparece no mapa em segundos.
- **Mapa de Relatos por perto**: exibir Relatos como marcadores ao redor do usuário.
- **Busca/filtro por item**: encontrar Relatos de um item específico.
- **Geolocalização**: detectar a localização do usuário, tratando bem a recusa de permissão.
- **Frescura do Relato**: todo Relato mostra sua idade; Relatos muito antigos ficam apagados ou expiram.
- **PWA instalável**: funciona no celular, é instalável, com shell básico offline.

### Importantes — P1 (próximos passos)
- Validação pela comunidade: confirmar "ainda tem" / marcar "acabou".
- Autocomplete de item + categorias.
- Contas de usuário (atribuir Relatos, habilitar reputação).
- Foto/observação no Relato.
- "Avise-me quando X aparecer por perto" (lista de interesse + push).

### Desejáveis / futuro — P2 (projetar para, mas não construir ainda)
- Reputação / pontuação de confiança do relator.
- Histórico e tendência de preço por item/área.
- Registros reivindicados por estabelecimentos e disponibilidade confirmada.
- Sinais de demanda / insights anonimizados (base para monetização).

---

## 10. Métricas de sucesso

**Indicadores antecedentes (dias–semanas)**
- Relatos criados por dia (por cidade).
- % de buscas que retornam ≥ 1 Relato recente (**liquidez** — a métrica decisiva).
- Ativação de relator: % de novos usuários que publicam na primeira semana.
- Tempo mediano até resultado útil.

**Indicadores consequentes (semanas–meses)**
- Retenção em 7 e 30 dias.
- Crescimento da base de relatores ativos por cidade.
- Taxa de acurácia dos Relatos (confirmados vs. sinalizados).
- Boca a boca / crescimento orgânico (fator k) por cidade.

> As metas são definidas por cidade e revisadas mensalmente. A liquidez (O1) é a métrica principal — sem ela, nada mais importa.

---

## 11. Modelo de negócio

**Agora: gratuito, sem anúncios, sem monetização.** A prioridade é liquidez e crescimento — um mapa
denso e confiável de Relatos na cidade-piloto. A receita fica adiada até o ciclo central se provar.

**Candidatos futuros (em prioridade aproximada):**
1. **Destaque para estabelecimentos** — lojas locais pagam para confirmar/destacar disponibilidade e preços.
2. **Insights agregados de demanda e preço** — dados anonimizados sobre o que as pessoas buscam e os preços locais.
3. **Relatos promovidos / recursos premium opcionais** — sem comprometer a confiança nos relatos orgânicos.

Evitado no início: anúncios invasivos que corroeriam a confiança nos Relatos da comunidade.

---

## 12. Riscos & perguntas em aberto

| # | Risco / pergunta | Responsável | Bloqueia? |
|---|---|---|---|
| R1 | **Início a frio / ovo e galinha**: o Buscador só tem valor quando há Relatos suficientes. Como semear a primeira cidade? | Fundador/Estratégia | Sim |
| R2 | **Acurácia & spam/abuso**: como manter os dados confiáveis sem moderação pesada? | Produto | Em parte |
| R3 | **Privacidade de localização**: como tratar/armazenar a localização com responsabilidade (LGPD)? | Jurídico/Eng | Sim |
| ✅ D1 | **Categorias de lançamento — DECIDIDO: aberto a todos os itens.** Sem restrição de categoria no lançamento; revisar se a liquidez ficar baixa demais. | Produto | Resolvido |
| ✅ D2 | **Modelo de relato — DECIDIDO: conta opcional.** Qualquer um pode relatar de forma anônima (menor atrito); ao entrar com conta, desbloqueia reputação/histórico. | Produto | Resolvido |
| P2 | Em quanto tempo um Relato é considerado velho/expirado (por categoria)? | Produto/Dados | Não |
| P4 | Qual cidade-piloto, e como recrutar a primeira leva de Relatores? | Fundador | Sim |

> **O maior risco é o R1 (início a frio).** Com as categorias abertas (D1), a alavanca de pontapé é a **cidade-piloto + primeira leva de Relatores (P4)**: escolher uma cidade e semear os primeiros Relatos nós mesmos (nos itens com maior dor local) até o ciclo da comunidade se sustentar sozinho.

---

## 13. Faseamento & ligação com o roadmap

Mapeado para os épicos em [`ROADMAP.md`](../ROADMAP.md):

- **Agora (MVP):** o ciclo relatar↔buscar — publicar um Relato, ver Relatos por perto no mapa, busca por item, geolocalização, PWA. *(Épicos E1–E4)*
- **Próximo:** validação pela comunidade, contas, busca/autocomplete, notificações de lista de interesse. *(Épicos E5–E7)*
- **Depois:** reputação, histórico de preços, registros de estabelecimentos, bases de monetização. *(Épico E6 P2, E8–E9)*

---

## 14. Glossário

- **Relato:** um único avistamento de um item pela comunidade — o quê / onde / quanto / quantos.
- **Buscador:** usuário que procura um item.
- **Relator:** usuário que publica um Relato.
- **Liquidez:** a fração de buscas que retornam um Relato recente e útil — a métrica central de saúde.
- **Frescura:** o quão recente é um Relato (publicado/confirmado); guia confiança e expiração.

---

### Como reutilizar como template
Mantenha os títulos das seções (1–14) e troque o conteúdo específico do Aonde Tem. O fluxo — *ideia
principal → problema → usuários → valor → como funciona → objetivos/não-objetivos → histórias →
requisitos → métricas → modelo → riscos → roadmap* — funciona para qualquer produto e alimenta
diretamente a criação dos épicos.
