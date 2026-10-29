"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { StatusChip } from "@/components/status-chip";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import {
  Aviso, BotaoNovo, BotaoPrimario, BotaoTexto, Cartao, ErroForm, SomenteLeitura, Vazio, useAcao,
} from "@/components/impressao-3d/campos";
import { CamposOrcamento, TOM_STATUS_ORCAMENTO } from "@/components/impressao-3d/orcamentos-board";
import { ComposicaoCalculo } from "@/components/impressao-3d/composicao-calculo";
import { ParametrosUsados, Simulador, type ProdutoOpcao } from "@/components/impressao-3d/simulador";
import {
  atualizarOrcamento, excluirOrcamento, mudarStatusOrcamento, recalcularOrcamento, removerItemOrcamento,
} from "@/app/(dashboard)/impressao-3d/orcamentos/actions";
import { lerCalculo } from "@/lib/impressao-3d/calculo";
import {
  STATUS_ORCAMENTO_ROTULO, type ConfigPrecificacao, type ItemOrcamento, type Orcamento,
} from "@/lib/impressao-3d/tipos";
import type { OpcaoCliente, OpcaoImpressora, OpcaoMaterial, Opcoes } from "@/lib/impressao-3d/opcoes";
import { formatDataHora, formatMoeda, formatNumero, formatPercentualFracao } from "@/lib/impressao-3d/numeros";
import { formatDate } from "@/lib/format";

/** Ações de status possíveis a partir de cada status (a RPC confere de novo). */
const ACOES_STATUS: Record<string, { alvo: string; rotulo: string; confirmar?: string }[]> = {
  rascunho: [{ alvo: "enviado", rotulo: "Marcar como enviado", confirmar: "Marcar como enviado? O orçamento deixa de ser editável." }],
  enviado: [
    { alvo: "aprovado", rotulo: "Aprovar", confirmar: "Aprovar o orçamento? Nesta etapa a aprovação é final." },
    { alvo: "recusado", rotulo: "Recusar" },
    { alvo: "expirado", rotulo: "Marcar como expirado" },
    { alvo: "rascunho", rotulo: "Voltar para rascunho" },
  ],
  recusado: [{ alvo: "rascunho", rotulo: "Reabrir como rascunho" }],
  expirado: [{ alvo: "rascunho", rotulo: "Reabrir como rascunho" }],
};

function FormCabecalho({
  orcamento,
  clientes,
  aoFechar,
}: {
  orcamento: Orcamento;
  clientes: Opcoes<OpcaoCliente>;
  aoFechar: () => void;
}) {
  const [state, formAction, pendente] = useActionState(atualizarOrcamento.bind(null, orcamento.id), undefined);
  useActionSuccess(state, aoFechar);
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <CamposOrcamento item={orcamento} clientes={clientes} />
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : "Salvar"}</BotaoPrimario>
      </div>
    </form>
  );
}

