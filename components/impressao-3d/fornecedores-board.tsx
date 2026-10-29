"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Archive, ArchiveRestore, Pencil, Plus, ShoppingCart, Trash2, Truck } from "lucide-react";
import { StatusChip, type ChipTone } from "@/components/status-chip";
import { SegmentFilter } from "@/components/segment-filter";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import {
  Aviso, AreaTexto, BotaoNovo, BotaoPrimario, BotaoTexto, Cartao, Entrada, ErroForm, Numero, Seletor,
  SomenteLeitura, Vazio, useAcao,
} from "@/components/impressao-3d/campos";
import {
  alternarFornecedorAtivo, atualizarFornecedor, criarCompra, criarFornecedor, excluirFornecedor,
} from "@/app/(dashboard)/impressao-3d/fornecedores/actions";
import {
  STATUS_COMPRA_ROTULO, type Compra, type Fornecedor, type HistoricoPreco, type StatusCompra,
} from "@/lib/impressao-3d/tipos-operacao";
import type { OpcaoMaterial, Opcoes } from "@/lib/impressao-3d/opcoes";
import { cotacoesAbertas, historicoRecebido } from "@/lib/impressao-3d/regras-operacao";
import { formatMoeda } from "@/lib/impressao-3d/numeros";
import { formatDate } from "@/lib/format";

export const TOM_STATUS_COMPRA: Record<StatusCompra, ChipTone> = {
  cotacao: "sky",
  aprovada: "amber",
  recebida: "emerald",
  cancelada: "zinc",
};

function CamposFornecedor({ item }: { item?: Fornecedor }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Entrada rotulo="Nome *" name="nome" required defaultValue={item?.nome} className="col-span-2" />
      <Entrada rotulo="Categoria" name="categoria" defaultValue={item?.categoria ?? ""} placeholder="Filamentos, peças..." />
      <Entrada rotulo="Contato" name="contato" defaultValue={item?.contato ?? ""} />
      <Entrada rotulo="Telefone" name="telefone" defaultValue={item?.telefone ?? ""} />
      <Entrada rotulo="E-mail" name="email" type="email" defaultValue={item?.email ?? ""} />
      <Entrada rotulo="Site" name="site" defaultValue={item?.site ?? ""} placeholder="https://" className="col-span-2" />
      <AreaTexto rotulo="Observações" name="observacoes" defaultValue={item?.observacoes ?? ""} className="col-span-2 sm:col-span-4" />
    </div>
  );
}

function FormFornecedor({ item, aoFechar }: { item?: Fornecedor; aoFechar: () => void }) {
  const acao = item ? atualizarFornecedor.bind(null, item.id) : criarFornecedor;
  const [state, formAction, pendente] = useActionState(acao, undefined);
  useActionSuccess(state, aoFechar);
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <CamposFornecedor item={item} />
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : "Salvar"}</BotaoPrimario>
      </div>
    </form>
  );
}

