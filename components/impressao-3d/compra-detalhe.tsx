"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { StatusChip } from "@/components/status-chip";
import { useToast } from "@/components/toast";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import {
  Aviso, BotaoNovo, BotaoPrimario, BotaoTexto, Cartao, CLASSE_CAMPO, Campo, Entrada, ErroForm, Numero, Seletor,
  SomenteLeitura, Vazio, useAcao,
} from "@/components/impressao-3d/campos";
import { CamposCompra, TOM_STATUS_COMPRA } from "@/components/impressao-3d/fornecedores-board";
import {
  atualizarCompra, excluirCompra, mudarStatusCompra, receberCompra, removerItemCompra, salvarItemCompra,
} from "@/app/(dashboard)/impressao-3d/fornecedores/actions";
import { STATUS_COMPRA_ROTULO, type Compra, type CompraItem, type Fornecedor } from "@/lib/impressao-3d/tipos-operacao";
import type { OpcaoMaterial, Opcoes } from "@/lib/impressao-3d/opcoes";
import {
  ACOES_COMPRA, compraEditavel, podeExcluirCompra, precoUnitarioBase, quantidadeBaseDeRolos,
} from "@/lib/impressao-3d/regras-operacao";
import { formatMoeda, formatNumero } from "@/lib/impressao-3d/numeros";
import { formatDate } from "@/lib/format";

function FormCabecalho({ compra, fornecedores, aoFechar }: { compra: Compra; fornecedores: Fornecedor[]; aoFechar: () => void }) {
  const [state, formAction, pendente] = useActionState(atualizarCompra.bind(null, compra.id), undefined);
  useActionSuccess(state, aoFechar);
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <CamposCompra item={compra} fornecedores={fornecedores} />
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : "Salvar"}</BotaoPrimario>
      </div>
    </form>
  );
}

function FormItem({
  compraId,
  item,
  materiais,
  aoFechar,
}: {
  compraId: string;
  item: CompraItem | null;
  materiais: OpcaoMaterial[];
  aoFechar: () => void;
}) {
  const [state, formAction, pendente] = useActionState(salvarItemCompra.bind(null, compraId, item?.id ?? null), undefined);
  useActionSuccess(state, aoFechar);
  const [materialId, setMaterialId] = useState(item?.material_id ?? "");
  const [quantidade, setQuantidade] = useState(item ? String(item.quantidade) : "");
  const [rolos, setRolos] = useState("");
  const material = materiais.find((m) => m.id === materialId);
  const base = rolos ? quantidadeBaseDeRolos(Number(rolos.replace(",", ".")), material?.peso_liquido_rolo_g ?? null) : null;

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-copper-500/30 bg-zinc-950/60 p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Seletor
          rotulo="Material *"
          name="material_id"
          required
          value={materialId}
          onChange={(e) => setMaterialId(e.target.value)}
          className="col-span-2"
        >
          <option value="" disabled>Selecione...</option>
          {materiais.map((m) => (
            <option key={m.id} value={m.id}>{m.nome} ({m.unidade})</option>
          ))}
        </Seletor>
        <Campo
          rotulo={`Quantidade (${material?.unidade ?? "unidade base"}) *`}
          ajuda="Sempre na unidade base do material (g, ml ou un)."
        >
          <input
            name="quantidade"
            type="number"
            step="any"
            min="0"
            inputMode="decimal"
            required
            className={CLASSE_CAMPO}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </Campo>
        <Numero rotulo="Valor pago pelo item (R$) *" name="preco_total" required defaultValue={item?.preco_total ?? ""} ajuda="Total do item, não por unidade." />
        {material && material.peso_liquido_rolo_g && (
          <div className="col-span-2 flex items-end gap-2 sm:col-span-4">
            <Campo rotulo={`Converter rolos (${formatNumero(material.peso_liquido_rolo_g, 0)} ${material.unidade} líquidos cada)`}>
              <input
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                className={CLASSE_CAMPO}
                value={rolos}
                onChange={(e) => setRolos(e.target.value)}
                placeholder="Nº de rolos"
              />
            </Campo>
            <BotaoTexto
              disabled={base === null}
              onClick={() => {
                if (base !== null) setQuantidade(String(base));
              }}
            >
              {base !== null ? `Usar ${formatNumero(base, 0)} ${material.unidade}` : "Usar"}
            </BotaoTexto>
          </div>
        )}
        <Entrada rotulo="Observação" name="observacao" defaultValue={item?.observacao ?? ""} className="col-span-2 sm:col-span-4" />
      </div>
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : item ? "Salvar item" : "Adicionar item"}</BotaoPrimario>
      </div>
    </form>
  );
}

