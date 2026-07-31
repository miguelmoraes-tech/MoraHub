"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { Plus, ShieldCheck, X } from "lucide-react";
import type {
  ChecklistItem,
  ComplianceCategoria,
  ComplianceJuridico,
  ComplianceStatus,
} from "@/lib/types";
import type { ClienteVinculado } from "@/lib/colaborador-shared";
import {
  createCompliance,
  updateCompliance,
} from "@/app/colaborador/advogado/compliance/actions";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { ChecklistEditor } from "@/components/colaborador/checklist-editor";

const CATEGORIAS: ComplianceCategoria[] = ["LGPD", "Alvará", "Licença", "Outro"];

const STATUS_LABEL: Record<ComplianceStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  conforme: "Conforme",
};

const STATUS_CELL_CLASS: Record<ComplianceStatus, string> = {
  pendente: "border-zinc-700 bg-zinc-800/60 text-zinc-300",
  em_andamento: "border-amber-800/60 bg-amber-950/30 text-amber-300",
  conforme: "border-emerald-800/60 bg-emerald-950/30 text-emerald-300",
};

function CriarComplianceForm({
  clienteNome,
  categoria,
  clienteId,
  onClose,
}: {
  clienteNome: string;
  categoria: ComplianceCategoria;
  clienteId: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createCompliance,
    undefined
  );
  useActionSuccess(state, onClose);

  return (
    <form action={formAction} className="space-y-3 px-5 py-4">
      <input type="hidden" name="cliente_id" value={clienteId} />
      <input type="hidden" name="categoria" value={categoria} />
      <p className="text-sm text-zinc-400">
        Nenhum registro de {categoria} para {clienteNome}.
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
        {pending ? "Criando..." : "Criar registro"}
      </button>
    </form>
  );
}

function EditarComplianceForm({
  compliance,
  onClose,
}: {
  compliance: ComplianceJuridico;
  onClose: () => void;
}) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    compliance.checklist
  );
  const action = updateCompliance.bind(null, compliance.id);
  const [state, formAction, pending] = useActionState(action, undefined);
  useActionSuccess(state, onClose);

  return (
    <form action={formAction} className="space-y-3 px-5 py-4">
      <input type="hidden" name="checklist" value={JSON.stringify(checklist)} />
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Status</label>
        <select
          name="status"
          defaultValue={compliance.status}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          {(Object.keys(STATUS_LABEL) as ComplianceStatus[]).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      </div>

      <ChecklistEditor items={checklist} onChange={setChecklist} />

      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Próxima revisão
        </label>
        <input
          name="proxima_revisao"
          type="date"
          defaultValue={compliance.proxima_revisao ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Observações</label>
        <textarea
          name="observacoes"
          rows={2}
          defaultValue={compliance.observacoes ?? ""}
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

export function ComplianceGrid({
  clientes,
  registros,
}: {
  clientes: ClienteVinculado[];
  registros: ComplianceJuridico[];
}) {
  const [selecionado, setSelecionado] = useState<{
    clienteId: string;
    clienteNome: string;
    categoria: ComplianceCategoria;
  } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const registrosPorChave = useMemo(() => {
    const map = new Map<string, ComplianceJuridico>();
    for (const r of registros) {
      if (!r.cliente_id) continue;
      map.set(`${r.cliente_id}|${r.categoria}`, r);
    }
    return map;
  }, [registros]);

  function abrirCelula(
    clienteId: string,
    clienteNome: string,
    categoria: ComplianceCategoria
  ) {
    setSelecionado({ clienteId, clienteNome, categoria });
    dialogRef.current?.showModal();
  }

  const registroSelecionado = selecionado
    ? (registrosPorChave.get(
        `${selecionado.clienteId}|${selecionado.categoria}`
      ) ?? null)
    : null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-100">Compliance</h1>
        <p className="text-sm text-zinc-500">
          {clientes.length} cliente(s) vinculado(s)
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <ShieldCheck className="h-4 w-4 text-zinc-500" />
          Grade de compliance
        </div>

        {clientes.length === 0 ? (
          <p className="text-xs text-zinc-600">Nenhum cliente vinculado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-separate border-spacing-1.5">
              <thead>
                <tr>
                  <th className="px-1 pb-1 text-left text-[11px] font-medium uppercase tracking-wide text-zinc-600">
                    Cliente
                  </th>
                  {CATEGORIAS.map((categoria) => (
                    <th
                      key={categoria}
                      className="px-1 pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-zinc-600"
                    >
                      {categoria}
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
                    {CATEGORIAS.map((categoria) => {
                      const registro = registrosPorChave.get(
                        `${cliente.id}|${categoria}`
                      );
                      return (
                        <td key={categoria} className="p-0 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              abrirCelula(cliente.id, cliente.nome, categoria)
                            }
                            className={`h-10 w-full min-w-20 rounded-lg border text-[11px] font-medium transition-colors hover:opacity-80 ${
                              registro
                                ? STATUS_CELL_CLASS[registro.status]
                                : "border-dashed border-zinc-800 bg-zinc-950/40 text-zinc-700"
                            }`}
                          >
                            {registro ? STATUS_LABEL[registro.status] : "+"}
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
              {selecionado && `${selecionado.clienteNome} · ${selecionado.categoria}`}
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
            (registroSelecionado ? (
              <EditarComplianceForm
                key={registroSelecionado.id}
                compliance={registroSelecionado}
                onClose={() => dialogRef.current?.close()}
              />
            ) : (
              <CriarComplianceForm
                key={`${selecionado.clienteId}-${selecionado.categoria}`}
                clienteNome={selecionado.clienteNome}
                categoria={selecionado.categoria}
                clienteId={selecionado.clienteId}
                onClose={() => dialogRef.current?.close()}
              />
            ))}
        </div>
      </dialog>
    </div>
  );
}
