# Nicho Impressão 3D (Etapas A, B, C-1, D e E)

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

1. Conferir no catálogo `modulos` as 14 chaves `p3d_*` (Etapas A, B e C-1; hoje `ativo = false`).
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


---

# Etapa C-1: Dashboard, Relatórios, Notificações e automações, Integrações e Configurações

Quatro módulos novos no mesmo sistema de módulos (registro, `workspace_modulos`, guard por módulo) e um
hub de configurações. O catálogo `modulos.ativo` segue `false` até a ativação manual.

| Chave do módulo | Rota | Extra de tela | Banco |
| --- | --- | --- | --- |
| `p3d_dashboard` | `/impressao-3d/dashboard` | `custos` | RPC `p3d_painel` |
| `p3d_relatorios` | `/impressao-3d/relatorios` | `custos` | RPCs `p3d_relatorio_vendas`, `p3d_relatorio_produtos`, `p3d_relatorio_produtividade` |
| `p3d_automacoes` | `/impressao-3d/notificacoes` (e `/alertas`) | — | `p3d_notificacoes` (leitura), `p3d_config_alertas`, RPCs `p3d_atualizar_alertas`, `p3d_marcar_notificacao` |
| `p3d_integracoes` | `/impressao-3d/integracoes` | — | `p3d_integracoes` |

Hub **Configurações do nicho**: `/configuracoes/nicho` (rota do painel, só fundador/cofundador), com atalhos
para Parâmetros de precificação, Alertas, Integrações, Módulos da empresa e Equipe e permissões. Aparece como
cartão em `/configuracoes` quando há módulo `p3d_*` ligado. Não grava nada.

## Dashboard (`p3d_dashboard`)

Um único retorno de `p3d_painel(p_ws, p_de, p_ate)` com seletor de período (formulário GET: `de` e `ate` na URL,
atalhos "Mês atual", "Mês anterior", "Últimos 30/90 dias", "Ano até hoje"). Sem período na URL o banco assume o
mês corrente em **America/Sao_Paulo** (`hojeSaoPaulo()` para os atalhos e os padrões). Período inválido (datas
inexistentes, inicial depois da final, mais de **366 dias**) volta ao padrão com a mensagem.

Cada número leva o rótulo da natureza:

| Número | Natureza |
| --- | --- |
| Faturamento (pedidos não cancelados), pedidos, ticket médio, recebido no período, a receber, abertos, atrasados | **Real** |
| Produção: fila, imprimindo, concluídas, falhas, trabalhos com falha, horas reais, taxa de falha | **Real** (taxa "—" quando não há trabalho medido) |
| Custo de material (pelas baixas de estoque) | **Real** |
| Lucro, custo e margem estimados; custo de máquina das falhas | **Estimado** (custos cadastrados na Precificação) |

- A seção **Resultado** só existe com o extra `custos`: o banco devolve `resultado = null` sem ele, e o leitor
  (`lerPainel(bruto, verCustos)`) ainda descarta a seção se vier. Sem o extra não aparece custo, lucro nem margem.
- O único gráfico é "Pedidos por status" (barras com `pedidos_por_status` do retorno). Sem série inventada.
- Alertas do painel levam aos itens: severidades → notificações (se há acesso a Automações), materiais abaixo do
  mínimo → Estoque, manutenção devida → Impressoras (cada link só com acesso ao módulo de destino).
- O campo `tipo_valores` do retorno não é usado: a natureza de cada número é fixa na tela, conforme a tabela acima.
- Abrir o Dashboard pede a atualização dos alertas (ver abaixo).

## Relatórios (`p3d_relatorios`)

Três abas, uma RPC por aba, filtro de período (máximo de 366 dias; sem período vale o mês corrente) e exportação
**CSV gerada no cliente** a partir do retorno (BOM UTF-8, separador `;`, decimal com vírgula, datas dd/mm/aaaa).
Texto que começa com `=`, `+`, `-` ou `@` recebe um apóstrofo para não virar fórmula na planilha.

- **Vendas** (`p_agrupar` = dia, semana ou mês): pedidos, faturamento e, com `custos`, lucro estimado. Total do período.
- **Produtos** (`p_limite` 10/20/50/100): quantidade, faturamento e, com `custos`, lucro e margem estimados. O faturamento por item
  é **antes do desconto do pedido** (a tela avisa); a lista vem ordenada por lucro (com custos) ou por faturamento.
- **Produtividade**: por impressora, horas de uso, concluídos, falhos, horas e peso reais, trabalhos com falha, taxa
  de falha real ("—" sem medição) e, com `custos`, custo estimado das falhas.
- Sem o extra `custos` as colunas e o CSV não têm lucro, margem nem custo.

## Notificações e automações (`p3d_automacoes`)

- `p3d_notificacoes` é **somente leitura** para o app (a auditoria falha em escrita direta). O banco gera e resolve
  os alertas em `p3d_atualizar_alertas(p_ws)`; o app só chama essa RPC e `p3d_marcar_notificacao(p_id, p_lida)`.
- **Atualização**: o sino, o Dashboard e a tela de notificações pedem a atualização ao abrir, com limite de
  frequência **no cliente** (no máximo 1 por minuto por empresa). Quem tem leitura em Automações **ou** no Dashboard
  pode disparar; quem só tem o Dashboard vê o total no sino mas não a lista.
