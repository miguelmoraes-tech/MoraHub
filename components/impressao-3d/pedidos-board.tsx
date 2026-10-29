"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { StatusChip, type ChipTone } from "@/components/status-chip";
import { SegmentFilter } from "@/components/segment-filter";
import {
  AreaTexto, BotaoNovo, BotaoPrimario, BotaoTexto, Cartao, Entrada, ErroForm, Numero, Seletor,
  SomenteLeitura, Vazio, useAcao,
} from "@/components/impressao-3d/campos";
import { criarPedido, excluirPedido } from "@/app/(dashboard)/impressao-3d/pedidos/actions";
import {
  PRIORIDADE_ROTULO, STATUS_PAGAMENTO_ROTULO, STATUS_PEDIDO_ROTULO,
  type Pedido, type Prioridade, type StatusPagamento, type StatusPedido,
} from "@/lib/impressao-3d/tipos-operacao";
import type { OpcaoCliente, Opcoes } from "@/lib/impressao-3d/opcoes";
import { podeExcluirPedido, prazoVencido } from "@/lib/impressao-3d/regras-operacao";
import { formatMoeda } from "@/lib/impressao-3d/numeros";
import { formatDate } from "@/lib/format";

export const TOM_STATUS_PEDIDO: Record<StatusPedido, ChipTone> = {
  novo: "zinc",
  confirmado: "sky",
  em_producao: "amber",
  pronto: "copper",
  enviado: "sky",
  entregue: "emerald",
  cancelado: "rose",
};
export const TOM_PAGAMENTO: Record<StatusPagamento, ChipTone> = {
  pendente: "zinc",
  parcial: "amber",
  pago: "emerald",
};
export const TOM_PRIORIDADE: Record<Prioridade, ChipTone> = {
  baixa: "zinc",
  normal: "zinc",
  alta: "amber",
  urgente: "rose",
};

/**
 * Campos do pedido. `limitado` = pedido já em produção: só prioridade, prazo e observações
 * (cliente, desconto e frete só antes da produção).
 */
export function CamposPedido({
  item,
  clientes,
  limitado = false,
}: {
  item?: Pedido;
  clientes: Opcoes<OpcaoCliente>;
  limitado?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {!limitado && (
        <>
          {clientes.acessivel ? (
            <Seletor rotulo="Cliente cadastrado" name="cliente_id" defaultValue={item?.cliente_id ?? ""} className="col-span-2">
              <option value="">Sem cliente cadastrado</option>
              {clientes.itens.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </Seletor>
          ) : (
            <input type="hidden" name="cliente_id" value={item?.cliente_id ?? ""} />
          )}
          <Entrada
            rotulo="Ou cliente avulso"
            name="cliente_avulso"
            defaultValue={item?.cliente_avulso ?? ""}
            placeholder="Nome de quem comprou"
            ajuda="Obrigatório se nenhum cliente cadastrado for escolhido."
            className="col-span-2"
          />
        </>
      )}
      <Seletor rotulo="Prioridade" name="prioridade" defaultValue={item?.prioridade ?? "normal"}>
        {Object.entries(PRIORIDADE_ROTULO).map(([k, l]) => (
          <option key={k} value={k}>{l}</option>
        ))}
      </Seletor>
      {!limitado && <Entrada rotulo="Data do pedido" name="data_pedido" type="date" defaultValue={item?.data_pedido ?? ""} ajuda="Vazio = hoje." />}
      <Entrada rotulo="Prazo de entrega" name="prazo_entrega" type="date" defaultValue={item?.prazo_entrega ?? ""} />
      {!limitado && (
        <>
          <Numero rotulo="Desconto (R$)" name="desconto_valor" defaultValue={item?.desconto_valor ?? ""} />
          <Numero rotulo="Frete cobrado (R$)" name="frete_valor" defaultValue={item?.frete_valor ?? ""} />
        </>
      )}
      <AreaTexto rotulo="Observações" name="observacoes" defaultValue={item?.observacoes ?? ""} className="col-span-2 sm:col-span-4" />
      {limitado && (
        <p className="col-span-2 text-[11px] text-zinc-600 sm:col-span-4">
          Com o pedido em produção, cliente, desconto e frete não podem mais ser alterados.
        </p>
      )}
    </div>
  );
}

function NovoPedido({ clientes, aoFechar }: { clientes: Opcoes<OpcaoCliente>; aoFechar: () => void }) {
  // Sucesso redireciona para o pedido criado (a action faz o redirect).
  const [state, formAction, pendente] = useActionState(criarPedido, undefined);
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <CamposPedido clientes={clientes} />
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Criando..." : "Criar e abrir"}</BotaoPrimario>
      </div>
    </form>
  );
}

