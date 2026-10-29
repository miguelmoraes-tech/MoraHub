# Nicho Impressão 3D (Etapas A e B)

Impressoras, Estoque, Produtos e catálogo, Precificação e Orçamentos para quem
trabalha com impressão 3D sob demanda, loja de produtos ou print farm. Usa o
sistema de nichos e módulos que já existe (registro em `lib/modulos/registry.ts`,
`workspace_modulos`, `getAcessoModulo`, rótulos, `getEmpresaAtiva`): não há
sistema paralelo e não há `if` por nicho no código. O nicho `impressao_3d` e os
módulos `p3d_*` são **dados** no banco (`nichos`, `nicho_modulos`, `modulos`).

> A **Etapa A** (impressoras, estoque, produtos, precificação, orçamentos) está nas
> seções abaixo. A **Etapa B** (fornecedores e compras, pedidos, produção, qualidade,
> expedição) está na seção [Etapa B](#etapa-b-fornecedores-pedidos-produção-qualidade-e-expedição).

## Módulos, rotas e permissões

| Chave do módulo | Rota | Extra de tela | Depende de |
| --- | --- | --- | --- |
| `p3d_impressoras` | `/impressao-3d/impressoras` | — | — |
| `p3d_estoque` | `/impressao-3d/estoque` | `custos` | — |
| `p3d_produtos` | `/impressao-3d/produtos` (e `/[id]`) | — | — |
| `p3d_precificacao` | `/impressao-3d/precificacao` | — | `p3d_impressoras`, `p3d_estoque` |
| `p3d_orcamentos` | `/impressao-3d/orcamentos` (e `/[id]`) | `custos` | `clientes`, `p3d_precificacao` |
| `p3d_fornecedores` | `/impressao-3d/fornecedores` (e `/compras/[id]`) | — | — |
| `p3d_pedidos` | `/impressao-3d/pedidos` (e `/[id]`) | `custos` | — |
| `p3d_producao` | `/impressao-3d/producao` | — | — |
| `p3d_qualidade` | `/impressao-3d/qualidade` | `custos` ("Ver custos das falhas") | — |
| `p3d_expedicao` | `/impressao-3d/expedicao` | — | — |

- Menu, proxy e Visão Geral seguem **registro ∩ `workspace_modulos` ∩ permissão**.
  Módulo desligado = rota bloqueada pelo proxy e fora do menu.
- Toda página lê por `getAcessoModulo("p3d_x")` (nível `leitura`) e toda action de
  escrita confere `getAcessoEdicao("p3d_x")` **no servidor**, sempre filtrando
  pelo `workspace_id` da empresa ativa. O RLS é a barreira real.
- O extra **`custos`** (Estoque e Orçamentos) é **só de tela**: sem ele somem
  custo, preço de compra, custo médio, lucro, margem, markup, composição do custo
  e parâmetros de custo. Preço e totais continuam visíveis. O servidor já não envia
  esses campos (selects sem as colunas; cálculo reduzido por `ocultarCustosDoCalculo`).
  Não é barreira de banco: quem tem o módulo pode ler as colunas por fora da tela.
- Listas auxiliares (impressora, material, cliente) só carregam se a pessoa também
  tem acesso ao módulo dono da lista; senão aparecem vazias e a tela avisa.

## O que é **estimado** e o que é **real**

| Dado | Natureza |
| --- | --- |
| Preço, custo, lucro, margem, markup, composição (simulador e itens de orçamento) | **Estimado** — vem de parâmetros cadastrados, não de produção medida. A tela rotula "Estimado". |
| Depreciação e desgaste por hora na lista de impressoras | **Estimado** (fórmula do cadastro). |
| Saldo de estoque, custo médio, histórico de movimentos | **Real do registro**: só mudam por entrada/ajuste/perda e pelo histórico. |
| Horas de uso da impressora | Informadas à mão **e** somadas ao concluir um trabalho em Produção (Etapa B). |
| Produtividade real, taxa de falha medida, consumo real | **Reais** a partir da Etapa B: vêm de trabalhos concluídos/com falha, peso e horas informados na conclusão. Sem trabalho medido a tela mostra "—", nunca um número estimado. |

## Fórmulas (regras que a UI explica)

O cálculo é feito **no banco** (`p3d_simular_preco`, `p3d_salvar_item_orcamento`);
a tela nunca recalcula preço por conta própria. Regras:

- **Margem** = lucro ÷ preço de venda. **Markup** = lucro ÷ custo.
- **Impostos, taxa de pagamento e comissão** incidem sobre o **preço**, não sobre o custo.
- **Falhas** = `taxa ÷ (1 − taxa) × custo de uma tentativa`. Isso já cobre a
  reimpressão; a margem de desperdício **não** entra de novo.
- **Purga** do fatiador **não** recebe margem de desperdício. Informando
  `peso_total_g`, vale como total do fatiador e a purga é subconjunto dele.
- **Pesos e horas** da entrada valem para o **lote inteiro** (todas as unidades).
- **Depreciação por hora** (cadastro da impressora) = `(aquisição − residual) ÷ vida útil`.
- **Desgaste por hora** = soma de `custo ÷ vida útil` das peças de desgaste; é somado
  a `manutencao_hora` no cálculo de preço.
- Custo do material por grama: `preco_compra ÷ peso_liquido_rolo_g` (cadastro) ou o
  custo médio ponderado das entradas, conforme `base_custo_material` da empresa.
- Entrada de estoque atualiza o **custo médio ponderado**.

`margem_real` e `markup_real` devem chegar da RPC como fração ou como percentual; a
tela confere com `lucro ÷ preço` e `lucro ÷ custo` e normaliza (`normalizarFracao`
em `lib/impressao-3d/calculo.ts`).

### Composição devolvida (`calculo`)

`custos` {material, energia, depreciacao, manutencao, falhas, mao_obra, acabamento,
montagem, embalagem, outros, rateio_despesas_fixas}, `custo_total`, `impostos_valor`,
`taxas_valor`, `preco_recomendado`, `preco_final`, `lucro`, `margem_real`,
`markup_real`, `por_unidade` {custo, preco, lucro}, `detalhes` {material, energia,
depreciacao, manutencao, falha}, `avisos`, `tipo_valores: "estimado"`, `versao_formula`.
A energia aparece **separada** de depreciação e manutenção.

## Parâmetros (`p_entrada`)

Numéricos: `peso_peca_g`, `peso_suporte_g`, `peso_brim_g`, `peso_purga_g`,
`peso_total_g`, `horas_impressao`, `quantidade`, `preco_por_g` | `preco_rolo` +
`peso_rolo_g`, `desperdicio_pct`, `potencia_media_kw`, `tarifa_kwh`,
`valor_aquisicao`, `valor_residual`, `vida_util_horas`, `manutencao_hora`,
`manutencao_ciclo`, `falha_pct`, `falha_fracao_perdida`, `valor_hora_mao_obra`,
`mao_obra_horas`, `acabamento_horas`, `montagem_horas`, `embalagem_custo`,
`despesas_fixas_pct`, `margem_pct`, `markup_pct`, `impostos_pct`,
`taxa_pagamento_pct`, `comissao_pct`, `taxa_fixa_pagamento`, `preco_minimo`,
`arredondar_para`, `preco_manual`. Também: `impressora_id`, `material_id`,
`modo_preco` (`margem`|`markup`) e `outros_custos` `[{nome, valor}]`.

O simulador envia **só o que foi preenchido**. Campo vazio = padrão da empresa
(`p3d_config_precificacao`), da impressora e do material; o que vier em `p_entrada`
tem prioridade. Ajustes em "Parâmetros avançados" valem só para a simulação e não
alteram nenhum cadastro. O modo de preço só é enviado se diferir da configuração.

## Telas

1. **Impressoras** — lista com status, horas de uso e alerta de manutenção
   (`horas_uso − horas_ultima_manutencao >= intervalo_manutencao_horas`); formulário
   completo com depreciação por hora ao vivo; abas *Peças de desgaste* e
   *Manutenções* (registrar manutenção **preventiva** atualiza
   `horas_ultima_manutencao`). Integração: só tipo e endereço, **nunca token/senha**.
2. **Estoque** — materiais por tipo (cor, saldo, mínimo, alerta de abaixo do mínimo,
   custo/g de cadastro e médio); cadastro **sem** campos de saldo; ações *Entrada*
   (por rolos: rolos × peso líquido → gramas, e custo total), *Ajuste* (quantidade com
   sinal + motivo obrigatório) e *Perda*; histórico de movimentos com filtro.
3. **Produtos e catálogo** — filtro por categoria; detalhe com variações e arquivos
   (STL, 3MF, GCODE, fotos com preview). Bucket privado `p3d-arquivos`, caminho
   `<workspace_id>/<produto_id>/<uuid>-<nome>`, limite de 100 MB, download por signed
   URL (10 min). O envio vai do navegador direto ao bucket (limite das server
   actions); a action só registra a linha depois de conferir o caminho. Excluir
   remove o objeto e a linha.
4. **Precificação** — *Configurações da empresa* (todos os campos, ajuda e aviso fora
   de 5–15 % de desperdício e 5–10 % de falhas) e *Simulador* com a composição
   completa, avisos e **Usar em orçamento**.
5. **Orçamentos 3D** — lista com status e totais; detalhe com itens, desconto,
   validade, observações e ações de status. Cada item mostra o **snapshot** salvo
   (data do cálculo, versão da fórmula, parâmetros), que **não muda** quando
   preços ou configuração mudam depois. *Recalcular com valores atuais* existe só
   em rascunho. Orçamento fora de rascunho é somente leitura.

### Status do orçamento (`p3d_mudar_status_orcamento`)

`rascunho → enviado` (exige ≥ 1 item); `enviado → aprovado | recusado | expirado |
rascunho`; `recusado | expirado → rascunho`. De `aprovado` o orçamento só sai por
**Converter em pedido** (Etapa B), que o torna `convertido` (somente exibição).

### Recalcular × editar

- **Recalcular com valores atuais**: reenvia cada item mantendo só o que é *do item*
  (impressora, material, quantidade, pesos, horas, mão de obra, acabamento, montagem,
  embalagem, outros custos, preço manual) e deixa a RPC resolver tarifa, preço do
  material, depreciação, margem etc. com os valores de hoje. Ajustes avançados feitos
  naquele item (ex.: tarifa digitada) são descartados — a tela avisa antes.
- **Editar item**: carrega o mesmo conjunto (mais modo/percentual de preço quando
  diferem da configuração) e recalcula com os valores de hoje ao salvar.

## Regras de escrita (o banco barra, o código nunca tenta)

Nunca enviados em insert/update direto:

- `p3d_materiais`: `estoque_atual`, `custo_medio`, `ultimo_custo` (e `custo_cadastro`,
  coluna gerada). Saldo e custo médio só por `p3d_movimentar_estoque`.
- `p3d_orcamentos`: `status`, `numero`, `subtotal`, `total`, `custo_total`,
  `lucro_total`, `enviado_em`, `aprovado_em`. Direto só `titulo`, `cliente_id`,
  `validade`, `desconto_valor`, `observacoes`, e só em rascunho.
- `p3d_orcamento_itens` e `p3d_movimentos_estoque`: somente leitura (RPCs).

`scripts/auditar-isolamento.mts` **falha** se surgir escrita direta nesses campos ou
nessas tabelas, `workspace_id` ausente, action sem guarda de edição, uso do código
antigo de dono ou acesso ao storage fora do bucket `p3d-arquivos`.

Os textos de erro das RPCs (em português) são mostrados ao usuário como vieram.

## Limitações conhecidas

- Sem loja online e sem integração real com impressoras (OctoPrint, Bambu...).
  `integracao_tipo`/`integracao_url` são só cadastro.
- Entrada de estoque sem o extra `custos` é registrada **sem custo** (não atualiza o
  custo médio); se a RPC exigir custo, a mensagem dela aparece.
- Precificação não tem extra: quem tem o módulo vê a composição de custos.
- Parâmetros avançados do simulador ficam ocultos para quem não tem `custos` dentro de
  um orçamento.
- Produtos: pesos/horas do produto são **por unidade**; ao escolher o produto num item
  a tela preenche `valor × quantidade` (a entrada vale para o lote).
- Sem o módulo `clientes` (ou permissão nele), o cliente do orçamento aparece como
  "(sem acesso a Clientes)" e o vínculo atual é mantido ao salvar.
- A atualização de um orçamento fora de rascunho é recusada (a tela nem oferece).
- A atualização "registrar manutenção preventiva" faz duas escritas (manutenção e
  horas da impressora); se a segunda falhar, a tela informa o que faltou.

## Como ativar numa empresa

1. Conferir no catálogo `modulos` as 10 chaves `p3d_*` (Etapas A e B; hoje `ativo = false`).
2. Quando as telas estiverem validadas: `update modulos set ativo = true where chave like 'p3d\_%'`.
3. Aplicar o nicho `impressao_3d` (e um modelo: `sob_demanda`, `loja_produtos`,
   `print_farm`) em **Configurações → Nicho e modelo** da empresa de teste, ou
   `select aplicar_nicho('<ws>', 'impressao_3d', '<modelo>')`.
4. Dar a sócios/funcionários permissão por módulo em **Sócios** (e o extra
   `Custos` onde fizer sentido).

## Testes

```
npx tsc --noEmit
npx eslint
npm run build
node --import ./scripts/register-alias.mjs scripts/testar-acesso.mts
node scripts/auditar-isolamento.mts
```

`testar-acesso.mts` (seção *Impressão 3D*) cobre registro, rotas, menu, ∩ de
permissões, extra `custos`, regras de impressora/estoque, números pt-BR, validações,
montagem de `p_entrada`, leitura do cálculo, caminho dos arquivos e o contrato das
actions (RPCs, campos protegidos, guarda de empresa). O snapshot das empresas atuais
(`scripts/snapshot-empresas-atuais.json`) **não muda**.


---

# Etapa B: fornecedores, pedidos, produção, qualidade e expedição

Cinco módulos novos no mesmo sistema de módulos (registro, `workspace_modulos`, guard
por módulo). O catálogo `modulos.ativo` segue `false` até a ativação manual.

## Fluxo de ponta a ponta

```
Fornecedor → Compra (cotação → aprovada → recebida) ─► Estoque (entrada + custo médio)
Orçamento aprovado ──► Converter em pedido ─┐
Pedido manual ─────────────────────────────┴► Pedido (novo → confirmado)
   └► Gerar produção ─► Trabalho (fila → imprimindo → concluída | falhou)
         ├ concluir: baixa material do estoque, soma horas na impressora, libera a impressora
         ├ falha: baixa o material perdido (se imprimindo) e pode criar reimpressão
         └ Qualidade: inspeção (aprovado | reprovado | retrabalho)
   └► Pedido pronto ─► Envio (preparando → postado → em trânsito → entregue)
Pagamentos (pix, cartão...) e estornos acompanham o pedido; opcionalmente vão ao Financeiro.
```

## Fornecedores e compras (`p3d_fornecedores`)

- **Fornecedores**: CRUD direto (nome, contato, telefone, e-mail, site `http(s)`, categoria,
  observações; arquivar em vez de excluir). O cadastro de **material** (Estoque) ganhou o
  seletor de fornecedor; quem não vê Fornecedores mantém o vínculo atual ao salvar.
- **Compras** (`cotacao → aprovada → recebida | cancelada`). Cabeçalho direto: fornecedor,
  data, validade da cotação, prazo, frete, desconto, observações. `status`, `numero`,
  `subtotal`, `total`, `recebida_em`, `conta_pagar_id` só por RPC/banco. Excluir só em
  cotação. Compra recebida/cancelada é imutável.
- **Itens** (CRUD direto em cotação/aprovada): material, **quantidade na unidade base do
  material (g, ml ou un)** e **valor pago pelo item** (`preco_total`). A tela converte
  *rolos × peso líquido* quando o material tem peso de rolo. `preco_unitario` é gerado.
- **Ações**: aprovar (exige ≥ 1 item), voltar para cotação, cancelar
  (`p3d_mudar_status_compra`) e **receber** (`p3d_receber_compra`).
- **Receber** exige edição em Fornecedores **e** em Estoque. Dá entrada no estoque com
  frete e desconto **rateados por valor** e atualiza o custo médio. Gerar **conta a pagar**
  é opcional e exige Financeiro ligado, edição nele e **vencimento**; sem isso a tela não
  oferece e o servidor recusa.
- **Preços** (view `p3d_historico_precos`): histórico de compras **recebidas** por material
  e comparação das **cotações abertas** (a mais barata destacada). O preço unitário **não
  inclui frete**. Nada é inventado: sem compras, estado vazio.

## Pedidos e vendas (`p3d_pedidos`, extra `custos`)

- **Pedido**: cliente cadastrado **ou** avulso (um dos dois), prioridade, datas, desconto,
  frete, observações. Cliente, desconto e frete só mudam **antes da produção** (novo/
  confirmado); depois só prioridade, prazo e observações. `total = subtotal − desconto +
  frete`; `lucro_total = Σ lucro dos itens − desconto` (**frete não entra no lucro**).
- **Itens manuais** (CRUD direto em novo/confirmado). Itens vindos de orçamento
  (`origem='orcamento'`) são somente leitura e mostram a **composição do snapshot**
  (estimada, não muda depois).
- **Converter em pedido** (botão no orçamento aprovado): exige edição em Pedidos **e**
  Orçamentos, abre o pedido criado; o orçamento vira `convertido` (a tela mostra o link
  para o pedido).
- **Status** (`p3d_mudar_status_pedido`): `novo→confirmado|cancelado`;
  `confirmado→em_producao|pronto|cancelado`; `em_producao→pronto|cancelado`;
  `pronto→enviado|entregue|em_producao|cancelado`; `enviado→entregue`. Confirmar exige
  item; **pronto** exige não haver trabalho na fila/imprimindo nem reprovado na qualidade;
  **cancelar** exige motivo, é barrado com trabalho imprimindo e cancela os da fila. Iniciar
  produção e postar/entregar envio também movem o pedido sozinhos.
- **Pagamentos** (`p3d_registrar_pagamento`): pagamento ou estorno, formas
  pix/cartão/boleto/dinheiro/transferência/outro. Não aceita pagamento acima do saldo nem
  estorno acima do pago (texto da RPC). O checkbox **"Lançar no Financeiro"** só aparece com
  Financeiro ligado e edição nele. **Estorno não vai ao Financeiro**: a tela avisa para
  ajustar lá.
- **Gerar produção** (`p3d_gerar_producao_do_pedido`): um trabalho por item, idempotente;
  só pedido confirmado/em produção; exige edição em **Produção**.
- **Extra `custos`**: sem ele o servidor **não seleciona** `custo_total`, `lucro_total`,
  `custo_unitario`, `lucro` dos itens, e o snapshot sai sem composição de custo nem
  parâmetros de custo; o custo unitário de item manual também não pode ser enviado. É só de
  tela (não é barreira de banco), como na Etapa A.

## Produção (`p3d_producao`)

- **Fila** por abas de status. Ordem: **prioridade** (urgente > alta > normal > baixa),
  **prazo** (nulos por último), **número**.
- **Trabalho avulso** (produção para estoque): criado direto. Trabalhos de pedido nascem de
  "Gerar produção". Campos estruturais só na fila; depois só prioridade, prazo, observações.
  Excluir só na fila. `status`, `numero`, `horas_reais`, `peso_real_g`, `qualidade`,
  `iniciado_em`, `concluido_em`, `consumo_registrado_em`, `reimpressao_de` só por RPC.
- **Iniciar** (`p3d_iniciar_producao`): escolhe impressora **disponível**; marca-a
  `imprimindo`; o pedido confirmado vira `em_producao`. O **aviso de estoque** da RPC é
  exibido.
- **Concluir** (`p3d_concluir_producao`): informa **peso real** e **horas reais** (e o
  material, se o trabalho não tiver). Baixa o material (movimento `saida_producao`), soma
  `horas_uso` na impressora e a libera. Não pode ser feito duas vezes. Os **avisos**
  (estoque negativo, abaixo do mínimo, manutenção devida) ficam visíveis até dispensar.
- **Cancelar** (`p3d_cancelar_producao`): só na fila, com motivo.
- **Registrar falha** (`p3d_registrar_falha`), com tipo de defeito, peso e horas perdidos,
  descrição, "criar reimpressão" e quantidade afetada.
- **Impressoras**: a tela mostra a impressora **ocupada e o trabalho atual** (para quem
  também vê Produção). A **Produtividade** (aba da Produção) é calculada de dados reais:
  horas de uso (cadastro), trabalhos concluídos/com falha, horas e peso reais medidos,
  concluídos por hora. Sem medição aparece "—".

## Regras de falha × estoque (importante)

| Situação | O que acontece | `baixou_estoque` |
| --- | --- | --- |
| Falha em trabalho **imprimindo** | Baixa o material perdido do estoque; o trabalho vira `falhou` | `true` |
| Falha em trabalho **já concluído** | **Não** baixa estoque de novo (o consumo já saiu na conclusão) | `false` |
| Falha em concluído com quantidade afetada **menor** que a do trabalho | Falha parcial: o trabalho continua `concluida` | `false` |
| "Reimprimir" marcado | Cria um novo trabalho na fila (`reimpressao_de`) | — |

Consequência para os números: o `custo_material` de uma falha com `baixou_estoque=false` **já
está contido** no consumo do trabalho concluído. A tela de Qualidade, ao somar o
desperdício, mostra esse valor **separado** ("já contido no consumo") e **não** o soma ao
"material perdido além do consumo", para não contar o mesmo material duas vezes.

## Qualidade (`p3d_qualidade`)

- **Para inspecionar**: trabalhos `concluida` com `qualidade='pendente'`. **Registrar
  inspeção** (`p3d_registrar_inspecao`): `aprovado | reprovado | retrabalho`; reprovado
  exige ≥ 1 defeito e pode "reimprimir" (a RPC dispara a falha e a reimpressão). Reprovado
  trava o pedido em "pronto" até ser resolvido.
- **Histórico** de inspeções e falhas (somente leitura).
- **Extra `custos` ("Ver custos das falhas")**: sem ele o servidor **não seleciona**
  `custo_material` nem `custo_maquina_estimado` das falhas, e a tela mostra só quantidades
  (g, horas, contagens): nenhuma soma em R$ de custo ou desperdício. A mensagem de "Registrar
  falha" em Produção também só leva custo para quem tem o extra de Qualidade. O rótulo do extra vem
  do catálogo (`modulos.permissoes_extras`), e a matriz de sócios o lê de lá.
- **Quem só tem Qualidade** lê `p3d_producao` (policy própria) e inspeciona a lista de concluídos
  pendentes normalmente. A escrita continua só por RPC.
- **Indicadores** (dados reais): **taxa real = trabalhos com ao menos uma falha ÷ (trabalhos
  concluídos + com falha)**, comparada com a **taxa estimada** (`falha_pct` da Precificação,
  só se a pessoa vê Precificação). Falha parcial conta no numerador; reimpressão é um
  trabalho próprio. Quebras por impressora, material, produto e tipo de defeito. Sem base,
  "sem dados".

## Expedição (`p3d_expedicao`)

- Envio de pedido **pronto ou enviado**: transportadora, serviço, **código e link de
  rastreio digitados à mão**, custo do frete, peso, volumes, previsão. Excluir só em
  preparação.
- Status (`p3d_mudar_status_envio`): `preparando→postado`; `postado→em_transito|entregue|
  problema|devolvido`; `em_transito→entregue|problema|devolvido`;
  `problema→em_transito|entregue|devolvido`. Postar leva o pedido a `enviado`; entregar o
  último envio leva a `entregue`. Entregue pede quem recebeu.
- **Pendência documentada**: integração com Correios/transportadoras (cotação de frete,
  etiqueta, rastreio automático) depende de **credenciais externas** e **não foi simulada**.
  O link de rastreio só aceita `http(s)`.

## Visão geral do dono e alertas

Cards por módulo ligado (só contagens, sem valores): **pedidos com prazo vencido**
(abertos de novo a pronto, prazo anterior a hoje), **trabalhos urgentes na fila**,
**compras aprovadas aguardando recebimento**, **manutenção devida** (Impressoras, da Etapa A),
envios em aberto, trabalhos para inspecionar/reprovados.

## Regras de escrita (Etapa B): o banco barra, o código nunca tenta

Nunca enviados em insert/update direto:

- `p3d_compras`: `status`, `numero`, `subtotal`, `total`, `recebida_em`, `conta_pagar_id`.
- `p3d_compra_itens`: `preco_unitario` (gerado).
- `p3d_pedidos`: `status`, `status_pagamento`, `numero`, `origem`, `orcamento_id`,
  `subtotal`, `total`, `custo_total`, `lucro_total`, `pago_valor`, `cancelado_*`.
- `p3d_pedido_itens`: `preco_total`, `custo_total`, `lucro` (calculados).
- `p3d_producao`: `status`, `numero`, `horas_reais`, `peso_real_g`, `qualidade`,
  `iniciado_em`, `concluido_em`, `consumo_registrado_em`, `reimpressao_de`.
- `p3d_envios`: `status`, `postado_em`, `entregue_em`, `recebedor`.
- `p3d_falhas`: `custo_material` e `custo_maquina_estimado` só são selecionadas com o extra
  `custos` de Qualidade (a auditoria falha em select de custo sem `verCustos`).
- Somente leitura (escrita só por RPC): `p3d_pedido_pagamentos`, `p3d_pedido_historico`,
  `p3d_inspecoes`, `p3d_falhas`.

`scripts/auditar-isolamento.mts` **falha** em escrita direta desses campos, em escrita nas
tabelas somente leitura, em schema de formulário que aceite campo protegido e em `.rpc("p3d_...")`
sem guarda de acesso, vinda de componente client ou das RPCs internas de apoio
(`p3d_estoque_aplicar`, `p3d_pedido_set_status`, `p3d_recalc_*`, `p3d_calcular_preco`).
Os textos das RPCs e das regras do banco (`raise exception`) são mostrados como vieram.

## Limitações da Etapa B

- Listas auxiliares (fornecedores, produtos, pedidos, impressoras, materiais, clientes) só
  carregam com acesso ao módulo dono da lista; senão aparecem vazias e a tela avisa.
- Trabalhos de pedido só nascem por "Gerar produção"; a tela não vincula trabalho avulso a
  pedido à mão.
- Listas de Produção e Qualidade carregam os últimos 2.000 registros (a tela avisa quando
  corta); o histórico de preços, os últimos 3.000.
- O custo de máquina da falha é **estimado**; custos de falha só aparecem com o extra `custos`
  de Qualidade.
- Registrar falha pela tela só existe em Produção (trabalho imprimindo ou concluído); em
  Qualidade a falha nasce da inspeção reprovada.
- "Hoje" nos alertas de prazo (pedidos vencidos, trabalhos) e nos padrões de data do nicho é a
  data em **America/Sao_Paulo** (`hojeSaoPaulo`, `lib/impressao-3d/datas.ts`), não a de UTC. O
  resto do app (Financeiro etc.) segue usando UTC.
- Sem integração com transportadoras/Correios e sem consulta automática de rastreio.

## Testes (Etapa B)

`testar-acesso.mts` (seção *Etapa B*) cobre transições de status, ordem da fila, prazo
vencido, saldo/total, conversão rolos→base, cotações, taxa real, desperdício sem dupla
contagem, produtividade, leitura defensiva dos retornos das RPCs, validações, campos
forjados, extra `custos` de Pedidos, permissões cruzadas (Estoque, Financeiro, Pedidos,
Produção/Qualidade), registro/menu/matriz de sócios e o snapshot das empresas atuais.
**Não cobre** fluxo logado contra o banco real: ver o relatório de entrega.