- **Sino** no cabeçalho (só aparece com Dashboard ou Automações liberados): contador de alertas abertos, lista agrupada
  por severidade (crítico, aviso, informação), link para o item de referência (material, pedido, impressora,
  orçamento, compra ou falha) **somente se a pessoa abre o módulo de destino**; sem acesso, só o título. O id da
  referência só entra no caminho se for um UUID.
- **Histórico** (`/impressao-3d/notificacoes`): abertas e resolvidas, filtros por situação, tipo (os tipos que existem
  nos dados) e severidade; últimas 500. "Marcar como lida" exige edição em Automações.
- **Configurar alertas** (`/impressao-3d/notificacoes/alertas`): `estoque_baixo`, `manutencao`, `orcamento_validade`
  (liga/desliga) e `prazo_pedido_dias` (0–30), `pagamento_pendente_dias` (0–90), `compra_pendente_dias` (0–60),
  `falhas_recorrentes_limite` (1–50), `falhas_recorrentes_dias` (1–90). A linha é criada pelo banco na primeira
  atualização; se não existir, a tela chama `p3d_atualizar_alertas` e lê de novo. Update direto só dos 8 campos, filtrado
  pela empresa ativa, com edição em Automações.
- **Esta etapa NÃO envia e-mail, WhatsApp nem push**: são só notificações dentro do app. O envio externo depende das
  integrações (abaixo) e de infraestrutura no servidor.

## Integrações (`p3d_integracoes`): somente estrutura

Tipos: `whatsapp`, `monitoramento_impressoras`, `pagamento`, `correios`, `melhor_envio`, `ia`. Um cartão por tipo
com descrição, o que vai habilitar e o estado. **Nada é conectado, testado nem simulado**: não há botão "Testar
conexão" nem "Conectar" (a auditoria falha se surgir).

- `status`, `segredo_configurado`, `ultima_verificacao` e `ultimo_erro` pertencem ao servidor e são exibidos como
  **somente leitura**; o app nunca os envia (o banco os ignoraria). Enquanto `status = nao_configurada` a tela mostra a
  mensagem fixa **"Depende de credenciais externas e de configuração no servidor; ainda não conectada"**.
- Editável: `ativo` ("marcar como ativa", só registra a intenção) e `config` com **dados não secretos**, por upsert direto
  (`workspace_id,tipo`), mesclando com o que já houver na config. O banco rejeita chaves com token/secret/segredo/senha/
  password/apikey/authorization; a tela nunca pede nem guarda segredo, recusa valores que parecem token e URLs com
  usuário, senha ou parâmetros.
- Só fundador/cofundador altera e vê a configuração; quem tem leitura vê apenas o status (o servidor nem seleciona `config`).

| Tipo | Campos de `config` (não secretos) | O que exigirá quando for implementada |
| --- | --- | --- |
| WhatsApp | `id_numero`, `numero_exibicao`, `nome_conta` | **WhatsApp Cloud API**: número verificado e token de acesso no cofre do servidor |
| Monitoramento de impressoras | `software` (OctoPrint, Moonraker/Klipper, Bambu, outro), `url_base` | URL/endpoint **por impressora** e a chave de acesso de cada uma, no servidor (OctoPrint, Moonraker, Bambu) |
| Pagamento | `provedor`, `nome_conta` | Conta no provedor, chave de API e segredo do webhook no cofre |
| Correios | `contrato`, `cep_origem`, `nome_conta` | Contrato com os Correios e as credenciais do contrato, no servidor |
| Melhor Envio | `nome_conta`, `cep_origem`, `ambiente` | Conta no Melhor Envio e token OAuth no cofre |
| IA | `provedor`, `modelo` | Chave de API do provedor, no cofre |

## Regras de escrita (Etapa C-1): o banco barra, o código nunca tenta

- `p3d_notificacoes`: somente leitura. Alteração só por `p3d_marcar_notificacao`.
- `p3d_integracoes`: nunca enviar `status`, `segredo_configurado`, `ultima_verificacao`, `ultimo_erro`.
- `p3d_config_alertas`: só os 8 campos de limite (não enviar `updated_by`).
- `scripts/auditar-isolamento.mts` **falha** em: escrita direta em `p3d_notificacoes`; campo protegido de integração
  (também nos schemas de formulário); select de custo/lucro/margem sem `podeVerCustos`; leitura de Dashboard/Relatórios
  sem `verCustos`; coluna de custo fora de `verCustos` nos Relatórios; "hoje" em UTC; botão de conexão/teste; `onClick`
  na tela de integrações; `config` selecionada sem restringir a quem edita; e RPC sem guarda.

## Limitações da Etapa C-1

- Nada de envio externo (e-mail, WhatsApp, push) e nenhuma integração conectada.
- O significado do valor `0` nos limites de dias é definido pelo banco; a tela só exibe a faixa permitida.
- "Marcar como lida" exige edição em Automações (o contrato não define o nível; o banco decide e a mensagem dele aparece).
- Os tipos de notificação (`tipo`) são os que o banco gerar; o filtro lista os existentes nos dados.
- O Dashboard não usa `tipo_valores`; "Real" e "Estimado" são fixos por métrica.
- O catálogo `modulos` (linhas das 4 chaves, `permissoes_extras` com `custos`, `permite_membros`) é dado do banco e não foi
  verificado por este código; sem as linhas os módulos não aparecem para sócios.


---

# Etapa D: navegação e abas personalizáveis, e praticidade

Tudo aqui é **aparência ou atalho**: nenhuma alteração de módulos ligados, permissões ou dados.

