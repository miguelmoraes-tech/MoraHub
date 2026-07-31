"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import type {
  ChecklistItem,
  ComplianceStatus,
  PessoalComplianceCategoria,
  PessoalCompliance,
} from "@/lib/types";
import {
  createPessoalCompliance,
  updatePessoalCompliance,
  deletePessoalCompliance,
} from "@/app/(dashboard)/pessoal/juridico/actions";
import { formatDate } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip, type ChipTone } from "@/components/status-chip";
import { ChecklistEditor } from "@/components/colaborador/checklist-editor";

const CATEGORIA_OPTIONS: PessoalComplianceCategoria[] = ["LGPD", "Outro"];

const STATUS_OPTIONS: ComplianceStatus[] = [
  "pendente",
  "em_andamento",
  "conforme",
];

const STATUS_LABEL: Record<ComplianceStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  conforme: "Conforme",
};

const STATUS_TONE: Record<ComplianceStatus, ChipTone> = {
  pendente: "zinc",
  em_andamento: "amber",
  conforme: "emerald",
};

function NewForm() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createPessoalCompliance,
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
        className="flex items-center gap-1.5 rounded-lg bg-petrol-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-petrol-500"
      >
        <Plus className="h-4 w-4" />
        Novo registro
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Categoria *</label>
        <select
          name="categoria"
          required
          defaultValue="LGPD"
          className="w-full max-w-48 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        >
          {CATEGORIA_OPTIONS.map((categoria) => (
            <option key={categoria} value={categoria}>
              {categoria}
            </option>
          ))}
        </select>
      </div>
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
          className="rounded-md bg-petrol-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-petrol-500 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}

function Card({ item }: { item: PessoalCompliance }) {
  const [editing, setEditing] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(item.checklist);
  const action = updatePessoalCompliance.bind(null, item.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <input type="hidden" name="checklist" value={JSON.stringify(checklist)} />
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400">Status</label>
          <select
            name="status"
            defaultValue={item.status}
            className="w-full max-w-48 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
          >
            {STATUS_OPTIONS.map((status) => (
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
            defaultValue={item.proxima_revisao ?? ""}
            className="w-full max-w-48 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400">Observações</label>
          <textarea
            name="observacoes"
            rows={2}
            defaultValue={item.observacoes ?? ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
          />
        </div>

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
            className="rounded-md bg-petrol-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-petrol-500 disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    );
  }

  const feitos = item.checklist.filter((c) => c.feito).length;

  return (
    <div className="rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
          {item.categoria}
          <StatusChip tone={STATUS_TONE[item.status]}>
            {STATUS_LABEL[item.status]}
          </StatusChip>
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <form action={deletePessoalCompliance.bind(null, item.id)}>
            <button
              type="submit"
              className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        {item.checklist.length > 0 && `${feitos}/${item.checklist.length} concluído`}
        {item.proxima_revisao && ` · próxima revisão ${formatDate(item.proxima_revisao)}`}
        {item.observacoes && ` · ${item.observacoes}`}
      </p>
    </div>
  );
}

export function PessoalComplianceSection({
  registros,
}: {
  registros: PessoalCompliance[];
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <ShieldCheck className="h-4 w-4 text-zinc-500" />
          Compliance
        </h2>
        <NewForm />
      </div>

      {registros.length > 0 ? (
        <div className="space-y-2">
          {registros.map((item) => (
            <Card key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">Nenhum registro cadastrado.</p>
      )}
    </div>
  );
}