export function nomeDoCliente(p: Pick<Pedido, "cliente_id" | "cliente_avulso">, nomes: Map<string, string>, acessivel: boolean): string {
  if (p.cliente_id) return nomes.get(p.cliente_id) ?? (acessivel ? "Cliente" : "Cliente cadastrado");
  return p.cliente_avulso ?? "Sem cliente";
}

export function PedidosBoard({
  pedidos,
  clientes,
  podeEditar,
  verCustos,
  hoje,
}: {
  pedidos: Pedido[];
  clientes: Opcoes<OpcaoCliente>;
  podeEditar: boolean;
  verCustos: boolean;
  hoje: string;
}) {
  const [novo, setNovo] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState("");
  const [pagamentoFiltro, setPagamentoFiltro] = useState("");
  const [soVencidos, setSoVencidos] = useState(false);
  const { executar, pendente } = useAcao();
  const nomes = useMemo(() => new Map(clientes.itens.map((c) => [c.id, c.nome])), [clientes.itens]);

  const visiveis = pedidos.filter(
    (p) =>
      (!statusFiltro || STATUS_PEDIDO_ROTULO[p.status] === statusFiltro) &&
      (!pagamentoFiltro || STATUS_PAGAMENTO_ROTULO[p.status_pagamento] === pagamentoFiltro) &&
      (!soVencidos || prazoVencido(p, hoje))
  );
  const vencidos = pedidos.filter((p) => prazoVencido(p, hoje)).length;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Pedidos e vendas</h1>
          <p className="text-sm text-zinc-500">{visiveis.length} pedido(s)</p>
        </div>
        {podeEditar && !novo && (
          <BotaoNovo onClick={() => setNovo(true)}>
            <Plus className="h-4 w-4" /> Novo pedido
          </BotaoNovo>
        )}
      </div>
      {!podeEditar && (
        <div className="mb-4">
          <SomenteLeitura />
        </div>
      )}
      {novo && (
        <div className="mb-5">
          <NovoPedido clientes={clientes} aoFechar={() => setNovo(false)} />
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SegmentFilter
          value={statusFiltro}
          options={Object.values(STATUS_PEDIDO_ROTULO)}
          allLabel="Todos os status"
          onChange={setStatusFiltro}
        />
        <SegmentFilter
          value={pagamentoFiltro}
          options={Object.values(STATUS_PAGAMENTO_ROTULO)}
          allLabel="Todos os pagamentos"
          onChange={setPagamentoFiltro}
        />
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input type="checkbox" checked={soVencidos} onChange={(e) => setSoVencidos(e.target.checked)} />
          Prazo vencido ({vencidos})
        </label>
      </div>

      <Cartao titulo="Pedidos" icone={<ClipboardList className="h-4 w-4" />}>
        {visiveis.length === 0 ? (
          <Vazio>
            {pedidos.length === 0
              ? "Nenhum pedido ainda. Crie um pedido manual ou converta um orçamento aprovado."
              : "Nenhum pedido com esses filtros."}
          </Vazio>
        ) : (
          <div className="space-y-2">
            {visiveis.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
                <Link href={`/impressao-3d/pedidos/${p.id}`} className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
                    <span className="text-zinc-500">#{p.numero}</span> {nomeDoCliente(p, nomes, clientes.acessivel)}
                    <StatusChip tone={TOM_STATUS_PEDIDO[p.status]}>{STATUS_PEDIDO_ROTULO[p.status]}</StatusChip>
                    <StatusChip tone={TOM_PAGAMENTO[p.status_pagamento]}>Pagamento {STATUS_PAGAMENTO_ROTULO[p.status_pagamento].toLowerCase()}</StatusChip>
                    {(p.prioridade === "alta" || p.prioridade === "urgente") && (
                      <StatusChip tone={TOM_PRIORIDADE[p.prioridade]}>{PRIORIDADE_ROTULO[p.prioridade]}</StatusChip>
                    )}
                    {prazoVencido(p, hoje) && <StatusChip tone="rose">Prazo vencido</StatusChip>}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {formatDate(p.data_pedido)}
                    {p.prazo_entrega && ` · prazo ${formatDate(p.prazo_entrega)}`}
                    {p.origem === "orcamento" && " · veio de orçamento"}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-zinc-100">{formatMoeda(p.total)}</p>
                    <p className="text-[11px] text-zinc-500">
                      pago {formatMoeda(p.pago_valor)}
                      {verCustos && ` · lucro ${formatMoeda(p.lucro_total)}`}
                    </p>
                  </div>
                  {podeEditar && podeExcluirPedido(p) && (
                    <button
                      type="button"
                      disabled={pendente}
                      aria-label="Excluir pedido"
                      onClick={() => executar(() => excluirPedido(p.id), { confirmar: `Excluir o pedido #${p.numero} e seus itens?`, sucesso: "Pedido excluído." })}
                      className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Cartao>
    </div>
  );
}