## Personalizar navegação (`/configuracoes/navegacao`)

Tabela `menu_preferencias` (`workspace_id`, `user_id`, `itens`, `abas_ocultas`, `updated_at`):

- `user_id` nulo = **padrão da empresa** (só fundador/cofundador grava); `user_id` = a própria pessoa =
  **preferência pessoal**. Cada pessoa lê o padrão e a própria linha; ninguém lê a de outro (RLS).
- `itens`: `[{ chave, visivel, ordem }]`, com `chave` = rota sem a barra inicial (`leads`,
  `impressao-3d/estoque`, `dashboard`, `modulos`...). `abas_ocultas`: `{ "<módulo ou visao_geral>": ["<aba>"] }`.
- **Hierarquia ao montar o menu**: preferência pessoal → padrão da empresa → ordem do registro. Sem nenhuma
  linha, o menu é exatamente o de antes (o snapshot das empresas atuais não muda).
- A barra lateral recebe a preferência do layout (servidor), então o menu já chega montado, sem piscar. Não há
  menu mobile separado no app: a barra lateral é o único menu.
- **Regras**: Visão Geral, Módulos e Configurações nunca podem ser ocultados; itens novos (módulo ligado depois)
  entram no fim do grupo, visíveis; itens de módulos desligados somem do menu, mas a preferência guardada para eles
  é preservada ao salvar e volta quando o módulo é religado; a ordem é dentro de cada grupo.
- **Esconder item não bloqueia a rota**: o acesso pelo endereço continua regido só pela permissão (o proxy não lê
  preferência). A tela explica isso.
- Tela: só os itens que a pessoa já vê (registro ∩ módulos ligados ∩ permissão), agrupados como no menu, com
  mostrar/ocultar e subir/descer, pré-visualização (a mesma função da barra lateral), **Salvar** (pessoal),
  **Restaurar padrão** (apaga só a linha pessoal) e, para fundador/cofundador, **Salvar como padrão da empresa**.
- Atalhos: bloco do usuário na barra lateral ("Personalizar navegação") e um cartão em Configurações. Sócio e
  funcionário com algum módulo liberado também abrem a tela (exceção dentro de `/configuracoes`, que segue só do
  painel); vendedor nunca.
- **Gravação sem upsert** (o banco usa índices parciais): lê a linha; se existe, update pelo `id` e
  `workspace_id`; senão insert. Se outra sessão inserir no meio (violação de unicidade, `23505`), relê e faz
  update. Os erros do banco aparecem como vieram.

## Abas opcionais

Cada módulo do nicho declara `abas` no registro (`lib/modulos/registry.ts`), com chave estável; a primeira é a
aba de abertura. A Visão Geral usa a chave `visao_geral`.

| Tela | Abas (chave) |
| --- | --- |
| Impressoras (detalhe) | `dados`, `pecas`, `manutencoes` |
| Estoque | `materiais`, `historico` |
| Precificação | `simulador`, `config` |
| Fornecedores e compras | `compras`, `fornecedores`, `precos` |
| Produção | `fila`, `imprimindo`, `concluida`, `falhou`, `cancelada`, `produtividade` |
| Qualidade | `pendentes`, `historico`, `indicadores` |
| Dashboard 3D (seções) | `vendas`, `resultado`, `producao`, `alertas` |
| Relatórios 3D | `vendas`, `produtos`, `produtividade` |
| Notificações (situação) | `abertas`, `resolvidas`, `todas` |
| Visão Geral (`visao_geral`) | `primeiros_passos`, `resumo` |

- Mínimo de **1 aba visível** por tela (a tela de personalização e o servidor recusam ocultar todas; se uma linha
  antiga vier com tudo oculto, a tela mostra a primeira).
- A página lê as abas no servidor (`getAbasVisiveis`) e o board mostra só as visíveis. Se a aba padrão estiver
  oculta, abre a primeira visível; nos Relatórios, uma aba oculta pedida pela URL também cai na primeira visível.
- A seção "Resultado" do Dashboard continua exigindo o extra `custos`, além de estar visível.

## Módulos

O card de cada módulo ligado avisa, junto do botão **Remover**: "Remover não apaga nada: os dados ficam guardados
e voltam ao adicionar o módulo de novo." Remover chama `definir_modulo` com `habilitado = false` (só o flag em
`workspace_modulos`); nenhum código apaga dados.

## Clientes: Pedidos e orçamentos

No detalhe do cliente, com `p3d_pedidos` e/ou `p3d_orcamentos` ligados e leitura neles, aparece a seção
"Pedidos e orçamentos": total comprado (pedidos não cancelados), última compra, pedidos (número, data, status,
total, pago, prazo) e orçamentos (número, status, total), cada um com link. Nenhuma coluna de custo ou lucro é
lida. Sem os módulos, a página fica como antes.

## Financeiro por padrão

Com o Financeiro ligado e edição nele, "Lançar no Financeiro" (pagamento de pedido) e "Gerar conta a pagar"
(recebimento de compra, com vencimento obrigatório) vêm **pré-marcados**. Sem Financeiro (ou sem edição) as opções
não aparecem, e o servidor confere a permissão de novo ao gravar.

## Primeiros passos (Visão Geral)

