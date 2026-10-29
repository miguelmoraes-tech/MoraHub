"use client";

import { useEffect, useRef, useState, useActionState } from "react";
import { Palmtree, Plus, Pencil, Trash2 } from "lucide-react";
import type { Feria, FeriasStatus, Funcionario } from "@/lib/types";
import { createFerias, updateFerias, deleteFerias } from "@/app/(dashboard)/rh/ferias/actions";
import { formatDate } from "@/lib/format";
import { todayISO, diffInDays } from "@/lib/vencimentos/dates";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip, type ChipTone } from "@/components/status-chip";
import { usePodeEditarRh } from "@/components/rh/salarios-context";

const STATUS_LABEL: Record<FeriasStatus, string> = {
  pendente: "Pendente",
  agendada: "Agendada",
  em_gozo: "Em gozo",
  concluida: "Concluída",
};

const STATUS_TONE: Record<FeriasStatus, ChipTone> = {
  pendente: "amber",
  agendada: "sky",
  em_gozo: "copper",
  concluida: "emerald",
};

const VENCENDO_JANELA_DIAS = 30;

function Fields({ item, funcionarios }: { item?: Feria; funcionarios: Funcionario[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Status</label>
        <select
          name="status"
          defaultValue={item?.status ?? "pendente"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Período aquisitivo (início)</label>
        <input
          name="periodo_aquisitivo_inicio"
          type="date"
          defaultValue={item?.periodo_aquisitivo_inicio ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Período aquisitivo (fim)</label>
        <input
          name="periodo_aquisitivo_fim"
          type="date"
          defaultValue={item?.periodo_aquisitivo_fim ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Dias de direito</label>
        <input
          name="dias_direito"
          type="number"
          min="0"
          defaultValue={item?.dias_direito ?? 30}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Dias já gozados</label>
        <input
          name="dias_gozados"
          type="number"
          min="0"
          defaultValue={item?.dias_gozados ?? 0}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Início do gozo</label>
        <input
          name="data_inicio_gozo"
          type="date"
          defaultValue={item?.data_inicio_gozo ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Fim do gozo</label>
        <input
          name="data_fim_gozo"
          type="date"
          defaultValue={item?.data_fim_gozo ?? ""}
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

function NewForm({ funcionarios }: { funcionarios: Funcionario[] }) {
  const [open, setOpen] = useState(false);
  const podeEditar = usePodeEditarRh();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createFerias, undefined);

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
        Novas férias
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <Fields funcionarios={funcionarios} />
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

function Row({
  item,
  funcionarios,
  hoje,
}: {
  item: Feria;
  funcionarios: Funcionario[];
  hoje: string;
}) {
  const [editing, setEditing] = useState(false);
  const podeEditar = usePodeEditarRh();
  const action = updateFerias.bind(null, item.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <Fields item={item} funcionarios={funcionarios} />
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

  const funcionario = funcionarios.find((f) => f.id === item.funcionario_id);
  const naoMarcada = item.status === "pendente";
  const dias = item.periodo_aquisitivo_fim ? diffInDays(hoje, item.periodo_aquisitivo_fim) : null;
  const vencendo = naoMarcada && dias !== null && dias <= VENCENDO_JANELA_DIAS;
  const atrasada = vencendo && dias !== null && dias < 0;

  const rowClass = atrasada
    ? "border-rose-800/60 bg-rose-950/20"
    : vencendo
      ? "border-amber-800/60 bg-amber-950/20"
      : "border-zinc-800/80";

  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${rowClass}`}>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
          {funcionario?.nome ?? "Funcionário"}
          <StatusChip tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</StatusChip>
          {vencendo && (
            <StatusChip tone={atrasada ? "rose" : "amber"}>
              {atrasada ? "período vencido" : "período vencendo"}
            </StatusChip>
          )}
        </p>
        <p className="truncate text-xs text-zinc-500">
          {item.dias_gozados}/{item.dias_direito} dias gozados
          {item.periodo_aquisitivo_fim &&
            ` · período aquisitivo até ${formatDate(item.periodo_aquisitivo_fim)}`}
          {item.data_inicio_gozo &&
            item.data_fim_gozo &&
            ` · gozo de ${formatDate(item.data_inicio_gozo)} a ${formatDate(item.data_fim_gozo)}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {podeEditar && (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <form action={deleteFerias.bind(null, item.id)}>
              <button
                type="submit"
                className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export function FeriasBoard({
  ferias,
  funcionarios,
}: {
  ferias: Feria[];
  funcionarios: Funcionario[];
}) {
  const hoje = todayISO();

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Férias</h1>
          <p className="text-sm text-zinc-500">{ferias.length} registro(s)</p>
        </div>
        <NewForm funcionarios={funcionarios} />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Palmtree className="h-4 w-4 text-zinc-500" />
          Todos os registros
        </div>

        {ferias.length > 0 ? (
          <div className="space-y-2">
            {ferias.map((item) => (
              <Row key={item.id} item={item} funcionarios={funcionarios} hoje={hoje} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Nenhum registro de férias cadastrado.</p>
        )}
      </div>
    </div>
  );
}
