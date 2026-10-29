"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { StatusChip } from "@/components/status-chip";
import { useToast } from "@/components/toast";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import {
  AreaTexto, Aviso, BotaoNovo, BotaoPrimario, BotaoTexto, Cartao, Entrada, ErroForm, Numero, Seletor,
  SomenteLeitura, Vazio, useAcao,
} from "@/components/impressao-3d/campos";
import {
  CamposPedido, TOM_PAGAMENTO, TOM_PRIORIDADE, TOM_STATUS_PEDIDO, nomeDoCliente,
} from "@/components/impressao-3d/pedidos-board";
import { ComposicaoCalculo } from "@/components/impressao-3d/composicao-calculo";
import { ParametrosUsados } from "@/components/impressao-3d/simulador";
import {
  atualizarPedido, excluirPedido, gerarProducaoDoPedido, mudarStatusPedido, registrarPagamento,
  removerItemPedido, salvarItemPedido,
} from "@/app/(dashboard)/impressao-3d/pedidos/actions";
import { lerCalculo } from "@/lib/impressao-3d/calculo";
import {
  FORMA_PAGAMENTO_ROTULO, PRIORIDADE_ROTULO, STATUS_PAGAMENTO_ROTULO, STATUS_PEDIDO_ROTULO, STATUS_PRODUCAO_ROTULO,
  type Pedido, type PedidoHistorico, type PedidoItem, type PedidoPagamento, type Trabalho,
} from "@/lib/impressao-3d/tipos-operacao";
import type { OpcaoCliente, OpcaoProduto, Opcoes } from "@/lib/impressao-3d/opcoes";
import {
  ACOES_PEDIDO, aceitaPagamento, itemPedidoEditavel, pedidoEditavel, podeExcluirPedido, podeGerarProducao,
  prazoVencido, saldoPedido,
} from "@/lib/impressao-3d/regras-operacao";
import { formatDataHora, formatMoeda, formatPercentualFracao } from "@/lib/impressao-3d/numeros";
import { formatDate } from "@/lib/format";

type TrabalhoResumo = Pick<Trabalho, "id" | "numero" | "descricao" | "status" | "quantidade" | "qualidade">;

function FormCabecalho({
  pedido,
  clientes,
  aoFechar,
}: {
  pedido: Pedido;
  clientes: Opcoes<OpcaoCliente>;
  aoFechar: () => void;
}) {
  const [state, formAction, pendente] = useActionState(atualizarPedido.bind(null, pedido.id), undefined);
  useActionSuccess(state, aoFechar);
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <CamposPedido item={pedido} clientes={clientes} limitado={!pedidoEditavel(pedido.status)} />
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : "Salvar"}</BotaoPrimario>
      </div>
    </form>
  );
}

function FormItem({
  pedidoId,
  item,
  produtos,
  verCustos,
  aoFechar,
}: {
  pedidoId: string;
  item: PedidoItem | null;
  produtos: Opcoes<OpcaoProduto>;
  verCustos: boolean;
  aoFechar: () => void;
}) {
  const [state, formAction, pendente] = useActionState(salvarItemPedido.bind(null, pedidoId, item?.id ?? null), undefined);
  useActionSuccess(state, aoFechar);
  const [produtoId, setProdutoId] = useState(item?.produto_id ?? "");
  const variacoes = produtos.itens.find((p) => p.id === produtoId)?.variacoes ?? [];
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-copper-500/30 bg-zinc-950/60 p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Entrada rotulo="Descrição *" name="descricao" required defaultValue={item?.descricao} className="col-span-2 sm:col-span-4" />
        {produtos.acessivel ? (
          <>
            <Seletor rotulo="Produto (opcional)" name="produto_id" value={produtoId} onChange={(e) => setProdutoId(e.target.value)} className="col-span-2">
              <option value="">Sem produto do catálogo</option>
              {produtos.itens.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </Seletor>
            <Seletor rotulo="Variação" name="variacao_id" defaultValue={item?.variacao_id ?? ""} disabled={variacoes.length === 0} className="col-span-2">
              <option value="">Sem variação</option>
              {variacoes.map((v) => (
                <option key={v.id} value={v.id}>{v.nome}</option>
              ))}
            </Seletor>
          </>
        ) : (
          <>
            <input type="hidden" name="produto_id" value={item?.produto_id ?? ""} />
            <input type="hidden" name="variacao_id" value={item?.variacao_id ?? ""} />
          </>
        )}
        <Entrada rotulo="Quantidade *" name="quantidade" type="number" min="1" step="1" required defaultValue={item?.quantidade ?? 1} />
        <Numero rotulo="Preço unitário (R$) *" name="preco_unitario" required defaultValue={item?.preco_unitario ?? ""} />
        {verCustos && (
          <Numero rotulo="Custo unitário (R$)" name="custo_unitario" defaultValue={item ? item.custo_unitario : ""} ajuda="Entra no lucro do pedido." />
        )}
      </div>
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : item ? "Salvar item" : "Adicionar item"}</BotaoPrimario>
      </div>
    </form>
  );
}