Para empresa com nicho Impressão 3D, a Visão Geral do dono mostra um checklist marcado **só por dados reais**:
tarifa de energia informada (> 0), 1ª impressora, 1º material com preço, 1ª entrada de estoque, 1º produto,
1º orçamento e 1º pedido. Cada item leva à tela certa. **Desde a Etapa E só entram os passos de módulos LIGADOS**
(a empresa enxuta não é cobrada por Orçamentos ou Pedidos que não usa). Some quando tudo está concluído e pode ser
ocultado em Personalizar navegação (Visão Geral → Primeiros passos).

## Testes e auditoria (Etapa D)

`testar-acesso.mts` (seção *Etapa D*): menu sem preferência idêntico ao snapshot, itens fixos nunca ocultos, ordem
e itens novos, preservação de módulos desligados, hierarquia, rota não bloqueada por preferência, acesso à tela de
navegação por papel, contrato de gravação (sem upsert, corrida, restaurar só a pessoal), abas mínimas e de
abertura, Primeiros passos, Módulos, Clientes e Financeiro. `auditar-isolamento.mts` falha em escrita em
`menu_preferencias` fora de `configuracoes/navegacao/actions.ts`, em upsert nela, em campo fora do contrato
(`itens`, `abas_ocultas`, `workspace_id`, `user_id`, `updated_at`), em delete que não filtre `user_id` e em escrita
de módulos/permissões a partir da navegação.


# Etapa E: nicho enxuto (calculadora de preço, cadastros simples, equipe e cofundadores)

Feedback de uso real: o nicho estava complexo demais. O principal é (1) cadastrar materiais com o que se paga e
(2) uma calculadora com peso, tempo e quantidade que mostra o custo por peça e o preço sugerido. **Nada foi
removido**: o que existia passa a ficar atrás de "Modo avançado" / "Mais opções".

## Empresa nova enxuta

Empresa nova de Impressão 3D nasce só com `p3d_estoque`, `p3d_impressoras` e `p3d_precificacao`; os demais módulos
são opcionais pela página **Módulos** (Leads, Renegados, Vendedores e Agenda não ligam mais nesse nicho). Isso é
**dado do banco** (`nicho_modulos`), já aplicado; empresas existentes não mudaram. Novas configurações de
precificação nascem em `modo_preco = 'markup'` com `markup_pct = 400` (= multiplicador ×5).

- **Primeiros passos** só mostra passos de módulos ligados (`montarPassos` filtra); o passo de precificação passa a
  ser "tarifa de energia informada" (o valor da hora é opcional e só entra em "Incluir também").
- Visão Geral: cartão discreto **"Precisa de mais?"** (Orçamentos, Pedidos, Produção, Fornecedores, Qualidade,
  Expedição, Dashboard e Relatórios que ainda estão desligados) que leva a Módulos; some quando todos estão ligados
  (`modulosOpcionaisFaltando`).
- Página **Módulos**: cada módulo do nicho mostra uma frase de 1 linha (para que serve e que os dados ficam
  guardados ao remover) — `lib/impressao-3d/frases-modulos.ts`.

## Calculadora de preço (`/impressao-3d/precificacao`)

O item de menu e o rótulo do módulo `p3d_precificacao` passam a **Calculadora de preço**. A tela abre na
**Calculadora rápida**; o botão **Modo avançado** leva ao Simulador completo e às Configurações da empresa (as abas
`simulador` e `config` continuam existindo e podem ser ocultadas em Personalizar navegação; `calculadora` é a nova
aba padrão).

Campos: Material (do estoque, com o custo por g do cadastro, ou "informar na hora" com preço e peso do rolo);
Impressora (opcional; sem ela energia e depreciação ficam zeradas, com aviso e link para cadastrar); peso por peça
(g, do fatiador); tempo por peça (h e min); quantidade (x); tarifa de energia editável com **Salvar como padrão**
(`salvarTarifaPadrao`: atualiza só `tarifa_kwh` de `p3d_config_precificacao`, por quem edita); multiplicador
(padrão ×5, ou o da configuração se ela for markup) ou **Margem %**. Só o peso (sem tempo) é aceito, com aviso.

**A tela nunca calcula preço.** `montarEntradaRapida` (`lib/impressao-3d/calculadora-rapida.ts`, puro) monta
`p_entrada` e a tela mostra o retorno de `p3d_simular_preco` (atualiza ao digitar, debounce de 400 ms):

| Entrada da tela | `p_entrada` |
| --- | --- |
| peso/tempo por peça × x | `peso_peca_g`, `horas_impressao` (lote inteiro), `quantidade` |
| multiplicador | `modo_preco: 'markup'`, `markup_pct = (mult − 1) × 100` (×5 → 400) |
| margem | `modo_preco: 'margem'`, `margem_pct` |
| material | `material_id` ou `preco_rolo` + `peso_rolo_g` |
| impressora | `impressora_id`; sem ela `potencia_media_kw`, `valor_aquisicao`, `valor_residual` = 0 |

No modo rápido o cálculo é só material + depreciação + energia + multiplicador: `desperdicio_pct`, `falha_pct`,
`manutencao_hora`, `manutencao_ciclo`, `mao_obra_horas`, `acabamento_horas`, `montagem_horas`, `embalagem_custo`,
`despesas_fixas_pct`, `impostos_pct`, `taxa_pagamento_pct`, `comissao_pct`, `taxa_fixa_pagamento`, `preco_minimo` e
`arredondar_para` vão como **0 explícito** (o que vem em `p_entrada` vence config/impressora/material). A seção
**Incluir também** (desperdício, falhas, manutenção, mão de obra/acabamento, embalagem, impostos e taxas) vem com as
caixas desmarcadas; ao marcar, os campos aparecem pré-preenchidos com a configuração da empresa (manutenção, com a
impressora escolhida) e são enviados no lugar do zero. Despesas fixas, preço mínimo e arredondamento só no modo
avançado.