function LinhaFornecedor({ item, podeEditar, compras }: { item: Fornecedor; podeEditar: boolean; compras: number }) {
  const [editando, setEditando] = useState(false);
  const { executar, pendente } = useAcao();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
            {item.nome}
            {item.categoria && <StatusChip tone="zinc">{item.categoria}</StatusChip>}
            {!item.ativo && <StatusChip tone="zinc">Arquivado</StatusChip>}
          </p>
          <p className="truncate text-xs text-zinc-500">
            {[item.contato, item.telefone, item.email].filter(Boolean).join(" · ") || "Sem contato cadastrado"}
            {` · ${compras} compra(s)`}
          </p>
          {item.site && (
            <a href={item.site} target="_blank" rel="noopener noreferrer" className="truncate text-xs text-copper-400 hover:underline">
              {item.site}
            </a>
          )}
        </div>
        {podeEditar && (
          <div className="flex shrink-0 items-center gap-0.5">
            <button type="button" aria-label="Editar fornecedor" onClick={() => setEditando(true)} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={pendente}
              aria-label={item.ativo ? "Arquivar fornecedor" : "Reativar fornecedor"}
              title={item.ativo ? "Arquivar" : "Reativar"}
              onClick={() => executar(() => alternarFornecedorAtivo(item.id, !item.ativo), { sucesso: item.ativo ? "Fornecedor arquivado." : "Fornecedor reativado." })}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-60"
            >
              {item.ativo ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              disabled={pendente}
              aria-label="Excluir fornecedor"
              onClick={() => executar(() => excluirFornecedor(item.id), { confirmar: `Excluir "${item.nome}"? Fornecedores com compras ou materiais vinculados não podem ser excluídos: arquive.`, sucesso: "Fornecedor excluído." })}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      {editando && <FormFornecedor item={item} aoFechar={() => setEditando(false)} />}
    </div>
  );
}

/** Campos do cabeçalho da compra (os únicos que vão em insert/update direto). */
export function CamposCompra({ item, fornecedores }: { item?: Compra; fornecedores: Fornecedor[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Seletor rotulo="Fornecedor *" name="fornecedor_id" required defaultValue={item?.fornecedor_id ?? ""} className="col-span-2">
        <option value="" disabled>Selecione...</option>
        {fornecedores
          .filter((f) => f.ativo || f.id === item?.fornecedor_id)
          .map((f) => (
            <option key={f.id} value={f.id}>{f.nome}{f.ativo ? "" : " (arquivado)"}</option>
          ))}
      </Seletor>
      <Entrada rotulo="Data" name="data" type="date" defaultValue={item?.data ?? ""} ajuda="Vazio = hoje." />
      <Entrada rotulo="Validade da cotação" name="validade_cotacao" type="date" defaultValue={item?.validade_cotacao ?? ""} />
      <Entrada rotulo="Prazo de entrega" name="prazo_entrega" type="date" defaultValue={item?.prazo_entrega ?? ""} />
      <Numero rotulo="Frete (R$)" name="frete" defaultValue={item?.frete ?? ""} />
      <Numero rotulo="Desconto (R$)" name="desconto" defaultValue={item?.desconto ?? ""} />
      <AreaTexto rotulo="Observações" name="observacoes" defaultValue={item?.observacoes ?? ""} className="col-span-2 sm:col-span-4" />
    </div>
  );
}

function NovaCompra({ fornecedores, aoFechar }: { fornecedores: Fornecedor[]; aoFechar: () => void }) {
  // Sucesso redireciona para a compra criada (a action faz o redirect).
  const [state, formAction, pendente] = useActionState(criarCompra, undefined);
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <CamposCompra fornecedores={fornecedores} />
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Criando..." : "Criar e abrir"}</BotaoPrimario>
      </div>
    </form>
  );
}

function AbaPrecos({
  historico,
  materiais,
  fornecedores,
}: {
  historico: HistoricoPreco[];
  materiais: Opcoes<OpcaoMaterial>;
  fornecedores: Fornecedor[];
}) {
  const nomeFornecedor = useMemo(() => new Map(fornecedores.map((f) => [f.id, f.nome])), [fornecedores]);
  const comDados = useMemo(() => {
    const ids = new Set(historico.map((h) => h.material_id).filter((x): x is string => !!x));
    return materiais.itens.filter((m) => ids.has(m.id));
  }, [historico, materiais.itens]);
  const [materialId, setMaterialId] = useState("");
  const escolhido = materialId || comDados[0]?.id || "";
  const material = materiais.itens.find((m) => m.id === escolhido);

  if (!materiais.acessivel) {
    return <Aviso tom="alerta">Sem acesso a Estoque: não é possível identificar os materiais do histórico de preços.</Aviso>;
  }
  if (historico.length === 0) {
    return <Vazio>Ainda não há compras com itens. O histórico de preços e a comparação de cotações aparecem aqui conforme você registra compras.</Vazio>;
  }

  const recebidas = escolhido ? historicoRecebido(historico, escolhido) : [];
  const cotacoes = escolhido ? cotacoesAbertas(historico, escolhido) : [];
  const un = material?.unidade ?? "";

  return (
    <div className="space-y-4">
      <Aviso>
        O preço unitário é o valor pago pelo item dividido pela quantidade na unidade base do material (g, ml ou un) e{" "}
        <strong>não inclui frete</strong>.
      </Aviso>
      <div className="max-w-sm">
        <Seletor rotulo="Material" value={escolhido} onChange={(e) => setMaterialId(e.target.value)}>
          {comDados.map((m) => (
            <option key={m.id} value={m.id}>{m.nome}</option>
          ))}
        </Seletor>
      </div>

      <Cartao titulo="Cotações abertas (comparação)">
        {cotacoes.length === 0 ? (
          <Vazio>Nenhuma cotação aberta para este material.</Vazio>
        ) : (
          <TabelaPrecos
            un={un}
            nomeFornecedor={nomeFornecedor}
            linhas={cotacoes}
            destacarMenor
          />
        )}
      </Cartao>

      <Cartao titulo="Histórico de compras recebidas">
        {recebidas.length === 0 ? (
          <Vazio>Nenhuma compra recebida deste material ainda.</Vazio>
        ) : (
          <TabelaPrecos un={un} nomeFornecedor={nomeFornecedor} linhas={recebidas} />
        )}
      </Cartao>
    </div>
  );
}

function TabelaPrecos({
  linhas,
  nomeFornecedor,
  un,
  destacarMenor,
}: {
  linhas: HistoricoPreco[];
  nomeFornecedor: Map<string, string>;
  un: string;
  destacarMenor?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="text-zinc-500">
          <tr>
            <th className="py-1.5 pr-3 font-medium">Fornecedor</th>
            <th className="py-1.5 pr-3 font-medium">Compra</th>
            <th className="py-1.5 pr-3 font-medium">Data</th>
            <th className="py-1.5 pr-3 text-right font-medium">Quantidade</th>
            <th className="py-1.5 pr-3 text-right font-medium">Valor do item</th>
            <th className="py-1.5 text-right font-medium">Preço por {un || "unidade"}</th>
          </tr>
        </thead>
        <tbody className="text-zinc-300">
          {linhas.map((l, i) => (
            <tr key={`${l.compra_id}-${i}`} className="border-t border-zinc-800/70">
              <td className="py-1.5 pr-3">{l.fornecedor_id ? (nomeFornecedor.get(l.fornecedor_id) ?? "Fornecedor") : "—"}</td>
              <td className="py-1.5 pr-3">
                {l.compra_id ? (
                  <Link href={`/impressao-3d/fornecedores/compras/${l.compra_id}`} className="text-copper-400 hover:underline">
                    #{l.compra_numero}
                  </Link>
                ) : "—"}
              </td>
              <td className="py-1.5 pr-3">{formatDate(l.data)}</td>
              <td className="py-1.5 pr-3 text-right tabular-nums">{l.quantidade ?? "—"} {un}</td>
              <td className="py-1.5 pr-3 text-right tabular-nums">{l.preco_total !== null ? formatMoeda(l.preco_total) : "—"}</td>
              <td className={`py-1.5 text-right tabular-nums ${destacarMenor && i === 0 ? "font-semibold text-emerald-400" : ""}`}>
                {l.preco_unitario !== null ? formatMoeda(l.preco_unitario, 4) : "—"}
                {destacarMenor && i === 0 && linhas.length > 1 && " · menor"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FornecedoresBoard({
  fornecedores,
  compras,
  historico,
  materiais,
  podeEditar,
}: {
  fornecedores: Fornecedor[];
  compras: Compra[];
  historico: HistoricoPreco[];
  materiais: Opcoes<OpcaoMaterial>;
  podeEditar: boolean;
}) {
  const [aba, setAba] = useState<"fornecedores" | "compras" | "precos">("compras");
  const [novo, setNovo] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState("");
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const nomePorId = useMemo(() => new Map(fornecedores.map((f) => [f.id, f.nome])), [fornecedores]);
  const comprasPorFornecedor = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of compras) m.set(c.fornecedor_id, (m.get(c.fornecedor_id) ?? 0) + 1);
    return m;
  }, [compras]);

  const fornecedoresVisiveis = fornecedores.filter((f) => mostrarArquivados || f.ativo);
  const comprasVisiveis = compras.filter((c) => !statusFiltro || STATUS_COMPRA_ROTULO[c.status] === statusFiltro);
  const trocarAba = (k: typeof aba) => {
    setAba(k);
    setNovo(false);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Fornecedores e compras</h1>
          <p className="text-sm text-zinc-500">{fornecedores.length} fornecedor(es) · {compras.length} compra(s)</p>
        </div>
        {podeEditar && !novo && aba !== "precos" && (
          <BotaoNovo onClick={() => setNovo(true)}>
            <Plus className="h-4 w-4" /> {aba === "fornecedores" ? "Novo fornecedor" : "Nova compra"}
          </BotaoNovo>
        )}
      </div>
      {!podeEditar && (
        <div className="mb-4">
          <SomenteLeitura />
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
          {([["compras", "Compras"], ["fornecedores", "Fornecedores"], ["precos", "Preços"]] as const).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => trocarAba(k)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${aba === k ? "bg-copper-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              {l}
            </button>
          ))}
        </div>
        {aba === "compras" && (
          <SegmentFilter
            value={statusFiltro}
            options={Object.values(STATUS_COMPRA_ROTULO)}
            allLabel="Todos os status"
            onChange={setStatusFiltro}
          />
        )}
        {aba === "fornecedores" && (
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input type="checkbox" checked={mostrarArquivados} onChange={(e) => setMostrarArquivados(e.target.checked)} />
            Mostrar arquivados
          </label>
        )}
      </div>

      {aba === "fornecedores" && (
        <div className="space-y-5">
          {novo && <FormFornecedor aoFechar={() => setNovo(false)} />}
          <Cartao titulo="Fornecedores" icone={<Truck className="h-4 w-4" />}>
            {fornecedoresVisiveis.length === 0 ? (
              <Vazio>{fornecedores.length === 0 ? "Nenhum fornecedor cadastrado ainda." : "Nenhum fornecedor ativo."}</Vazio>
            ) : (
              <div className="space-y-2">
                {fornecedoresVisiveis.map((f) => (
                  <LinhaFornecedor key={f.id} item={f} podeEditar={podeEditar} compras={comprasPorFornecedor.get(f.id) ?? 0} />
                ))}
              </div>
            )}
          </Cartao>
        </div>
      )}

      {aba === "compras" && (
        <div className="space-y-5">
          {novo &&
            (fornecedores.some((f) => f.ativo) ? (
              <NovaCompra fornecedores={fornecedores} aoFechar={() => setNovo(false)} />
            ) : (
              <Aviso tom="alerta">Cadastre um fornecedor ativo na aba Fornecedores antes de criar uma compra.</Aviso>
            ))}
          <Cartao titulo="Compras" icone={<ShoppingCart className="h-4 w-4" />}>
            {comprasVisiveis.length === 0 ? (
              <Vazio>
                {compras.length === 0
                  ? "Nenhuma compra ainda. Crie uma cotação, adicione os itens e aprove para poder receber no estoque."
                  : "Nenhuma compra com esse status."}
              </Vazio>
            ) : (
              <div className="space-y-2">
                {comprasVisiveis.map((c) => (
                  <Link
                    key={c.id}
                    href={`/impressao-3d/fornecedores/compras/${c.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5 hover:border-zinc-700"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
                        <span className="text-zinc-500">#{c.numero}</span> {nomePorId.get(c.fornecedor_id) ?? "Fornecedor"}
                        <StatusChip tone={TOM_STATUS_COMPRA[c.status]}>{STATUS_COMPRA_ROTULO[c.status]}</StatusChip>
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {formatDate(c.data)}
                        {c.prazo_entrega && ` · entrega até ${formatDate(c.prazo_entrega)}`}
                        {c.status === "cotacao" && c.validade_cotacao && ` · cotação válida até ${formatDate(c.validade_cotacao)}`}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-zinc-100">{formatMoeda(c.total)}</p>
                  </Link>
                ))}
              </div>
            )}
          </Cartao>
        </div>
      )}

      {aba === "precos" && <AbaPrecos historico={historico} materiais={materiais} fornecedores={fornecedores} />}
    </div>
  );
}
