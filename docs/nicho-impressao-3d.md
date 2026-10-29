# Nicho Impressão 3D (Etapa A)

Impressoras, Estoque, Produtos e catálogo, Precificação e Orçamentos para quem
trabalha com impressão 3D sob demanda, loja de produtos ou print farm. Usa o
sistema de nichos e módulos que já existe (registro em `lib/modulos/registry.ts`,
`workspace_modulos`, `getAcessoModulo`, rótulos, `getEmpresaAtiva`): não há
sistema paralelo e não há `if` por nicho no código. O nicho `impressao_3d` e os
módulos `p3d_*` são **dados** no banco (`nichos`, `nicho_modulos`, `modulos`).

> Produção, pedidos e a conversão de orçamento aprovado em pedido são da
> **Etapa B** e não existem aqui.

## Módulos, rotas e permissões

| Chave do módulo | Rota | Extra de tela | Depende de |
| --- | --- | --- | --- |
| `p3d_impressoras` | `/impressao-3d/impressoras` | — | — |
| `p3d_estoque` | `/impressao-3d/estoque` | `custos` | — |
| `p3d_produtos` | `/impressao-3d/produtos` (e `/[id]`) | — | — |
| `p3d_precificacao` | `/impressao-3d/precificacao` | — | `p3d_impressoras`, `p3d_estoque` |
| `p3d_orcamentos` | `/impressao-3d/orcamentos` (e `/[id]`) | `custos` | `clientes`, `p3d_precificacao` |

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
| Horas de uso da impressora | Informadas à mão. A Etapa B (produção) passa a alimentá-las. |
| Produtividade real, taxa de falha medida, consumo real | **Não existem** na Etapa A (dependem da produção). A tela não mostra gráficos disso. |

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
rascunho`; `recusado | expirado → rascunho`. **`aprovado` é final** nesta etapa
(a conversão em pedido vem na Etapa B). O banco também reconhece `convertido`, que
a tela só exibe.

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

- Sem produção, fila, pedidos, loja, integração real com impressoras ou gráficos de
  produtividade (Etapa B). `integracao_tipo`/`integracao_url` são só cadastro.
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

1. Conferir no catálogo `modulos` as 5 chaves `p3d_*` (hoje `ativo = false`).
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