Resultado (sempre "Estimado"): custo por peça com a composição, custo do lote, **preço sugerido por peça** e do lote,
lucro e margem real, avisos da RPC e da tela. **Copiar resumo** gera o texto para WhatsApp (peça, quantidade, preço
por peça e total, sem custos). **Criar orçamento com este cálculo** aparece só com Orçamentos ligado e edição
(`usarSimulacaoEmOrcamento`; o servidor recalcula ao salvar).

## Cadastros simples

- **Material** (Estoque): visíveis nome/descrição, tipo, material (PLA, PETG...), cor (com seletor), preço pago, peso
  do rolo e "quantos rolos comprei". Com rolos > 0 a criação dá a entrada de estoque por `p3d_movimentar_estoque`
  (`custo_total = rolos × preço`, só com o extra `custos`; zero rolos só cadastra). Marca, diâmetro, estoque mínimo,
  fornecedor, localização e unidade ficam em **Mais opções** (continuam sendo enviados). A lista mostra cor, saldo
  (g e rolos aproximados), custo por g e alerta de mínimo.
- **Impressora**: visíveis nome, preço pago, vida útil estimada (h), potência média em **watts** (grava
  `potencia_media_kw = W / 1000`) e o custo/hora ao vivo (depreciação e energia, "Estimado"). O resto (marca, modelo,
  volume, bico, valor residual, manutenção, integração...) fica em **Mais opções**.

## Equipe e cofundadores

O item de menu "Sócios" virou **Equipe e cofundadores** (`/socios`): visível para fundador e cofundador, **fixo**
(nunca pode ser ocultado em Personalizar navegação), com cartão em Configurações e atalho em "Configurações do
nicho". A tela oferece **Convidar cofundador** e **Convidar sócio ou funcionário** (RPC `convidar_membro`), mostra o
link `/convite/<token>` com botão copiar (o app não envia e-mail), convites pendentes com cancelar e pessoas atuais
com remover, e explica: cofundador tem o mesmo poder do fundador e, com 2 ou mais fundadores, as alterações passam
pela aprovação de todos em Aprovações (com 1 fundador, valem na hora).

## Testes e auditoria (Etapa E)

`testar-acesso.mts` (seção *Etapa E*): multiplicador ↔ `markup_pct`, x peças, zeros forçados, "Incluir também",
margem, W → kW, entrada por rolos, resumo de WhatsApp, Equipe e cofundadores, começo enxuto. `auditar-isolamento.mts`
**falha se a Calculadora de preço calcular preço no cliente** (`lib/impressao-3d/auditoria-preco.ts`: custo ×
multiplicador, custo ÷ (1 − margem), preço atribuído por multiplicação...) ou se deixar de chamar a RPC.


## Etapa E (parte 2): filamentos marcados, estoque de peças e produção com vários materiais

### Filamentos marcados (calculadora, simulador avançado e orçamento)

A Calculadora rápida troca o campo único de material por **"Filamentos usados neste projeto"**: uma lista (mínimo 1
linha, adicionar/remover) em que cada linha escolhe um filamento do estoque (mostrando cor, custo por kg e saldo) ou
**informa na hora** (nome, cor opcional, valor do kg) e o peso **por peça** daquele filamento.

`p_entrada.materiais` (peso do **lote** = peso por peça × quantidade):

- do estoque: `{material_id, peso_g}`;
- informado na hora: `{nome, cor?, peso_g, preco_por_g}` com `preco_por_g = valor do kg ÷ 1000`.

Com a lista, **não** se envia `material_id`, `preco_por_g`, `preco_rolo`, `peso_rolo_g` nem `peso_peca_g` no topo
(a lista é a fonte; as demais regras da calculadora rápida não mudam). O resultado mostra **uma linha por filamento**
(`calculo.detalhes.material.itens[{material_id, nome, cor, peso_g, preco_por_g, custo}]`) e, para filamento do estoque
cujo peso total passa do saldo, "Faltam X g" (comparação informativa, sem bloquear). "Criar orçamento com este
cálculo" leva a lista ao item. O simulador avançado ganhou "Vários filamentos no mesmo trabalho (opcional)" (pesos do
lote; o material único continua como alternativa) e `materiais` é um campo **do item** do orçamento (sobrevive ao
"Recalcular com valores atuais").

### Cadastro de filamento por kg

Visíveis: nome/descrição, tipo, material, cor (seletor + `cor_hex`), **Valor pago por kg** e **Quanto comprei** (kg ou g;
0 = só cadastra). Grava `preco_compra = valor do kg` e `peso_liquido_rolo_g = 1000` (assim `custo_cadastro` = valor do
kg ÷ 1000 por g); o peso do rolo enviado pelo cliente é ignorado. "Quanto comprei" vira `p3d_movimentar_estoque`
(`entrada`, gramas, `p_custo_total = kg × valor do kg`, só com o extra `custos`). **Nova compra** por filamento é uma
nova entrada com o valor pago (atualiza o custo médio). Unidade, marca, diâmetro, estoque mínimo, fornecedor e
localização ficam em **Mais opções**. A lista mostra cor, saldo em kg/g, custo por kg (cadastro e médio) e alerta de
mínimo. Nunca se envia `estoque_atual`, `custo_medio` nem `ultimo_custo`.

