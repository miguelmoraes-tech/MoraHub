"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { PieChart, Plus, Pencil, Trash2 } from "lucide-react";
import type { Orcamento } from "@/lib/types";
import {
  createOrcamento,
  updateOrcamento,
  deleteOrcamento,
} from "@/app/(dashboard)/orcamentos/actions";
import { formatCurrency } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip, type ChipTone } from "@/components/status-chip";

export type OrcamentoComRealizado = Orcamento & { realizado: number };

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function mesLabel(mesReferencia: string) {
  const [ano, mes] = mesReferencia.slice(0, 7).split("-").map(Number);
  return `${MESES[mes - 1]} de ${ano}`;
}

function Fields({ item }: { item?: Orcamento }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Categoria *</label>
        <input
          name="categoria"
          required
          placeholder="Ex: Marketing"
          defaultValue={item?.categoria}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Mês *</label>
        <input
          name="mes_referencia"
          type="month"
          required
          defaultValue={item?.mes_referencia.slice(0, 7) ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Valor planejado *
        </label>
        <input
          name="valor_planejado"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={item?.valor_planejado}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">Observações</label>
        <textarea
          name="observacoes"
          rows={2}
          defaultValue={item?.observacoes ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
    </div>
  );
}

function NewForm() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createOrcamento,
    undefined
  );

  useActionSuccess(state, () => setOpen(false));

  useEffect(() => {
    if (!open) formRef.current?.reset();
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500"
      >
        <Plus className="h-4 w-4" />
        Novo orçamento
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <Fields />
      {state && "error" in state && (
        <p className="text-xs text-rose-400">{state.error}</p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-copper-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-copper-500 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}

function Row({
  item,
  somenteLeitura,
  semValores,
}: {
  item: OrcamentoComRealizado;
  somenteLeitura: boolean;
  semValores: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateOrcamento.bind(null, item.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <Fields item={item} />
        {state && "error" in state && (
          <p className="text-xs text-rose-400">{state.error}</p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-copper-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-copper-500 disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    );
  }

  const pct =
    item.valor_planejado > 0
      ? Math.min(200, Math.round((item.realizado / item.valor_planejado) * 100))
      : 0;
  const estourou = item.realizado > item.valor_planejado;
  const tone: ChipTone = estourou ? "rose" : pct >= 80 ? "amber" : "emerald";
  const barClass = estourou
    ? "bg-rose-500"
    : pct >= 80
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <div className="rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
            {item.categoria}
            <StatusChip tone={tone}>{pct}% do planejado</StatusChip>
          </p>
          <p className="text-xs text-zinc-500">
            {semValores
              ? "Valores ocultos"
              : `${formatCurrency(item.realizado)} realizado de ${formatCurrency(item.valor_planejado)} planejado`}
            {item.observacoes && ` · ${item.observacoes}`}
          </p>
        </div>
        {!somenteLeitura && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <form action={deleteOrcamento.bind(null, item.id)}>
              <button
                type="submit"
                className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

export function OrcamentosBoard({
  orcamentos,
  somenteLeitura = false,
  semValores = false,
}: {
  orcamentos: OrcamentoComRealizado[];
  somenteLeitura?: boolean;
  semValores?: boolean;
}) {
  const porMes = new Map<string, OrcamentoComRealizado[]>();
  for (const item of orcamentos) {
    const chave = item.mes_referencia.slice(0, 7);
    const lista = porMes.get(chave) ?? [];
    lista.push(item);
    porMes.set(chave, lista);
  }
  const mesesOrdenados = [...porMes.entries()].sort(([a], [b]) =>
    b.localeCompare(a)
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Orçamento</h1>
          <p className="text-sm text-zinc-500">
            {orcamentos.length} orçamento(s) · planejado vs. realizado
          </p>
        </div>
        {!somenteLeitura && <NewForm />}
      </div>

      {mesesOrdenados.length > 0 ? (
        <div className="space-y-5">
          {mesesOrdenados.map(([mes, itens]) => (
            <div
              key={mes}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
            >
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <PieChart className="h-4 w-4 text-zinc-500" />
                {mesLabel(`${mes}-01`)}
              </div>
              <div className="space-y-2">
                {itens.map((item) => (
                  <Row
                    key={item.id}
                    item={item}
                    somenteLeitura={somenteLeitura}
                    semValores={semValores}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-xs text-zinc-600">Nenhum orçamento cadastrado.</p>
        </div>
      )}
    </div>
  );
}
