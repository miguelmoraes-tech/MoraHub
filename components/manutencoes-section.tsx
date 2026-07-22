"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { History, Plus, Pencil, Trash2 } from "lucide-react";
import type { Manutencao, Projeto } from "@/lib/types";
import {
  createManutencao,
  updateManutencao,
  deleteManutencao,
} from "@/app/(dashboard)/clientes/[id]/actions";
import { formatDate } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";

function ManutencaoFields({
  manutencao,
  projetos,
}: {
  manutencao?: Manutencao;
  projetos: Projeto[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Data *</label>
        <input
          name="data"
          type="date"
          required
          defaultValue={manutencao?.data}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Responsável
        </label>
        <input
          name="responsavel"
          defaultValue={manutencao?.responsavel ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Tempo gasto
        </label>
        <input
          name="tempo_gasto"
          placeholder="Ex: 2h"
          defaultValue={manutencao?.tempo_gasto ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Projeto</label>
        <select
          name="projeto_id"
          defaultValue={manutencao?.projeto_id ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="">Nenhum</option>
          {projetos.map((projeto) => (
            <option key={projeto.id} value={projeto.id}>
              {projeto.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">
          Descrição *
        </label>
        <input
          name="descricao"
          required
          defaultValue={manutencao?.descricao}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">
          Observações
        </label>
        <textarea
          name="observacoes"
          rows={2}
          defaultValue={manutencao?.observacoes ?? ""}
          className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
    </div>
  );
}

function NewManutencaoForm({
  clienteId,
  projetos,
}: {
  clienteId: string;
  projetos: Projeto[];
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const action = createManutencao.bind(null, clienteId);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setOpen(false));

  useEffect(() => {
    if (!open) formRef.current?.reset();
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-copper-400 hover:text-copper-300"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar manutenção
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <ManutencaoFields projetos={projetos} />
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

function ManutencaoRow({
  clienteId,
  manutencao,
  projetos,
}: {
  clienteId: string;
  manutencao: Manutencao;
  projetos: Projeto[];
}) {
  const [editing, setEditing] = useState(false);
  const action = updateManutencao.bind(null, clienteId, manutencao.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <ManutencaoFields manutencao={manutencao} projetos={projetos} />
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

  const projeto = projetos.find((p) => p.id === manutencao.projeto_id);

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm text-zinc-200">
          {manutencao.descricao}
        </p>
        <p className="text-xs text-zinc-500">
          {formatDate(manutencao.data)}
          {manutencao.responsavel && ` · ${manutencao.responsavel}`}
          {manutencao.tempo_gasto && ` · ${manutencao.tempo_gasto}`}
          {projeto && ` · ${projeto.nome}`}
        </p>
        {manutencao.observacoes && (
          <p className="mt-1 text-xs text-zinc-500">
            {manutencao.observacoes}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <form action={deleteManutencao.bind(null, clienteId, manutencao.id)}>
          <button
            type="submit"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

export function ManutencoesSection({
  clienteId,
  manutencoes,
  projetos,
}: {
  clienteId: string;
  manutencoes: Manutencao[];
  projetos: Projeto[];
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <History className="h-4 w-4 text-zinc-500" />
          Histórico de manutenção
        </h2>
        <NewManutencaoForm clienteId={clienteId} projetos={projetos} />
      </div>

      {manutencoes.length > 0 ? (
        <div className="space-y-2">
          {manutencoes.map((manutencao) => (
            <ManutencaoRow
              key={manutencao.id}
              clienteId={clienteId}
              manutencao={manutencao}
              projetos={projetos}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">Nenhuma manutenção registrada.</p>
      )}
    </div>
  );
}