### Estoque de peças (aba "Peças" do módulo `p3d_estoque`)

O Estoque tem as abas **Material** (`materiais`), **Peças** (`pecas`) e **Histórico de material** (`historico`), com
chaves estáveis no registro (respeitam as abas ocultas e o mínimo de 1 visível). Peças usam as **mesmas permissões** do
estoque de material (sem módulo novo; o extra `custos` esconde o custo médio).

- `p3d_pecas_estoque` (produto, variação, `quantidade` inteira, `custo_medio`, `estoque_minimo`, `localizacao`):
  insert/update direto **só** de produto, variação, mínimo e localização; quantidade e custo médio **só por
  movimentação**. Excluir só linha sem saldo e sem histórico.
- `p3d_movimentos_pecas`: somente leitura (a tela mostra a **origem**: "Produção #n", "Pedido #n" ou "Manual").
- `p3d_movimentar_pecas`: a tela lança **entrada manual, perda e ajuste** (devolução também é aceita na action;
  ajuste com sinal e motivo obrigatório). `producao` e `venda` são das telas de Produção e de Pedidos, nunca daqui.
  Saldo negativo é recusado pelo banco (mensagem como veio).
- "Nova peça no estoque": escolhe produto/variação, com quantidade inicial opcional e **criar produto rápido** (só o
  nome) para quem edita Produtos. Sem o módulo Produtos ligado a aba convida a adicioná-lo em Módulos.

### Produção com vários materiais

- **Produzir para o estoque de peças** (trabalho avulso): produto (+variação), quantidade, impressora, **lista de
  filamentos com peso estimado** (grava `p3d_producao` e `p3d_producao_materiais`; com a lista, `material_id` fica
  nulo e o peso estimado é a soma). Linhas só mudam com o trabalho na fila.
- **Concluir**: trabalho com linhas de material abre um diálogo com **uma linha por filamento** (estimado
  pré-preenchido, real editável) + horas reais → `p3d_concluir_producao_multi` (exige o consumo de TODOS os materiais;
  os materiais vêm do banco, não do formulário). A conclusão simples (`p3d_concluir_producao`) só roda depois de a
  action conferir que o trabalho **não** tem linhas de material. Avisos: estoque negativo, abaixo do mínimo,
  manutenção devida e **"N peças entraram no estoque de peças"** (trabalho concluído **sem pedido e com produto**;
  produção de pedido não mexe no estoque de peças).
- **Falha** em trabalho multi mantém a assinatura de `p3d_registrar_falha`: a perda total é dividida
  proporcionalmente aos pesos estimados dos filamentos e a reimpressão copia a lista (a tela avisa).

### Pedidos

Cada item com produto mostra **"Em estoque: N peças"**; o chip **"Baixado do estoque"** aparece no item já baixado
(`pecas_baixadas_em`, somente leitura), que não pode mais mudar produto/quantidade nem ser removido (devolva antes).
Botões **Baixar do estoque de peças** (`p3d_baixar_pecas_pedido`) e **Devolver peças ao estoque**
(`p3d_devolver_pecas_pedido`) só aparecem com edição em Pedidos **e** em Estoque; erros do banco aparecem como vieram
(ex.: faltou peça).

### Primeiros passos e auditoria

Primeiros passos: filamento com valor do kg, 1ª entrada de estoque, 1ª impressora, tarifa de energia, 1º produto
(só de módulos ligados). A auditoria (`auditar-isolamento.mts`) falha em escrita direta em
`p3d_pecas_estoque.quantidade/custo_medio`, em `p3d_movimentos_pecas`, em `p3d_producao_materiais.peso_real_g`, em
`p3d_pedido_itens.pecas_baixadas_em`, em uso de `p3d_concluir_producao` fora da action que confere os materiais e em
preço ou saldo recalculados no cliente (`lib/impressao-3d/auditoria-preco.ts`).


## Equipe e cofundadores (correção)

- **Bloco fixo na barra lateral**: Módulos, **Equipe e cofundadores**, Aprovações e Configurações ficam num bloco
  "Empresa" **fora da área que rola** (`GRUPO_EMPRESA`), sempre visível para fundador e cofundador, com qualquer
  conjunto de módulos (inclusive nenhum). Sócio, funcionário e vendedor não recebem o bloco. O item `socios` está em
  `ITENS_FIXOS` (não pode ser ocultado em Personalizar navegação, nem por preferência já gravada) e tem cartão em
  Configurações.
- **Tela** (`/socios`, rota livre, só painel): Convidar cofundador / Convidar sócio ou funcionário
  (`convidar_membro`; sócio/funcionário com matriz por módulo ligado). Com 1 fundador a RPC devolve o token e a tela
  mostra o link `/convite/<token>` com Copiar e a mensagem "Envie este link para a pessoa. Ela precisa criar a conta com
  este mesmo e-mail e abrir o link. O app não envia e-mail."; com 2+ fundadores a RPC devolve NULL, o convite vai para
  aprovação e o link só aparece em Aprovações depois que todos aprovarem (a tela explica). Convites pendentes (e-mail,
  papel, expiração) com Cancelar (`cancelar_convite_empresa`); o link não pode ser mostrado de novo (a RPC de listagem
  não devolve o token). Pessoas da empresa = `fundadores_da_empresa` + `listar_membros_empresa`, sem repetir: o fundador
  original não é removível; cofundador, sócio e funcionário saem por `remover_membro` (com confirmação) e sócio/funcionário
  editam permissões (`atualizar_permissoes_membro`).
