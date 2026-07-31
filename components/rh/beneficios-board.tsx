"use client";

import { useEffect, useRef, useState, useActionState } from "react";
import { Gift, Plus, Pencil, Trash2 } from "lucide-react";
import type { Beneficio, BeneficioTipo, Funcionario } from "@/lib/types";
import {
  createBeneficio,
  updateBeneficio,
  deleteBeneficio,
} from "@/app/(dashboard)/rh/beneficios/actions";
import { formatCurrency } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip } from "@/components/status-chip";

const TIPO_LABEL: Record<BeneficioTipo, string> = {
  vale_refeicao: "Vale-refeição",
  vale_transporte: "Vale-transporte",
  plano_saude: "Plano de saúde",
  plano_odontologico: "Plano odontológico",
  seguro_vida: "Seguro de vida",
  outro: "Outro",
};

function Fields({ item, funcionarios }: { item?: Beneficio; funcionarios: Funcionario[] }) {
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
        <label className="text-xs font-medium text-zinc-400">Tipo</label>
        <select
          name="tipo"
          defaultValue={item?.tipo ?? "vale_refeicao"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          {Object.entries(TIPO_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Valor</label>
        <input
          name="valor"
          type="number"
          step="0.01"
          min="0"
          defaultValue={item?.valor ?? ""}
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
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createBeneficio, undefined);

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
        Novo benefício
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

function Row({ item, funcionarios }: { item: Beneficio; funcionarios: Funcionario[] }) {
  const [editing, setEditing] = useState(false);
  const action = updateBeneficio.bind(null, item.id);
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

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
          {funcionario?.nome ?? "Funcionário"}
          <StatusChip tone="copper">{TIPO_LABEL[item.tipo]}</StatusChip>
        </p>
        <p className="truncate text-xs text-zinc-500">
          {item.valor != null ? formatCurrency(item.valor) : "sem valor definido"}
          {item.observacoes && ` · ${item.observacoes}`}
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
        <form action={deleteBeneficio.bind(null, item.id)}>
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

export function BeneficiosBoard({
  beneficios,
  funcionarios,
}: {
  beneficios: Beneficio[];
  funcionarios: Funcionario[];
}) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Benefícios</h1>
          <p className="text-sm text-zinc-500">{beneficios.length} benefício(s)</p>
        </div>
        <NewForm funcionarios={funcionarios} />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Gift className="h-4 w-4 text-zinc-500" />
          Todos os benefícios
        </div>

        {beneficios.length > 0 ? (
          <div className="space-y-2">
            {beneficios.map((item) => (
              <Row key={item.id} item={item} funcionarios={funcionarios} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Nenhum benefício cadastrado.</p>
        )}
      </div>
    </div>
  );
}