function ItemCard({
  item,
  pedido,
  editavel,
  verCustos,
  aoEditar,
}: {
  item: PedidoItem;
  pedido: Pedido;
  editavel: boolean;
  verCustos: boolean;
  aoEditar: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const { executar, pendente } = useAcao();
  const doOrcamento = item.origem === "orcamento";
  const calculo = doOrcamento ? lerCalculo(item.calculo) : null;
  const entrada = (item.entrada && typeof item.entrada === "object" ? item.entrada : {}) as Record<string, unknown>;

  return (
    <div className="rounded-lg border border-zinc-800/80">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
            {item.descricao}
            {doOrcamento && <StatusChip tone="copper">Do orçamento</StatusChip>}
          </p>
          <p className="text-xs text-zinc-500">
            {item.quantidade} un. × {formatMoeda(item.preco_unitario)}
            {verCustos && ` · custo ${formatMoeda(item.custo_unitario)} · lucro ${formatMoeda(item.lucro)}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <p className="text-sm font-semibold text-zinc-100">{formatMoeda(item.preco_total)}</p>
          {doOrcamento && <BotaoTexto onClick={() => setAberto((v) => !v)}>{aberto ? "Ocultar" : "Composição"}</BotaoTexto>}
          {editavel && !doOrcamento && (
            <>
              <button type="button" aria-label="Editar item" onClick={aoEditar} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={pendente}
                aria-label="Remover item"
                onClick={() => executar(() => removerItemPedido(pedido.id, item.id), { confirmar: `Remover "${item.descricao}" do pedido?`, sucesso: "Item removido." })}
                className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
      {aberto && doOrcamento && (
        <div className="space-y-3 border-t border-zinc-800/80 p-3">
          <Aviso>
            Composição salva no orçamento, <strong>estimada</strong>: não muda quando preços ou configurações mudam depois e não é
            custo real de produção. Itens vindos de orçamento são somente leitura.
          </Aviso>
          {calculo ? (
            <ComposicaoCalculo calculo={calculo} verCustos={verCustos} quantidade={item.quantidade} />
          ) : (
            <p className="text-xs text-zinc-500">Cálculo indisponível para este item.</p>
          )}
          {verCustos && (
            <details className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-400">
              <summary className="cursor-pointer">Parâmetros usados neste cálculo</summary>
              <ParametrosUsados entrada={entrada} />
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function FormPagamento({
  pedido,
  podeLancarFinanceiro,
  aoFechar,
}: {
  pedido: Pedido;
  podeLancarFinanceiro: boolean;
  aoFechar: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [tipo, setTipo] = useState<"pagamento" | "estorno">("pagamento");
  const [erro, setErro] = useState<string | null>(null);
  const saldo = saldoPedido(pedido.total, pedido.pago_valor);

  function enviar(formData: FormData) {
    iniciar(async () => {
      const r = await registrarPagamento(pedido.id, formData);
      if ("error" in r) {
        setErro(r.error);
        toast.error(r.error);
        return;
      }
      toast.success(r.mensagem);
      aoFechar();
      router.refresh();
    });
  }

  return (
    <form action={enviar} className="space-y-3 rounded-lg border border-copper-500/30 bg-zinc-950/60 p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Seletor rotulo="Tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as "pagamento" | "estorno")}>
          <option value="pagamento">Pagamento</option>
          <option value="estorno">Estorno</option>
        </Seletor>
        <Numero
          rotulo="Valor (R$) *"
          name="valor"
          required
          ajuda={tipo === "pagamento" ? `Saldo a receber: ${formatMoeda(saldo)}.` : `Já pago: ${formatMoeda(pedido.pago_valor)}.`}
        />
        <Seletor rotulo="Forma" name="forma" defaultValue="pix">
          {Object.entries(FORMA_PAGAMENTO_ROTULO).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </Seletor>
        <Entrada rotulo="Data" name="data" type="date" ajuda="Vazio = hoje." />
        <Entrada rotulo="Observação" name="observacao" className="col-span-2 sm:col-span-4" />
      </div>
      {tipo === "pagamento" ? (
        podeLancarFinanceiro ? (
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            {/* Pré-marcado: com Financeiro ligado e edição nele, o padrão é lançar. */}
            <input type="checkbox" name="lancar_financeiro" defaultChecked />
            Lançar no Financeiro (cria a conta a receber)
          </label>
        ) : (
          <p className="text-[11px] text-zinc-600">
            O lançamento no Financeiro só está disponível com o módulo ligado e permissão de edição nele.
          </p>
        )
      ) : (
        <Aviso tom="alerta">O estorno não é enviado ao Financeiro: ajuste o lançamento lá manualmente, se houver.</Aviso>
      )}
      {erro && <p className="text-xs text-rose-400">{erro}</p>}
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Registrando..." : tipo === "estorno" ? "Registrar estorno" : "Registrar pagamento"}</BotaoPrimario>
      </div>
    </form>
  );
}

export function PedidoDetalhe({
  pedido,
  itens,
  pagamentos,
  historico,
  trabalhos,
  clientes,
  produtos,
  podeEditar,
  verCustos,
  podeGerarProducao: podeProducao,
  podeLancarFinanceiro,
  hoje,
}: {
  pedido: Pedido;
  itens: PedidoItem[];
  pagamentos: PedidoPagamento[];
  historico: PedidoHistorico[];
  /** null = sem acesso ao módulo Produção (a tela avisa). */
  trabalhos: TrabalhoResumo[] | null;
  clientes: Opcoes<OpcaoCliente>;
  produtos: Opcoes<OpcaoProduto>;
  podeEditar: boolean;
  verCustos: boolean;
  podeGerarProducao: boolean;
  podeLancarFinanceiro: boolean;
  hoje: string;
}) {
  const router = useRouter();
  const [editandoCabecalho, setEditandoCabecalho] = useState(false);
  const [formItem, setFormItem] = useState<"novo" | string | null>(null);
  const [pagando, setPagando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const { executar, pendente, ultimoErro } = useAcao();
  const toast = useToast();
  const [gerando, iniciarGerar] = useTransition();
  const nomes = new Map(clientes.itens.map((c) => [c.id, c.nome]));
  const editavelItens = podeEditar && itemPedidoEditavel(pedido.status);
  const acoes = podeEditar ? ACOES_PEDIDO[pedido.status] : [];
  const itemEmEdicao = formItem && formItem !== "novo" ? (itens.find((i) => i.id === formItem) ?? null) : null;
  const saldo = saldoPedido(pedido.total, pedido.pago_valor);
  const vencido = prazoVencido(pedido, hoje);

  function gerarProducao() {
    iniciarGerar(async () => {
      const r = await gerarProducaoDoPedido(pedido.id);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success(
        r.criados > 0
          ? `${r.criados} trabalho(s) criado(s) na fila de produção.`
          : "Nenhum trabalho novo: todos os itens já têm trabalho na produção."
      );
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-6 py-8">
      <div>
        <Link href="/impressao-3d/pedidos" className="mb-3 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Pedidos e vendas
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-zinc-100">
              <span className="text-zinc-500">#{pedido.numero}</span> {nomeDoCliente(pedido, nomes, clientes.acessivel)}
              <StatusChip tone={TOM_STATUS_PEDIDO[pedido.status]}>{STATUS_PEDIDO_ROTULO[pedido.status]}</StatusChip>
              <StatusChip tone={TOM_PAGAMENTO[pedido.status_pagamento]}>Pagamento {STATUS_PAGAMENTO_ROTULO[pedido.status_pagamento].toLowerCase()}</StatusChip>
              {pedido.prioridade !== "normal" && <StatusChip tone={TOM_PRIORIDADE[pedido.prioridade]}>{PRIORIDADE_ROTULO[pedido.prioridade]}</StatusChip>}
              {vencido && <StatusChip tone="rose">Prazo vencido</StatusChip>}
            </h1>
            <p className="text-sm text-zinc-500">
              {formatDate(pedido.data_pedido)}
              {pedido.prazo_entrega && ` · prazo ${formatDate(pedido.prazo_entrega)}`}
              {pedido.orcamento_id && (
                <>
                  {" · veio do "}
                  <Link href={`/impressao-3d/orcamentos/${pedido.orcamento_id}`} className="text-copper-400 hover:underline">orçamento</Link>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {podeEditar && podeProducao && podeGerarProducao(pedido.status) && (
              <BotaoPrimario type="button" pendente={gerando} onClick={gerarProducao}>
                {gerando ? "Gerando..." : "Gerar produção"}
              </BotaoPrimario>
            )}
            {acoes.map((a) => (
              <BotaoPrimario
                key={a.alvo}
                type="button"
                pendente={pendente}
                onClick={() => {
                  if (a.pedeMotivo) {
                    setCancelando(true);
                    return;
                  }
                  executar(() => mudarStatusPedido(pedido.id, a.alvo), { confirmar: a.confirmar, sucesso: "Status atualizado." });
                }}
              >
                {a.rotulo}
              </BotaoPrimario>
            ))}
            {podeEditar && podeExcluirPedido(pedido) && (
              <BotaoTexto
                perigo
                disabled={pendente}
                onClick={() =>
                  executar(() => excluirPedido(pedido.id), {
                    confirmar: `Excluir o pedido #${pedido.numero}?`,
                    sucesso: "Pedido excluído.",
                    aoConcluir: () => router.push("/impressao-3d/pedidos"),
                  })
                }
              >
                Excluir
              </BotaoTexto>
            )}
          </div>
        </div>
      </div>

      {!podeEditar && <SomenteLeitura />}
      {podeEditar && podeGerarProducao(pedido.status) && !podeProducao && (
        <Aviso>Gerar produção exige permissão de edição em Produção.</Aviso>
      )}
      {pedido.status === "cancelado" && (
        <Aviso tom="alerta">
          Pedido cancelado{pedido.cancelado_em ? ` em ${formatDataHora(pedido.cancelado_em)}` : ""}
          {pedido.cancelado_motivo ? `: ${pedido.cancelado_motivo}` : "."}
        </Aviso>
      )}
      {ultimoErro && <p className="text-xs text-rose-400">{ultimoErro}</p>}

      {cancelando && (
        <div className="space-y-3 rounded-lg border border-rose-500/30 bg-zinc-950/60 p-3">
          <p className="text-sm font-medium text-zinc-100">Cancelar pedido #{pedido.numero}</p>
          <AreaTexto rotulo="Motivo do cancelamento *" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          <p className="text-[11px] text-zinc-600">
            Os trabalhos que ainda estão na fila serão cancelados. O cancelamento é barrado se houver trabalho imprimindo.
          </p>
          <div className="flex justify-end gap-2">
            <BotaoTexto onClick={() => setCancelando(false)}>Voltar</BotaoTexto>
            <BotaoPrimario
              type="button"
              pendente={pendente}
              onClick={() =>
                executar(() => mudarStatusPedido(pedido.id, "cancelado", motivo), {
                  sucesso: "Pedido cancelado.",
                  aoConcluir: () => setCancelando(false),
                })
              }
            >
              Confirmar cancelamento
            </BotaoPrimario>
          </div>
        </div>
      )}

      {editandoCabecalho && podeEditar ? (
        <FormCabecalho pedido={pedido} clientes={clientes} aoFechar={() => setEditandoCabecalho(false)} />
      ) : (
        <Cartao
          titulo="Dados do pedido"
          acoes={podeEditar && pedido.status !== "cancelado" && pedido.status !== "entregue" ? <BotaoTexto onClick={() => setEditandoCabecalho(true)}>Editar</BotaoTexto> : undefined}
        >
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            <div><dt className="text-xs text-zinc-500">Cliente</dt><dd className="text-zinc-200">{nomeDoCliente(pedido, nomes, clientes.acessivel)}</dd></div>
            <div><dt className="text-xs text-zinc-500">Desconto</dt><dd className="text-zinc-200">{formatMoeda(pedido.desconto_valor)}</dd></div>
            <div><dt className="text-xs text-zinc-500">Frete cobrado</dt><dd className="text-zinc-200">{formatMoeda(pedido.frete_valor)}</dd></div>
            <div><dt className="text-xs text-zinc-500">Origem</dt><dd className="text-zinc-200">{pedido.origem === "orcamento" ? "Orçamento" : "Pedido manual"}</dd></div>
            {pedido.observacoes && (
              <div className="col-span-2 sm:col-span-4"><dt className="text-xs text-zinc-500">Observações</dt><dd className="whitespace-pre-wrap text-zinc-300">{pedido.observacoes}</dd></div>
            )}
          </dl>
          {!pedidoEditavel(pedido.status) && pedido.status !== "cancelado" && (
            <p className="mt-3 text-[11px] text-zinc-600">Com o pedido em produção ou depois, só prioridade, prazo e observações podem mudar.</p>
          )}
        </Cartao>
      )}

      <Cartao
        titulo={`Itens (${itens.length})`}
        acoes={
          editavelItens && formItem === null ? (
            <BotaoNovo onClick={() => setFormItem("novo")}>
              <Plus className="h-4 w-4" /> Adicionar item
            </BotaoNovo>
          ) : undefined
        }
      >
        <div className="space-y-3">
          {editavelItens && formItem !== null && (
            <FormItem
              key={formItem}
              pedidoId={pedido.id}
              item={itemEmEdicao}
              produtos={produtos}
              verCustos={verCustos}
              aoFechar={() => setFormItem(null)}
            />
          )}
          {itens.length === 0 && formItem === null ? (
            <Vazio>Nenhum item. Adicione itens para poder confirmar o pedido.</Vazio>
          ) : (
            itens.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                pedido={pedido}
                editavel={editavelItens}
                verCustos={verCustos}
                aoEditar={() => setFormItem(item.id)}
              />
            ))
          )}
        </div>
      </Cartao>

      <Cartao titulo="Totais">
        <dl className="ml-auto max-w-sm space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-zinc-400">Subtotal</dt><dd className="tabular-nums text-zinc-200">{formatMoeda(pedido.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-zinc-400">Desconto</dt><dd className="tabular-nums text-zinc-200">− {formatMoeda(pedido.desconto_valor)}</dd></div>
          <div className="flex justify-between"><dt className="text-zinc-400">Frete</dt><dd className="tabular-nums text-zinc-200">+ {formatMoeda(pedido.frete_valor)}</dd></div>
          <div className="flex justify-between border-t border-zinc-800 pt-1 text-base font-semibold"><dt className="text-zinc-100">Total</dt><dd className="tabular-nums text-zinc-100">{formatMoeda(pedido.total)}</dd></div>
          <div className="flex justify-between pt-2"><dt className="text-zinc-400">Pago</dt><dd className="tabular-nums text-zinc-200">{formatMoeda(pedido.pago_valor)}</dd></div>
          <div className="flex justify-between"><dt className="text-zinc-400">Saldo a receber</dt><dd className="tabular-nums text-zinc-200">{formatMoeda(saldo)}</dd></div>
          {verCustos && (
            <>
              <div className="flex justify-between pt-2"><dt className="text-zinc-500">Custo total</dt><dd className="tabular-nums text-zinc-300">{formatMoeda(pedido.custo_total)}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Lucro</dt><dd className="tabular-nums text-zinc-300">{formatMoeda(pedido.lucro_total)}</dd></div>
              {pedido.total > 0 && (
                <div className="flex justify-between"><dt className="text-zinc-500">Margem sobre o total</dt><dd className="tabular-nums text-zinc-300">{formatPercentualFracao(pedido.lucro_total / pedido.total)}</dd></div>
              )}
            </>
          )}
        </dl>
        <p className="mt-3 text-right text-[11px] text-zinc-600">
          Total = subtotal − desconto + frete. {verCustos && "Lucro = soma do lucro dos itens − desconto; o frete não entra no lucro. "}
          Calculado pelo servidor.
        </p>
      </Cartao>

      <Cartao
        titulo="Pagamentos"
        acoes={
          podeEditar && aceitaPagamento(pedido) && !pagando ? (
            <BotaoNovo onClick={() => setPagando(true)}>
              <Plus className="h-4 w-4" /> Registrar pagamento
            </BotaoNovo>
          ) : undefined
        }
      >
        <div className="space-y-2">
          {pagando && <FormPagamento pedido={pedido} podeLancarFinanceiro={podeLancarFinanceiro} aoFechar={() => setPagando(false)} />}
          {pagamentos.length === 0 && !pagando ? (
            <Vazio>Nenhum pagamento registrado.</Vazio>
          ) : (
            pagamentos.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
                    {p.tipo === "estorno" ? "Estorno" : "Pagamento"} · {FORMA_PAGAMENTO_ROTULO[p.forma] ?? p.forma}
                    {p.conta_receber_id && <StatusChip tone="emerald">No Financeiro</StatusChip>}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{formatDate(p.data)}{p.observacao && ` · ${p.observacao}`}</p>
                </div>
                <p className={`text-sm font-semibold tabular-nums ${p.tipo === "estorno" ? "text-rose-400" : "text-zinc-100"}`}>
                  {p.tipo === "estorno" ? "− " : ""}{formatMoeda(p.valor)}
                </p>
              </div>
            ))
          )}
        </div>
      </Cartao>

      <Cartao titulo="Produção do pedido">
        {trabalhos === null ? (
          <p className="text-xs text-zinc-500">Sem acesso ao módulo Produção: os trabalhos deste pedido não são listados.</p>
        ) : trabalhos.length === 0 ? (
          <Vazio>
            Nenhum trabalho de produção.{" "}
            {podeGerarProducao(pedido.status) ? "Use \"Gerar produção\" para criar um trabalho por item." : "A produção só pode ser gerada para pedidos confirmados ou em produção."}
          </Vazio>
        ) : (
          <div className="space-y-2">
            {trabalhos.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2 text-sm">
                <p className="min-w-0 truncate text-zinc-200"><span className="text-zinc-500">#{t.numero}</span> {t.descricao} × {t.quantidade}</p>
                <StatusChip tone="zinc">{STATUS_PRODUCAO_ROTULO[t.status]}</StatusChip>
              </div>
            ))}
            <Link href="/impressao-3d/producao" className="inline-block text-xs text-copper-400 hover:underline">Abrir a Produção</Link>
          </div>
        )}
      </Cartao>

      <Cartao titulo="Histórico de status">
        {historico.length === 0 ? (
          <Vazio>Sem registros.</Vazio>
        ) : (
          <ol className="space-y-1.5 text-xs text-zinc-400">
            {historico.map((h) => (
              <li key={h.id}>
                <span className="text-zinc-500">{formatDataHora(h.created_at)}</span>{" · "}
                {h.de ? `${STATUS_PEDIDO_ROTULO[h.de as keyof typeof STATUS_PEDIDO_ROTULO] ?? h.de} → ` : ""}
                <strong className="text-zinc-200">{STATUS_PEDIDO_ROTULO[h.para as keyof typeof STATUS_PEDIDO_ROTULO] ?? h.para}</strong>
                {h.motivo && ` — ${h.motivo}`}
              </li>
            ))}
          </ol>
        )}
      </Cartao>
    </div>
  );
}
