"use client";

import { useEffect, useMemo, useRef, useState, useActionState } from "react";
import { ClipboardCheck, Plus, Pencil, Trash2 } from "lucide-react";
import type { AvaliacaoDesempenho, Funcionario } from "@/lib/types";
import {
  createAvaliacao,
  updateAvaliacao,
  deleteAvaliacao,
} from "@/app/(dashboard)/rh/avaliacoes/actions";
import { formatDate } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip } from "@/components/status-chip";
import { usePodeEditarRh } from "@/components/rh/salarios-context";
import { NotaEvolucaoChart } from "@/components/rh/nota-evolucao-chart";

function Fields({
  item,
  funcionarios,
  funcionarioFixo,
}: {
  item?: AvaliacaoDesempenho;
  funcionarios: Funcionario[];
  funcionarioFixo?: string;
}) {
  const avaliadorOpcoes = funcionarios.filter((f) => f.id !== item?.funcionario_id);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {funcionarioFixo ? (
        <input type="hidden" name="funcionario_id" value={funcionarioFixo} />
      ) : (
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-zinc-400">Funcionário *</label>
          <select
            name="funcionario_id"
            required
            defaultValue={item?.funcionario_id ?? ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          >
            <option value="" disabled>
              Selecione
            </option>
            {funcionarios.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Avaliador</label>
        <select
          name="avaliador_id"
          defaultValue={item?.avaliador_id ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="">Nenhum</option>
          {avaliadorOpcoes.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Período de referência *</label>
        <input
          name="periodo_referencia"
          type="date"
          required
          defaultValue={item?.periodo_referencia ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Nota (0-10)</label>
        <input
          name="nota"
          type="number"
          step="0.1"
          min="0"
          max="10"
          defaultValue={item?.nota ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">Pontos fortes</label>
        <textarea
          name="pontos_fortes"
          rows={2}
          defaultValue={item?.pontos_fortes ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">Pontos de melhoria</label>
        <textarea
          name="pontos_melhoria"
          rows={2}
          defaultValue={item?.pontos_melhoria ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">Metas para o próximo período</label>
        <textarea
          name="metas_proximo_periodo"
          rows={2}
          defaultValue={item?.metas_proximo_periodo ?? ""}
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

function NewForm({
  funcionarios,
  funcionarioFixo,
}: {
  funcionarios: Funcionario[];
  funcionarioFixo?: string;
}) {
  const [open, setOpen] = useState(false);
  const podeEditar = usePodeEditarRh();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createAvaliacao, undefined);

  useActionSuccess(state, () => setOpen(false));

  useEffect(() => {
    if (!open) formRef.current?.reset();
  }, [open]);

  if (!open) {
    if (!podeEditar) return null;
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500"
      >
        <Plus className="h-4 w-4" />
        Nova avaliação
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <Fields funcionarios={funcionarios} funcionarioFixo={funcionarioFixo} />
      {state && "error" in state && <p className="text-xs text-rose-400">{state.error}</p>}
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

function Row({ item, funcionarios }: { item: AvaliacaoDesempenho; funcionarios: Funcionario[] }) {
  const [editing, setEditing] = useState(false);
  const podeEditar = usePodeEditarRh();
  const action = updateAvaliacao.bind(null, item.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <Fields item={item} funcionarios={funcionarios} funcionarioFixo={item.funcionario_id} />
        {state && "error" in state && <p className="text-xs text-rose-400">{state.error}</p>}
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

  const avaliador = funcionarios.find((f) => f.id === item.avaliador_id);

  return (
    <div className="rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
            {formatDate(item.periodo_referencia)}
            {item.nota != null && <StatusChip tone="copper">Nota {item.nota}</StatusChip>}
          </p>
          <p className="text-xs text-zinc-500">
            {avaliador ? `Avaliado por ${avaliador.nome}` : "Sem avaliador definido"}
          </p>
          {item.pontos_fortes && (
            <p className="mt-1 text-xs text-zinc-400">
              <span className="text-zinc-500">Fortes:</span> {item.pontos_fortes}
            </p>
          )}
          {item.pontos_melhoria && (
            <p className="text-xs text-zinc-400">
              <span className="text-zinc-500">Melhorar:</span> {item.pontos_melhoria}
            </p>
          )}
          {item.metas_proximo_periodo && (
            <p className="text-xs text-zinc-400">
              <span className="text-zinc-500">Metas:</span> {item.metas_proximo_periodo}
            </p>
          )}
        </div>
        {podeEditar && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <form action={deleteAvaliacao.bind(null, item.id)}>
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
    </div>
  );
}

export function AvaliacoesBoard({
  avaliacoes,
  funcionarios,
}: {
  avaliacoes: AvaliacaoDesempenho[];
  funcionarios: Funcionario[];
}) {
  const [funcionarioId, setFuncionarioId] = useState(funcionarios[0]?.id ?? "");

  const avaliacoesDoFuncionario = useMemo(
    () =>
      avaliacoes
        .filter((a) => a.funcionario_id === funcionarioId)
        .sort((a, b) => a.periodo_referencia.localeCompare(b.periodo_referencia)),
    [avaliacoes, funcionarioId]
  );

  const funcionario = funcionarios.find((f) => f.id === funcionarioId);
  const pontosChart = avaliacoesDoFuncionario
    .filter((a): a is AvaliacaoDesempenho & { nota: number } => a.nota != null)
    .map((a) => ({ periodo_referencia: a.periodo_referencia, nota: a.nota }));

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Avaliações de Desempenho</h1>
          <p className="text-sm text-zinc-500">{avaliacoes.length} avaliação(ões) no total</p>
        </div>
        <NewForm funcionarios={funcionarios} funcionarioFixo={funcionarioId || undefined} />
      </div>

      {funcionarios.length > 0 ? (
        <>
          <div className="mb-6 flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
            <label className="text-xs text-zinc-500">Funcionário</label>
            <select
              value={funcionarioId}
              onChange={(e) => setFuncionarioId(e.target.value)}
              className="bg-transparent text-sm text-zinc-300 outline-none"
            >
              {funcionarios.map((f) => (
                <option key={f.id} value={f.id} className="bg-zinc-900">
                  {f.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <ClipboardCheck className="h-4 w-4 text-zinc-500" />
              Histórico {funcionario ? `— ${funcionario.nome}` : ""}
            </div>

            {pontosChart.length > 1 && (
              <div className="mb-4 flex justify-center border-b border-zinc-800/80 pb-4">
                <NotaEvolucaoChart pontos={pontosChart} />
              </div>
            )}

            {avaliacoesDoFuncionario.length > 0 ? (
              <div className="space-y-2">
                {[...avaliacoesDoFuncionario].reverse().map((item) => (
                  <Row key={item.id} item={item} funcionarios={funcionarios} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600">Nenhuma avaliação registrada.</p>
            )}
          </div>
        </>
      ) : (
        <p className="text-xs text-zinc-600">Cadastre funcionários para lançar avaliações.</p>
      )}
    </div>
  );
}
