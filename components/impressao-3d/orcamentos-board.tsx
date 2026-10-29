"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { FileSpreadsheet, Plus, Trash2 } from "lucide-react";
import { StatusChip, type ChipTone } from "@/components/status-chip";
import { SegmentFilter } from "@/components/segment-filter";
import {
  AreaTexto, BotaoNovo, BotaoPrimario, BotaoTexto, Cartao, Entrada, ErroForm, Numero, Seletor,
  SomenteLeitura, Vazio, useAcao,
} from "@/components/impressao-3d/campos";
import { criarOrcamento, excluirOrcamento } from "@/app/(dashboard)/impressao-3d/orcamentos/actions";
import { STATUS_ORCAMENTO_ROTULO, type Orcamento, type StatusOrcamento } from "@/lib/impressao-3d/tipos";
import type { OpcaoCliente, Opcoes } from "@/lib/impressao-3d/opcoes";
import { formatMoeda } from "@/lib/impressao-3d/numeros";
import { formatDate } from "@/lib/format";

export const TOM_STATUS_ORCAMENTO: Record<StatusOrcamento, ChipTone> = {
  rascunho: "zinc",
  enviado: "sky",
  aprovado: "emerald",
  recusado: "rose",
  expirado: "amber",
  convertido: "copper",
};

/** Campos editáveis do orçamento (os únicos que vão em insert/update direto). */
export function CamposOrcamento({
  item,
  clientes,
}: {
  item?: Orcamento;
  clientes: Opcoes<OpcaoCliente>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Entrada rotulo="Título *" name="titulo" required defaultValue={item?.titulo} className="col-span-2" />
      {clientes.acessivel ? (
        <Seletor rotulo="Cliente" name="cliente_id" defaultValue={item?.cliente_id ?? ""}>
          <option value="">Sem cliente</option>
          {clientes.itens.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </Seletor>
      ) : (
        <input type="hidden" name="cliente_id" value={item?.cliente_id ?? ""} />
      )}
      <Entrada rotulo="Validade" name="validade" type="date" defaultValue={item?.validade ?? ""} />
      <Numero rotulo="Desconto (R$)" name="desconto_valor" defaultValue={item?.desconto_valor ?? ""} />
      <AreaTexto rotulo="Observações" name="observacoes" defaultValue={item?.observacoes ?? ""} className="col-span-2 sm:col-span-3" />
      {!clientes.acessivel && (
        <p className="col-span-2 text-[11px] text-zinc-600 sm:col-span-4">
          Sem acesso a Clientes: o cliente atual é mantido.
        </p>
      )}
    </div>
  );
}

function NovoOrcamento({ clientes, aoFechar }: { clientes: Opcoes<OpcaoCliente>; aoFechar: () => void }) {
  // Sucesso redireciona para o orçamento criado (a action faz o redirect).
  const [state, formAction, pendente] = useActionState(criarOrcamento, undefined);
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <CamposOrcamento clientes={clientes} />
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Criando..." : "Criar e abrir"}</BotaoPrimario>
      </div>
    </form>
  );
}

export function OrcamentosBoard({
  orcamentos,
  clientes,
  podeEditar,
  verCustos,
}: {
  orcamentos: Orcamento[];
  clientes: Opcoes<OpcaoCliente>;
  podeEditar: boolean;
  verCustos: boolean;
}) {
  const [novo, setNovo] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState("");
  const { executar, pendente } = useAcao();
  const clientePorId = useMemo(() => new Map(clientes.itens.map((c) => [c.id, c.nome])), [clientes.itens]);
  const visiveis = orcamentos.filter(
    (o) => !statusFiltro || STATUS_ORCAMENTO_ROTULO[o.status] === statusFiltro
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Orçamentos 3D</h1>
          <p className="text-sm text-zinc-500">{visiveis.length} orçamento(s)</p>
        </div>
        {podeEditar && !novo && (
          <BotaoNovo onClick={() => setNovo(true)}>
            <Plus className="h-4 w-4" /> Novo orçamento
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
          <NovoOrcamento clientes={clientes} aoFechar={() => setNovo(false)} />
        </div>
      )}

      <div className="mb-6">
        <SegmentFilter
          value={statusFiltro}
          options={Object.values(STATUS_ORCAMENTO_ROTULO)}
          allLabel="Todos os status"
          onChange={setStatusFiltro}
        />
      </div>

      <Cartao titulo="Orçamentos" icone={<FileSpreadsheet className="h-4 w-4" />}>
        {visiveis.length === 0 ? (
          <Vazio>
            {orcamentos.length === 0
              ? "Nenhum orçamento ainda. Crie um e adicione itens calculados pelo simulador."
              : "Nenhum orçamento com esse status."}
          </Vazio>
        ) : (
          <div className="space-y-2">
            {visiveis.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
                <Link href={`/impressao-3d/orcamentos/${o.id}`} className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
                    <span className="text-zinc-500">#{o.numero}</span> {o.titulo}
                    <StatusChip tone={TOM_STATUS_ORCAMENTO[o.status]}>{STATUS_ORCAMENTO_ROTULO[o.status]}</StatusChip>
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {o.cliente_id ? (clientePorId.get(o.cliente_id) ?? "Cliente") : "Sem cliente"}
                    {o.validade && ` · válido até ${formatDate(o.validade)}`}
                    {` · criado em ${formatDate(o.created_at.slice(0, 10))}`}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-zinc-100">{formatMoeda(o.total)}</p>
                    {verCustos && (
                      <p className="text-[11px] text-zinc-500">
                        lucro {formatMoeda(o.lucro_total)} <span className="text-amber-500">estimado</span>
                      </p>
                    )}
                  </div>
                  {podeEditar && o.status === "rascunho" && (
                    <button
                      type="button"
                      disabled={pendente}
                      aria-label="Excluir orçamento"
                      onClick={() => executar(() => excluirOrcamento(o.id), { confirmar: `Excluir o orçamento #${o.numero} "${o.titulo}" e seus itens?`, sucesso: "Orçamento excluído." })}
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
