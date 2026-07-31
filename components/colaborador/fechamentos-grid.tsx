"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Grid3x3, Plus, X } from "lucide-react";
import type {
  FechamentoChecklistItem,
  FechamentoMensal,
  FechamentoStatus,
} from "@/lib/types";
import type { ClienteVinculado } from "@/lib/colaborador-shared";
import {
  createFechamento,
  updateFechamento,
} from "@/app/colaborador/contador/fechamentos/actions";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { ChecklistEditor } from "@/components/colaborador/checklist-editor";

const MESES_ABREV = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const STATUS_LABEL: Record<FechamentoStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

const STATUS_CELL_CLASS: Record<FechamentoStatus, string> = {
  pendente: "border-zinc-700 bg-zinc-800/60 text-zinc-300",
  em_andamento: "border-amber-800/60 bg-amber-950/30 text-amber-300",
  concluido: "border-emerald-800/60 bg-emerald-950/30 text-emerald-300",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function monthsWindow(centerYear: number, centerMonth0: number, size: number) {
  const months: { year: number; month: number; iso: string; label: string }[] = [];
  for (let i = size - 1; i >= 0; i--) {
    let m = centerMonth0 - i;
    let y = centerYear;
    while (m < 0) {
      m += 12;
      y -= 1;
    }
    months.push({
      year: y,
      month: m,
      iso: `${y}-${pad(m + 1)}-01`,
      label: `${MESES_ABREV[m]}/${String(y).slice(2)}`,
    });
  }
  return months;
}

function CriarFechamentoForm({
  clienteNome,
  mesLabel,
  clienteId,
  mesIso,
  onClose,
}: {
  clienteNome: string;
  mesLabel: string;
  clienteId: string;
  mesIso: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createFechamento,
    undefined
  );
  useActionSuccess(state, onClose);

  return (
    <form action={formAction} className="space-y-3 px-5 py-4">
      <input type="hidden" name="cliente_id" value={clienteId} />
      <input type="hidden" name="mes_referencia" value={mesIso} />
      <p className="text-sm text-zinc-400">
        Nenhum fechamento criado para {clienteNome} em {mesLabel}.
      </p>
      {state && "error" in state && (
        <p className="text-xs text-rose-400">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1.5 rounded-md bg-copper-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-copper-500 disabled:opacity-60"
      >
        <Plus className="h-3.5 w-3.5" />
        {pending ? "Criando..." : "Criar fechamento"}
      </button>
    </form>
  );
}

function EditarFechamentoForm({
  fechamento,
  onClose,
}: {
  fechamento: FechamentoMensal;
  onClose: () => void;
}) {
  const [checklist, setChecklist] = useState<FechamentoChecklistItem[]>(
    fechamento.checklist
  );
  const action = updateFechamento.bind(null, fechamento.id);
  const [state, formAction, pending] = useActionState(action, undefined);
  useActionSuccess(state, onClose);

  return (
    <form action={formAction} className="space-y-3 px-5 py-4">
      <input type="hidden" name="checklist" value={JSON.stringify(checklist)} />
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Status</label>
        <select
          name="status"
          defaultValue={fechamento.status}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          {(Object.keys(STATUS_LABEL) as FechamentoStatus[]).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      </div>

      <ChecklistEditor items={checklist} onChange={setChecklist} />

      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Observações</label>
        <textarea
          name="observacoes"
          rows={2}
          defaultValue={fechamento.observacoes ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>

      {state && "error" in state && (
        <p className="text-xs text-rose-400">{state.error}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-copper-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-copper-500 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}

export function FechamentosGrid({
  clientes,
  fechamentos,
}: {
  clientes: ClienteVinculado[];
  fechamentos: FechamentoMensal[];
}) {
  const hoje = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState({
    year: hoje.getFullYear(),
    month: hoje.getMonth(),
  });
  const [selecionado, setSelecionado] = useState<{
    clienteId: string;
    clienteNome: string;
    mesIso: string;
    mesLabel: string;
  } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const meses = useMemo(
    () => monthsWindow(cursor.year, cursor.month, 6),
    [cursor]
  );

  const fechamentosPorChave = useMemo(() => {
    const map = new Map<string, FechamentoMensal>();
    for (const f of fechamentos) {
      map.set(`${f.cliente_id}|${f.mes_referencia.slice(0, 7)}`, f);
    }
    return map;
  }, [fechamentos]);

  function abrirCelula(clienteId: string, clienteNome: string, mes: (typeof meses)[number]) {
    setSelecionado({
      clienteId,
      clienteNome,
      mesIso: mes.iso,
      mesLabel: `${mes.label}`,
    });
    dialogRef.current?.showModal();
  }

  const fechamentoSelecionado = selecionado
    ? (fechamentosPorChave.get(
        `${selecionado.clienteId}|${selecionado.mesIso.slice(0, 7)}`
      ) ?? null)
    : null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">
            Fechamento mensal
          </h1>
          <p className="text-sm text-zinc-500">
            {clientes.length} cliente(s) vinculado(s)
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              setCursor((c) =>
                c.month === 0
                  ? { year: c.year - 1, month: 11 }
                  : { year: c.year, month: c.month - 1 }
              )
            }
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setCursor((c) =>
                c.month === 11
                  ? { year: c.year + 1, month: 0 }
                  : { year: c.year, month: c.month + 1 }
              )
            }
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Grid3x3 className="h-4 w-4 text-zinc-500" />
          Grade de fechamentos
        </div>

        {clientes.length === 0 ? (
          <p className="text-xs text-zinc-600">Nenhum cliente vinculado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-1.5">
              <thead>
                <tr>
                  <th className="px-1 pb-1 text-left text-[11px] font-medium uppercase tracking-wide text-zinc-600">
                    Cliente
                  </th>
                  {meses.map((mes) => (
                    <th
                      key={mes.iso}
                      className="px-1 pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-zinc-600"
                    >
                      {mes.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr key={cliente.id}>
                    <td className="max-w-[160px] truncate px-1 py-1 text-sm text-zinc-300">
                      {cliente.nome}
                      <span className="block truncate text-[11px] text-zinc-600">
                        {cliente.donoNome}
                      </span>
                    </td>
                    {meses.map((mes) => {
                      const fechamento = fechamentosPorChave.get(
                        `${cliente.id}|${mes.iso.slice(0, 7)}`
                      );
                      return (
                        <td key={mes.iso} className="p-0 text-center">
                          <button
                            type="button"
                            onClick={() => abrirCelula(cliente.id, cliente.nome, mes)}
                            className={`h-10 w-full min-w-16 rounded-lg border text-[11px] font-medium transition-colors hover:opacity-80 ${
                              fechamento
                                ? STATUS_CELL_CLASS[fechamento.status]
                                : "border-dashed border-zinc-800 bg-zinc-950/40 text-zinc-700"
                            }`}
                          >
                            {fechamento ? STATUS_LABEL[fechamento.status] : "+"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setSelecionado(null)}
        className="fixed inset-0 m-0 hidden h-full max-h-none w-full max-w-none open:flex items-center justify-center bg-transparent p-4 text-zinc-100 backdrop:bg-black/60"
      >
        <div className="flex max-h-[calc(100vh-4rem)] w-full max-w-md flex-col overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
            <h2 className="text-sm font-semibold">
              {selecionado && `${selecionado.clienteNome} · ${selecionado.mesLabel}`}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="shrink-0 text-zinc-500 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {selecionado &&
            (fechamentoSelecionado ? (
              <EditarFechamentoForm
                key={fechamentoSelecionado.id}
                fechamento={fechamentoSelecionado}
                onClose={() => dialogRef.current?.close()}
              />
            ) : (
              <CriarFechamentoForm
                key={`${selecionado.clienteId}-${selecionado.mesIso}`}
                clienteNome={selecionado.clienteNome}
                mesLabel={selecionado.mesLabel}
                clienteId={selecionado.clienteId}
                mesIso={selecionado.mesIso}
                onClose={() => dialogRef.current?.close()}
              />
            ))}
        </div>
      </dialog>
    </div>
  );
}