- **Erros das RPCs aparecem como vieram** (`sociosErrorMessage` só troca a sessão expirada). Antes, qualquer mensagem
  que citasse "fundador" ou "permissão" virava um texto genérico ("Só os fundadores podem fazer isso"), inclusive para o
  próprio fundador.


## Cofundador por código (substitui o convite de cofundador por link)

O fundador **não** convida cofundador por e-mail/link: ele gera um **código**, a pessoa digita e o fundador **aprova**.
O convite por link continua só para sócio e funcionário (a opção "Cofundador" saiu do formulário e a action recusa).

- **Gerar** (`gerar_codigo_cofundador(p_ws, p_validade_horas)` → `{ codigo, expira_em }`): validade de 1 h, 24 h, 72 h
  (padrão) ou 7 dias (a RPC aceita de 1 a 168 h); invalida o código anterior ainda não usado; máximo de 4 cofundadores
  ativos (mensagem do banco, como veio). **Cancelar** = `cancelar_codigo_cofundador(p_ws)`. O código **ativo** é lido de
  `workspace_codigos_cofundador` (somente leitura): `usado_em` nulo, `cancelado_em` nulo e `expira_em` no futuro; uso único.
- **Digitar**: a pessoa abre **"Entrar numa empresa com código"** (`/acesso-vendedor`, alcançável por QUALQUER conta
  logada: rodapé da barra lateral para todos os papéis e do menu do vendedor, e cartão em Configurações) e usa a RPC
  existente `solicitar_acesso`, que reconhece o código de cofundador (maiúsculas/minúsculas e traços/espaços ignorados).
  O pedido nasce em `solicitacoes_vendedor` com `papel_solicitado = 'cofundador'` e status `pendente`; a tela mostra
  "Pedido enviado. Aguarde a aprovação do fundador." Aprovado, a empresa vira a ativa e aparece no seletor de empresas.
- **Aprovar** (`responder_solicitacao_acesso`): bloco **Pedidos de cofundador pendentes** na tela *Equipe e cofundadores*
  (e no sino, rotulado **COFUNDADOR**), com confirmação: "Cofundador tem o MESMO poder do fundador: pode alterar a empresa,
  convidar e remover pessoas. Confirme que o e-mail … é a pessoa certa." Com 1 fundador é imediato; com 2+ a RPC retorna
  sem executar e o pedido vai para **/aprovacoes** (rotulado "Pedido de acesso (COFUNDADOR)"), executando só quando TODOS
  os fundadores aprovarem. A página de Vendedores e a contagem da Visão Geral **não** listam pedidos de cofundador.
- **Erros** de `solicitar_acesso`, `responder_solicitacao_acesso` e das RPCs de equipe aparecem **como vieram** (código usado,
  expirado, cancelado, "este é o seu próprio código", "já é cofundador", "já tem pedido pendente").
- **Pessoas da empresa**: `fundadores_da_empresa` + `listar_membros_empresa` + `pessoas_da_empresa`, sem repetir; o fundador
  original não é removível; cofundador, sócio e funcionário saem por `remover_membro` (com confirmação).
- **Auditoria**: falha em escrita direta em `membros`, `convites`, `perfis_tipos_ativos`, `solicitacoes_vendedor` e
  `workspace_codigos_cofundador` (a tela de equipe só usa RPC); as leituras do código são sempre por `workspace_id`.

## Quem comprou e a data da compra

Cada compra registra **quem pagou** e **quando**. Serve para acertar quem pagou o quê entre os sócios.

- **Seletor "Quem comprou"**: as pessoas da empresa (`pessoas_da_empresa`: fundador, cofundador, sócios e funcionários; o
  padrão é quem está logado), **"Outra pessoa (digitar nome)"** (grava só `comprador_nome`, até 80 caracteres) e
  **"Não informado"**. Pessoa da lista grava só `comprador_user_id`; o banco preenche o nome. A montagem do par e a regra da
  data (vazia = hoje; **nunca depois de hoje**, em America/Sao_Paulo) são funções puras em `lib/impressao-3d/comprador.ts`.
- **Onde aparece**: cadastro de material ("Quanto comprei"), **Nova compra**, **Entrada** (os três chamam
  `p3d_registrar_entrada_material`, que passou a ser o caminho de toda compra de material; `p3d_movimentar_estoque` ficou
  para ajuste e perda); cabeçalho da **compra** (a data que já existia é a "Data da compra"; ao receber, o banco repassa
  para as entradas); **impressoras** (`data_aquisicao` é a data da compra) e **peças de desgaste** (só quem comprou: a
  tabela não tem data de compra).
- **Histórico**: a aba *Histórico de material* ganhou as colunas **Comprador** e **Data da compra** nas entradas, com
  **Corrigir comprador** por entrada (`p3d_corrigir_comprador`, tipo `movimento`, exige edição em Estoque). Na compra já
  recebida, o mesmo (tipo `compra`, exige edição em Fornecedores) e o banco atualiza também as entradas. A aba *Preços* de
  Fornecedores mostra o comprador da compra de cada linha (a visão `p3d_historico_precos` não traz o comprador).
