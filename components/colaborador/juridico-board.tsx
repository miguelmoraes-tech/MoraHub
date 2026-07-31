"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Scale, Plus, Pencil, Trash2 } from "lucide-react";
import type { ContaVinculada, Juridico, JuridicoTipo } from "@/lib/types";
import { nomeConta } from "@/lib/colaborador-shared";
import {
  createJuridicoColaborador,
  updateJuridicoColaborador,
  deleteJuridicoColaborador,
} from "@/lib/actions/colaborador-juridico";
import { formatDate } from "@/lib/format";
import { todayISO, diffInDays } from "@/lib/vencimentos/dates";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip, type ChipTone } from "@/components/status-chip";

export type PendenciaComDono = Juridico & { donoNome: string };

const STATUS_LABEL: Record<Juridico["status"], string> = {
  pendente: "Pendente",
  concluida: "Concluída",
};

const STATUS_TONE: Record<Juridico["status"], ChipTone> = {
  pendente: "amber",
  concluida: "emerald",
};

const TIPO_TONE: Record<JuridicoTipo, ChipTone> = {
  Jurídico: "sky",
  Contábil: "copper",
  Fiscal: "zinc",
};

function Fields({
  item,
  contas,
  tipoFixo,
  showDonoSelect,
}: {
  item?: PendenciaComDono;
  contas: ContaVinculada[];
  tipoFixo: JuridicoTipo | null;
  showDonoSelect: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {showDonoSelect && (
        <div className="col-span-2 space-y-1 sm:col-span-3">
          <label className="text-xs font-medium text-zinc-400">Cliente *</label>
          <select
            name="donoId"
            required
            defaultValue=""
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          >
            <option value="" disabled>
              Selecione o cliente
            </option>
            {contas.map((conta) => (
              <option key={conta.dono_id} value={conta.dono_id}>
                {nomeConta(conta)}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="col-span-2 space-y-1 sm:col-span-1">
        <label className="text-xs font-medium text-zinc-400">Título *</label>
        <input
          name="titulo"
          required
          defaultValue={item?.titulo}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      {!tipoFixo && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400">Tipo</label>
          <select
            name="tipo"
            defaultValue={item?.tipo ?? "Contábil"}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          >
            <option value="Contábil">Contábil</option>
            <option value="Fiscal">Fiscal</option>
          </select>
        </div>
      )}
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Prazo</label>
        <input
          name="prazo"
          type="date"
          defaultValue={item?.prazo ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Status</label>
        <select
          name="status"
          defaultValue={item?.status ?? "pendente"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="pendente">Pendente</option>
          <option value="concluida">Concluída</option>
        </select>
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-3">
        <label className="text-xs font-medium text-zinc-400">Nota</label>
        <textarea
          name="nota"
          rows={2}
          defaultValue={item?.nota ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
    </div>
  );
}

function NewForm({
  contas,
  tipoFixo,
}: {
  contas: ContaVinculada[];
  tipoFixo: JuridicoTipo | null;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const action = createJuridicoColaborador.bind(null, tipoFixo);
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
        className="flex items-center gap-1.5 rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500"
      >
        <Plus className="h-4 w-4" />
        Nova pendência
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <Fields contas={contas} tipoFixo={tipoFixo} showDonoSelect />
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
  hoje,
  tipoFixo,
}: {
  item: PendenciaComDono;
  hoje: string;
  tipoFixo: JuridicoTipo | null;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateJuridicoColaborador.bind(null, item.id, tipoFixo);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <Fields item={item} contas={[]} tipoFixo={tipoFixo} showDonoSelect={false} />
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

  const dias = item.prazo ? diffInDays(hoje, item.prazo) : null;
  const pendente = item.status === "pendente";
  const atrasado = pendente && dias !== null && dias < 0;
  const proximo = pendente && dias !== null && dias >= 0 && dias <= 7;

  const rowClass = atrasado
    ? "border-rose-800/60 bg-rose-950/20"
    : proximo
      ? "border-amber-800/60 bg-amber-950/20"
      : "border-zinc-800/80";

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${rowClass}`}
    >
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
          {item.titulo}
          <StatusChip tone={STATUS_TONE[item.status]}>
            {STATUS_LABEL[item.status]}
          </StatusChip>
          {!tipoFixo && (
            <StatusChip tone={TIPO_TONE[item.tipo]}>{item.tipo}</StatusChip>
          )}
        </p>
        <p className="text-xs text-zinc-500">
          {item.donoNome}
          {item.prazo &&
            ` · prazo ${formatDate(item.prazo)}${atrasado ? " (atrasado)" : proximo ? " (em breve)" : ""}`}
          {item.nota && ` · ${item.nota}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <form action={deleteJuridicoColaborador.bind(null, item.id)}>
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

export function ColaboradorJuridicoBoard({
  titulo,
  items,
  contas,
  tipoFixo,
}: {
  titulo: string;
  items: PendenciaComDono[];
  contas: ContaVinculada[];
  tipoFixo: JuridicoTipo | null;
}) {
  const hoje = todayISO();
  const ordenados = [...items].sort((a, b) => {
    if (!a.prazo && !b.prazo) return 0;
    if (!a.prazo) return 1;
    if (!b.prazo) return -1;
    return a.prazo.localeCompare(b.prazo);
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">{titulo}</h1>
          <p className="text-sm text-zinc-500">
            {ordenados.length} pendência(s) · {contas.length} cliente(s) vinculado(s)
          </p>
        </div>
        <NewForm contas={contas} tipoFixo={tipoFixo} />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Scale className="h-4 w-4 text-zinc-500" />
          Pendências
        </div>

        {ordenados.length > 0 ? (
          <div className="space-y-2">
            {ordenados.map((item) => (
              <Row key={item.id} item={item} hoje={hoje} tipoFixo={tipoFixo} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Nenhuma pendência cadastrada.</p>
        )}
      </div>
    </div>
  );
}
