"use client";

import { useEffect, useRef, useState, useActionState } from "react";
import Link from "next/link";
import { Briefcase, Plus, Pencil, Trash2, ArrowRight } from "lucide-react";
import type { Candidato, Departamento, Vaga, VagaStatus, FuncionarioTipoContrato } from "@/lib/types";
import { createVaga, updateVaga, deleteVaga } from "@/app/(dashboard)/rh/recrutamento/actions";
import { formatCurrency } from "@/lib/format";
import { usePodeEditarRh, useVerSalarios } from "@/components/rh/salarios-context";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip, type ChipTone } from "@/components/status-chip";

const STATUS_LABEL: Record<VagaStatus, string> = {
  aberta: "Aberta",
  pausada: "Pausada",
  fechada: "Fechada",
};

const STATUS_TONE: Record<VagaStatus, ChipTone> = {
  aberta: "emerald",
  pausada: "amber",
  fechada: "zinc",
};

const TIPO_CONTRATO_LABEL: Record<FuncionarioTipoContrato, string> = {
  clt: "CLT",
  pj: "PJ",
  estagio: "Estágio",
  freelancer: "Freelancer",
  outro: "Outro",
};

function Fields({ item, departamentos }: { item?: Vaga; departamentos: Departamento[] }) {
  const verSalarios = useVerSalarios();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Título *</label>
        <input
          name="titulo"
          required
          defaultValue={item?.titulo}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Departamento</label>
        <select
          name="departamento_id"
          defaultValue={item?.departamento_id ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="">Nenhum</option>
          {departamentos.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Status</label>
        <select
          name="status"
          defaultValue={item?.status ?? "aberta"}
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
        <label className="text-xs font-medium text-zinc-400">Tipo de contrato</label>
        <select
          name="tipo_contrato"
          defaultValue={item?.tipo_contrato ?? "clt"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          {Object.entries(TIPO_CONTRATO_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {verSalarios && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400">Salário previsto</label>
          <input
            name="salario_previsto"
            type="number"
            step="0.01"
            min="0"
            defaultValue={item?.salario_previsto ?? ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>
      )}
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">Descrição</label>
        <textarea
          name="descricao"
          rows={2}
          defaultValue={item?.descricao ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">Requisitos</label>
        <textarea
          name="requisitos"
          rows={2}
          defaultValue={item?.requisitos ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
    </div>
  );
}

function NewForm({ departamentos }: { departamentos: Departamento[] }) {
  const [open, setOpen] = useState(false);
  const podeEditar = usePodeEditarRh();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createVaga, undefined);

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
        Nova vaga
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <Fields departamentos={departamentos} />
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
  departamentos,
  candidatosCount,
}: {
  item: Vaga;
  departamentos: Departamento[];
  candidatosCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const podeEditar = usePodeEditarRh();
  const action = updateVaga.bind(null, item.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <Fields item={item} departamentos={departamentos} />
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

  const departamento = departamentos.find((d) => d.id === item.departamento_id);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
          {item.titulo}
          <StatusChip tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</StatusChip>
        </p>
        <p className="truncate text-xs text-zinc-500">
          {candidatosCount} candidato(s)
          {departamento && ` · ${departamento.nome}`}
          {item.salario_previsto != null && ` · ${formatCurrency(item.salario_previsto)}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={`/rh/recrutamento/${item.id}`}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-copper-400 hover:bg-zinc-800"
        >
          Candidatos
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        {podeEditar && (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <form action={deleteVaga.bind(null, item.id)}>
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

export function VagasBoard({
  vagas,
  departamentos,
  candidatos,
}: {
  vagas: Vaga[];
  departamentos: Departamento[];
  candidatos: Candidato[];
}) {
  const candidatosPorVaga = new Map<string, number>();
  for (const c of candidatos) {
    candidatosPorVaga.set(c.vaga_id, (candidatosPorVaga.get(c.vaga_id) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Recrutamento</h1>
          <p className="text-sm text-zinc-500">{vagas.length} vaga(s)</p>
        </div>
        <NewForm departamentos={departamentos} />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Briefcase className="h-4 w-4 text-zinc-500" />
          Todas as vagas
        </div>

        {vagas.length > 0 ? (
          <div className="space-y-2">
            {vagas.map((item) => (
              <Row
                key={item.id}
                item={item}
                departamentos={departamentos}
                candidatosCount={candidatosPorVaga.get(item.id) ?? 0}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Nenhuma vaga cadastrada.</p>
        )}
      </div>
    </div>
  );
}