function ItemCard({
  item,
  orcamento,
  rascunho,
  podeEditar,
  verCustos,
  aoEditar,
}: {
  item: ItemOrcamento;
  orcamento: Orcamento;
  rascunho: boolean;
  podeEditar: boolean;
  verCustos: boolean;
  aoEditar: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const { executar, pendente } = useAcao();
  const calculo = lerCalculo(item.calculo);

  return (
    <div className="rounded-lg border border-zinc-800/80">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm text-zinc-200">{item.descricao}</p>
          <p className="text-xs text-zinc-500">
            {item.quantidade} un. × {formatMoeda(item.preco_unitario)}
            {verCustos && ` · lucro ${formatMoeda(item.lucro)}`} · calculado em {formatDataHora(item.calculado_em)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <p className="text-sm font-semibold text-zinc-100">{formatMoeda(item.preco_total)}</p>
          <BotaoTexto onClick={() => setAberto((v) => !v)}>{aberto ? "Ocultar" : "Cálculo salvo"}</BotaoTexto>
          {podeEditar && rascunho && (
            <>
              <button type="button" aria-label="Editar item" onClick={aoEditar} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={pendente}
                aria-label="Remover item"
                onClick={() => executar(() => removerItemOrcamento(orcamento.id, item.id), { confirmar: `Remover "${item.descricao}" do orçamento?`, sucesso: "Item removido." })}
                className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
      {aberto && (
        <div className="space-y-3 border-t border-zinc-800/80 p-3">
          <Aviso>
            Este cálculo foi salvo em {formatDataHora(item.calculado_em)} (fórmula v{item.versao_formula}) e não muda
            quando preços ou configurações mudam depois.
          </Aviso>
          {calculo ? (
            <ComposicaoCalculo calculo={calculo} verCustos={verCustos} quantidade={item.quantidade} />
          ) : (
            <p className="text-xs text-zinc-500">Cálculo indisponível para este item.</p>
          )}
          {verCustos && (
            <details className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-400">
              <summary className="cursor-pointer">Parâmetros usados neste cálculo</summary>
              <ParametrosUsados entrada={item.entrada} />
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export function OrcamentoDetalhe({
  orcamento,
  itens,
  clientes,
  impressoras,
  materiais,
  produtos,
  config,
  podeEditar,
  verCustos,
}: {
  orcamento: Orcamento;
  itens: ItemOrcamento[];
  clientes: Opcoes<OpcaoCliente>;
  impressoras: Opcoes<OpcaoImpressora>;
  materiais: Opcoes<OpcaoMaterial>;
  produtos: ProdutoOpcao[];
  config: ConfigPrecificacao;
  podeEditar: boolean;
  verCustos: boolean;
}) {
  const router = useRouter();
  const rascunho = orcamento.status === "rascunho";
  const editavel = podeEditar && rascunho;
  const [editandoCabecalho, setEditandoCabecalho] = useState(false);
  // "novo" = adicionando; id = editando aquele item; null = fechado.
  const [formItem, setFormItem] = useState<"novo" | string | null>(null);
  const { executar, pendente } = useAcao();
  const cliente = clientes.itens.find((c) => c.id === orcamento.cliente_id);
  const acoesStatus = podeEditar ? (ACOES_STATUS[orcamento.status] ?? []) : [];
  const itemEmEdicao = formItem && formItem !== "novo" ? (itens.find((i) => i.id === formItem) ?? null) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-6 py-8">
      <div>
        <Link href="/impressao-3d/orcamentos" className="mb-3 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Orçamentos 3D
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-zinc-100">
              <span className="text-zinc-500">#{orcamento.numero}</span> {orcamento.titulo}
              <StatusChip tone={TOM_STATUS_ORCAMENTO[orcamento.status]}>{STATUS_ORCAMENTO_ROTULO[orcamento.status]}</StatusChip>
            </h1>
            <p className="text-sm text-zinc-500">
              {cliente?.nome ?? (orcamento.cliente_id ? "Cliente" : "Sem cliente")}
              {orcamento.validade && ` · válido até ${formatDate(orcamento.validade)}`}
              {orcamento.enviado_em && ` · enviado em ${formatDataHora(orcamento.enviado_em)}`}
              {orcamento.aprovado_em && ` · aprovado em ${formatDataHora(orcamento.aprovado_em)}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {acoesStatus.map((a) => (
              <BotaoPrimario
                key={a.alvo}
                type="button"
                pendente={pendente}
                onClick={() =>
                  executar(() => mudarStatusOrcamento(orcamento.id, a.alvo), { confirmar: a.confirmar, sucesso: "Status atualizado." })
                }
              >
                {a.rotulo}
              </BotaoPrimario>
            ))}
            {editavel && (
              <BotaoTexto
                perigo
                disabled={pendente}
                onClick={() =>
                  executar(() => excluirOrcamento(orcamento.id), {
                    confirmar: `Excluir o orçamento #${orcamento.numero}?`,
                    sucesso: "Orçamento excluído.",
                    aoConcluir: () => router.push("/impressao-3d/orcamentos"),
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
      {!rascunho && (
        <Aviso>
          Este orçamento está {STATUS_ORCAMENTO_ROTULO[orcamento.status].toLowerCase()} e fica somente leitura.
          {orcamento.status === "aprovado" && " A conversão em pedido virá na Etapa B (produção)."}
          {(orcamento.status === "enviado" || orcamento.status === "recusado" || orcamento.status === "expirado") &&
            " Volte para rascunho para editar."}
        </Aviso>
      )}

      {editandoCabecalho && editavel ? (
        <FormCabecalho orcamento={orcamento} clientes={clientes} aoFechar={() => setEditandoCabecalho(false)} />
      ) : (
        <Cartao
          titulo="Dados do orçamento"
          acoes={editavel ? <BotaoTexto onClick={() => setEditandoCabecalho(true)}>Editar</BotaoTexto> : undefined}
        >
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            <div><dt className="text-xs text-zinc-500">Cliente</dt><dd className="text-zinc-200">{cliente?.nome ?? (orcamento.cliente_id ? "(sem acesso a Clientes)" : "—")}</dd></div>
            <div><dt className="text-xs text-zinc-500">Validade</dt><dd className="text-zinc-200">{formatDate(orcamento.validade)}</dd></div>
            <div><dt className="text-xs text-zinc-500">Desconto</dt><dd className="text-zinc-200">{formatMoeda(orcamento.desconto_valor)}</dd></div>
            {orcamento.observacoes && (
              <div className="col-span-2 sm:col-span-4"><dt className="text-xs text-zinc-500">Observações</dt><dd className="whitespace-pre-wrap text-zinc-300">{orcamento.observacoes}</dd></div>
            )}
          </dl>
        </Cartao>
      )}

      <Cartao
        titulo={`Itens (${itens.length})`}
        acoes={
          editavel && formItem === null ? (
            <div className="flex items-center gap-2">
              {itens.length > 0 && (
                <BotaoTexto
                  disabled={pendente}
                  onClick={() =>
                    executar(() => recalcularOrcamento(orcamento.id), {
                      confirmar:
                        "Recalcular todos os itens com os preços, a configuração e as impressoras de hoje? Os cálculos salvos serão substituídos. Ajustes avançados feitos em cada item (tarifa, preço do material, margem...) serão descartados.",
                      sucesso: "Itens recalculados com os valores atuais.",
                    })
                  }
                >
                  <span className="flex items-center gap-1"><RefreshCw className="h-3.5 w-3.5" /> Recalcular com valores atuais</span>
                </BotaoTexto>
              )}
              <BotaoNovo onClick={() => setFormItem("novo")}>
                <Plus className="h-4 w-4" /> Adicionar item
              </BotaoNovo>
            </div>
          ) : undefined
        }
      >
        <div className="space-y-3">
          {editavel && formItem !== null && (
            <div className="rounded-lg border border-copper-500/30 bg-zinc-950/60 p-4">
              <p className="mb-3 text-sm font-medium text-zinc-100">{itemEmEdicao ? "Editar item" : "Novo item"}</p>
              <Simulador
                key={formItem}
                impressoras={impressoras}
                materiais={materiais}
                config={config}
                verCustos={verCustos}
                contexto="orcamentos"
                orcamento={{ id: orcamento.id, item: itemEmEdicao, produtos, aoConcluir: () => setFormItem(null) }}
              />
              {itemEmEdicao && (
                <p className="mt-3 text-[11px] text-zinc-600">
                  Ao salvar, o item é recalculado com o preço do material, a tarifa e a configuração de hoje.
                </p>
              )}
            </div>
          )}
          {itens.length === 0 && formItem === null ? (
            <Vazio>Nenhum item. Adicione itens para poder enviar o orçamento.</Vazio>
          ) : (
            itens.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                orcamento={orcamento}
                rascunho={rascunho}
                podeEditar={podeEditar}
                verCustos={verCustos}
                aoEditar={() => setFormItem(item.id)}
              />
            ))
          )}
        </div>
      </Cartao>

      <Cartao titulo="Totais">
        <dl className="ml-auto max-w-sm space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-zinc-400">Subtotal</dt><dd className="tabular-nums text-zinc-200">{formatMoeda(orcamento.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-zinc-400">Desconto</dt><dd className="tabular-nums text-zinc-200">− {formatMoeda(orcamento.desconto_valor)}</dd></div>
          <div className="flex justify-between border-t border-zinc-800 pt-1 text-base font-semibold"><dt className="text-zinc-100">Total</dt><dd className="tabular-nums text-zinc-100">{formatMoeda(orcamento.total)}</dd></div>
          {verCustos && (
            <>
              <div className="flex justify-between pt-2"><dt className="text-zinc-500">Custo total <span className="text-[10px] text-amber-500">estimado</span></dt><dd className="tabular-nums text-zinc-300">{formatMoeda(orcamento.custo_total)}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Lucro <span className="text-[10px] text-amber-500">estimado</span></dt><dd className="tabular-nums text-zinc-300">{formatMoeda(orcamento.lucro_total)}</dd></div>
              {orcamento.total > 0 && (
                <div className="flex justify-between"><dt className="text-zinc-500">Margem sobre o total</dt><dd className="tabular-nums text-zinc-300">{formatPercentualFracao(orcamento.lucro_total / orcamento.total)}</dd></div>
              )}
            </>
          )}
        </dl>
        <p className="mt-3 text-right text-[11px] text-zinc-600">
          Totais calculados pelo servidor a partir dos itens salvos ({formatNumero(itens.length, 0)} item(ns)).
        </p>
      </Cartao>
    </div>
  );
}