- **Gastos por pessoa** (`p3d_gastos_por_comprador(p_ws, p_de, p_ate)`: materiais, equipamentos e total por pessoa, com
  CSV como os demais relatórios): é a aba **Gastos por pessoa** de *Relatórios* quando o módulo está ligado, visível só a
  fundador/cofundador ou a quem tem o extra **custos**; sem Relatórios, é um atalho no *Estoque* (`/impressao-3d/estoque/gastos`)
  só para fundador/cofundador. Sem comprador = "Não informado". O banco confere a permissão de novo.
- **Auditoria** (`lib/impressao-3d/auditoria-comprador.ts`): falha se uma tela chamar `p3d_movimentar_estoque` com tipo
  `entrada` ou escrever direto em `p3d_movimentos_estoque` (comprador e data são somente leitura).
- **Celular**: os campos novos ficam em coluna única, com fonte de 16 px e alvos de 44 px (regras globais de formulário).

## Estoque → Material: atualizar quantidade e conferir estoque

Para ir mantendo o estoque em dia sem precisar entender de entrada, ajuste ou perda:

- **Saldo em destaque** em cada item ("Tem agora"): filamentos em **g e em kg**, demais materiais na própria unidade
  (`un`, `ml`), com o mínimo logo abaixo. No celular o cartão fica em coluna única.
- **Atualizar quantidade**: abre "Quanto tem agora?" já preenchido com o saldo atual, um **motivo** (Contagem/inventário,
  Uso fora do sistema, Perda, Outro) e uma observação opcional. O servidor lê o saldo do banco, calcula a **diferença com sinal**
  (contagem − saldo) e chama `p3d_movimentar_estoque(p_ws, material, 'ajuste', diferença, observação)`. Diferença zero **não
  chama o banco**. A tela nunca grava `estoque_atual`, `custo_medio` nem `ultimo_custo`.
- **Conferir estoque** (botão ao lado de *Novo material*): lista os itens do filtro atual, cada um com "Quanto tem agora?"
  preenchido. Ao salvar, gera um ajuste **só para as linhas alteradas**, todos com "Conferência de estoque em dd/mm/aaaa".
  Um valor inválido barra tudo; se um ajuste falhar no meio, a mensagem diz quantos já valeram.
- **Editar o cadastro** é um clique no botão **Editar** do item (nome, cor e seletor de cor, estoque mínimo, preço de
  referência, localização, já abertos): não mexe em saldo nem em custo médio, que só mudam por movimentação.
- **Histórico de material**: o ajuste aparece como "Ajuste", com a variação (+/−), o motivo (na observação) e **Feito por**.
- **Alertas de mínimo**: depois do ajuste o servidor pede ao banco que reavalie os alertas (`p3d_atualizar_alertas`, para quem
  tem Automações ou Dashboard); o sino também reavalia sozinho ao abrir.
- **Código**: contas e textos em `lib/impressao-3d/ajuste-estoque.ts` (puro, testado); auditoria em
  `lib/impressao-3d/auditoria-estoque.ts`, que falha se qualquer tela ou action escrever esses campos direto.

## Estoque → Material: preço pago, kits e conferência com saída

Ajustes vindos do uso real:

- **Conferir estoque** abre em tela cheia com **Confirmar** e **Cancelar** fixos no topo e no rodapé (no celular, respeitando a
  área segura). Confirmar salva só as linhas alteradas (um ajuste por linha), marca as partes de kit que acabaram, mostra
  "N itens atualizados" e volta à lista. Cancelar ou **Esc** volta sem salvar; com alterações pendentes pede confirmação
  para descartar.
- **O destaque é o preço pago**, não o peso: cada item mostra **"Pago R$ X"** (soma de todas as entradas, da visão
  `p3d_materiais_resumo`) em negrito e grande, e nos filamentos **"R$ Y/kg"** (custo médio por g × 1000; sem custo médio, o do
  cadastro). O saldo vira texto curto e cinza ("1 kg em estoque", "9 de 12 disponíveis"). Sem o extra **custos**, não há
  preços e o saldo volta a ser o texto principal. A lista é ordenada por nome; quem vê custos pode ordenar por **valor pago**.
  Kits e conjuntos não mostram "custo por unidade".
- **Kits/conjuntos**: no cadastro, "É um kit/conjunto" + "Quantas peças/cores tem no kit" grava `kit = true`, `kit_itens` e a
  unidade `un` (o servidor força); o preço pago é o valor do kit e o saldo é o número de kits. **Cores do kit**
  (`p3d_material_partes`): cor (seletor + nome), **Acabou** (com confirmação leve) e **Desfazer**, data em que acabou (preenchida
  pelo banco) e observação, **Adicionar cor**. Quando todas acabam, a tela **sugere** "Marcar kit como zerado" (ajuste de -1
  com a observação "Kit acabou"); nunca faz sozinha. Na conferência, os kits mostram as cores com "Acabou".
- **Investimento no topo da aba Material** (só com o extra **custos**): **Total investido** (grande), **Valor em estoque hoje**
  (saldo × custo médio dos itens ativos) e **Gasto por pessoa** (clique abre materiais, equipamentos e total). Vêm de
  `p3d_resumo_investimento`; a tela só mostra. Erro do banco aparece como veio.
- **Auditoria**: falha se uma tela somar `total_investido`/`valor_em_estoque` ou calcular saldo × custo médio
  (`lib/impressao-3d/auditoria-estoque.ts`), além da regra de não escrever `estoque_atual`/`custo_medio` direto.