function PainelReceber({
  compra,
  podeGerarContaPagar,
  aoFechar,
}: {
  compra: Compra;
  podeGerarContaPagar: boolean;
  aoFechar: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  // Pré-marcado quando o Financeiro está ligado e a pessoa o edita (o vencimento passa a ser obrigatório).
  const [gerar, setGerar] = useState(podeGerarContaPagar);
  const [erro, setErro] = useState<string | null>(null);

  function enviar(formData: FormData) {
    iniciar(async () => {
      const r = await receberCompra(compra.id, formData);
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
      <p className="text-sm font-medium text-zinc-100">Receber compra #{compra.numero}</p>
      <Aviso>
        Os itens dão entrada no estoque na quantidade informada. Frete ({formatMoeda(compra.frete)}) e desconto (
        {formatMoeda(compra.desconto)}) são rateados entre os itens por valor, e o custo médio de cada material é
        atualizado. A compra recebida não pode mais ser alterada.
      </Aviso>
      {podeGerarContaPagar ? (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" name="gerar_conta_pagar" checked={gerar} onChange={(e) => setGerar(e.target.checked)} />
            Gerar conta a pagar no Financeiro ({formatMoeda(compra.total)})
          </label>
          {gerar && <Entrada rotulo="Vencimento *" name="vencimento" type="date" required className="max-w-xs" />}
        </div>
      ) : (
        <p className="text-[11px] text-zinc-600">
          A conta a pagar só pode ser gerada com o módulo Financeiro ligado e permissão de edição nele.
        </p>
      )}
      {erro && <p className="text-xs text-rose-400">{erro}</p>}
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Recebendo..." : "Confirmar recebimento"}</BotaoPrimario>
      </div>
    </form>
  );
}

export function CompraDetalhe({
  compra,
  itens,
  fornecedores,
  materiais,
  podeEditar,
  podeReceber,
  podeGerarContaPagar,
}: {
  compra: Compra;
  itens: CompraItem[];
  fornecedores: Fornecedor[];
  materiais: Opcoes<OpcaoMaterial>;
  podeEditar: boolean;
  podeReceber: boolean;
  podeGerarContaPagar: boolean;
}) {
  const router = useRouter();
  const editavel = podeEditar && compraEditavel(compra.status);
  const [editandoCabecalho, setEditandoCabecalho] = useState(false);
  const [formItem, setFormItem] = useState<"novo" | string | null>(null);
  const [recebendo, setRecebendo] = useState(false);
  const { executar, pendente } = useAcao();
  const fornecedor = fornecedores.find((f) => f.id === compra.fornecedor_id);
  const materialPorId = new Map(materiais.itens.map((m) => [m.id, m]));
  const acoes = podeEditar ? ACOES_COMPRA[compra.status] : [];
  const itemEmEdicao = formItem && formItem !== "novo" ? (itens.find((i) => i.id === formItem) ?? null) : null;
  const subtotalItens = itens.reduce((s, i) => s + i.preco_total, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-6 py-8">
      <div>
        <Link href="/impressao-3d/fornecedores" className="mb-3 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Fornecedores e compras
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-zinc-100">
              <span className="text-zinc-500">#{compra.numero}</span> {fornecedor?.nome ?? "Fornecedor"}
              <StatusChip tone={TOM_STATUS_COMPRA[compra.status]}>{STATUS_COMPRA_ROTULO[compra.status]}</StatusChip>
            </h1>
            <p className="text-sm text-zinc-500">
              {formatDate(compra.data)}
              {compra.prazo_entrega && ` · entrega até ${formatDate(compra.prazo_entrega)}`}
              {compra.recebida_em && ` · recebida em ${formatDate(compra.recebida_em.slice(0, 10))}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {acoes.map((a) => (
              <BotaoPrimario
                key={a.alvo}
                type="button"
                pendente={pendente}
                onClick={() =>
                  executar(() => mudarStatusCompra(compra.id, a.alvo), { confirmar: a.confirmar, sucesso: "Status atualizado." })
                }
              >
                {a.rotulo}
              </BotaoPrimario>
            ))}
            {podeReceber && compra.status === "aprovada" && !recebendo && (
              <BotaoPrimario type="button" onClick={() => setRecebendo(true)}>Receber no estoque</BotaoPrimario>
            )}
            {podeEditar && podeExcluirCompra(compra.status) && (
              <BotaoTexto
                perigo
                disabled={pendente}
                onClick={() =>
                  executar(() => excluirCompra(compra.id), {
                    confirmar: `Excluir a compra #${compra.numero} e seus itens?`,
                    sucesso: "Compra excluída.",
                    aoConcluir: () => router.push("/impressao-3d/fornecedores"),
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
      {podeEditar && compra.status === "aprovada" && !podeReceber && (
        <Aviso tom="alerta">Receber a compra exige permissão de edição também em Estoque.</Aviso>
      )}
      {(compra.status === "recebida" || compra.status === "cancelada") && (
        <Aviso>
          Esta compra está {STATUS_COMPRA_ROTULO[compra.status].toLowerCase()} e não pode mais ser alterada.
          {compra.conta_pagar_id && " Uma conta a pagar foi criada no Financeiro."}
        </Aviso>
      )}
      {!materiais.acessivel && (
        <Aviso tom="alerta">Sem acesso a Estoque: os materiais aparecem sem nome e não é possível adicionar itens.</Aviso>
      )}

      {recebendo && <PainelReceber compra={compra} podeGerarContaPagar={podeGerarContaPagar} aoFechar={() => setRecebendo(false)} />}

      {editandoCabecalho && editavel ? (
        <FormCabecalho compra={compra} fornecedores={fornecedores} aoFechar={() => setEditandoCabecalho(false)} />
      ) : (
        <Cartao
          titulo="Dados da compra"
          acoes={editavel ? <BotaoTexto onClick={() => setEditandoCabecalho(true)}>Editar</BotaoTexto> : undefined}
        >
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            <div><dt className="text-xs text-zinc-500">Fornecedor</dt><dd className="text-zinc-200">{fornecedor?.nome ?? "—"}</dd></div>
            <div><dt className="text-xs text-zinc-500">Validade da cotação</dt><dd className="text-zinc-200">{formatDate(compra.validade_cotacao)}</dd></div>
            <div><dt className="text-xs text-zinc-500">Frete</dt><dd className="text-zinc-200">{formatMoeda(compra.frete)}</dd></div>
            <div><dt className="text-xs text-zinc-500">Desconto</dt><dd className="text-zinc-200">{formatMoeda(compra.desconto)}</dd></div>
            {compra.observacoes && (
              <div className="col-span-2 sm:col-span-4"><dt className="text-xs text-zinc-500">Observações</dt><dd className="whitespace-pre-wrap text-zinc-300">{compra.observacoes}</dd></div>
            )}
          </dl>
        </Cartao>
      )}

      <Cartao
        titulo={`Itens (${itens.length})`}
        acoes={
          editavel && formItem === null && materiais.acessivel ? (
            <BotaoNovo onClick={() => setFormItem("novo")}>
              <Plus className="h-4 w-4" /> Adicionar item
            </BotaoNovo>
          ) : undefined
        }
      >
        <div className="space-y-2">
          {editavel && formItem !== null && (
            <FormItem
              key={formItem}
              compraId={compra.id}
              item={itemEmEdicao}
              materiais={materiais.itens}
              aoFechar={() => setFormItem(null)}
            />
          )}
          {itens.length === 0 && formItem === null ? (
            <Vazio>Nenhum item. Adicione os materiais cotados para poder aprovar a compra.</Vazio>
          ) : (
            itens.map((i) => {
              const m = materialPorId.get(i.material_id);
              const un = m?.unidade ?? "";
              const unit = i.preco_unitario ?? precoUnitarioBase(i.preco_total, i.quantidade);
              return (
                <div key={i.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-200">{m?.nome ?? "Material (sem acesso a Estoque)"}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {formatNumero(i.quantidade, 2)} {un}
                      {unit !== null && ` · ${formatMoeda(unit, 4)} por ${un || "unidade"}`}
                      {i.observacao && ` · ${i.observacao}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-100">{formatMoeda(i.preco_total)}</p>
                    {editavel && (
                      <>
                        <button type="button" aria-label="Editar item" onClick={() => setFormItem(i.id)} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={pendente}
                          aria-label="Remover item"
                          onClick={() => executar(() => removerItemCompra(compra.id, i.id), { confirmar: "Remover este item da compra?", sucesso: "Item removido." })}
                          className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Cartao>

      <Cartao titulo="Totais">
        <dl className="ml-auto max-w-sm space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-zinc-400">Subtotal dos itens</dt><dd className="tabular-nums text-zinc-200">{formatMoeda(compra.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-zinc-400">Frete</dt><dd className="tabular-nums text-zinc-200">+ {formatMoeda(compra.frete)}</dd></div>
          <div className="flex justify-between"><dt className="text-zinc-400">Desconto</dt><dd className="tabular-nums text-zinc-200">− {formatMoeda(compra.desconto)}</dd></div>
          <div className="flex justify-between border-t border-zinc-800 pt-1 text-base font-semibold"><dt className="text-zinc-100">Total</dt><dd className="tabular-nums text-zinc-100">{formatMoeda(compra.total)}</dd></div>
        </dl>
        <p className="mt-3 text-right text-[11px] text-zinc-600">
          Totais calculados pelo servidor
          {Math.abs(subtotalItens - compra.subtotal) > 0.005 && ` (soma dos itens exibidos: ${formatMoeda(subtotalItens)})`}.
        </p>
      </Cartao>
    </div>
  );
}
